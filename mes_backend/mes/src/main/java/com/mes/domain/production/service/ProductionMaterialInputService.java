package com.mes.domain.production.service;

import com.mes.domain.bom.repository.BomLineRepository;
import com.mes.domain.item.entity.Item;
import com.mes.domain.item.repository.ItemRepository;
import com.mes.domain.material.entity.MaterialInbound;
import com.mes.domain.material.entity.PlcRawLog;
import com.mes.domain.material.repository.MaterialInboundRepository;
import com.mes.domain.material.repository.PlcRawLogRepository;
import com.mes.domain.production.dto.MaterialInputDto;
import com.mes.domain.production.entity.MaterialInputRecord;
import com.mes.domain.production.entity.WorkOrder;
import com.mes.domain.production.repository.MaterialInputRecordRepository;
import com.mes.domain.production.repository.ProductionWorkOrderRepository;
import com.mes.domain.stock.entity.MaterialStock;
import com.mes.domain.stock.entity.MaterialStockHistory;
import com.mes.domain.stock.repository.MaterialStockHistoryRepository;
import com.mes.domain.stock.repository.MaterialStockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductionMaterialInputService {

  private final MaterialInputRecordRepository inputRecordRepo;
  private final MaterialStockRepository materialStockRepo;
  private final MaterialStockHistoryRepository stockHistoryRepo;
  private final MaterialInboundRepository inboundRepo;
  private final ProductionWorkOrderRepository workOrderRepo;
  private final BomLineRepository bomLineRepo;
  private final PlcRawLogRepository plcRawLogRepo;
  private final ItemRepository itemRepo;

  // ── 1. 수동 투입(RESERVED) 등록/조회/확정 ──────────────────────

  /**
   * 원료투입 기록 저장 (예약, RESERVED). FE 미연결이지만 BE 로직은 유지한다.
   * 기존 RESERVED 예약은 먼저 풀어 두고(재고 예약 해제 + 행 삭제) 새 항목으로 다시 적재한다.
   */
  @Transactional
  public void saveInputRecords(MaterialInputDto.SaveReq req) {
    releaseExistingReservations(req.getWorkOrderSq());

    for (MaterialInputDto.InputItem item : req.getItems()) {
      double reserveQty = item.getInputQty() != null ? item.getInputQty() : 0.0;
      if (reserveQty <= 0.0) {
        continue;
      }

      MaterialStock stock = findOrCreateStock(item.getMaterialItemSq(), item.getPurchaseLotNo());
      stock.addReserved(reserveQty);
      materialStockRepo.save(stock);

      MaterialInputRecord reservation = MaterialInputRecord.builder()
          // 작업지시 컨텍스트
          .workOrderSq(req.getWorkOrderSq())
          .productionLotNo(req.getProductionLotNo())
          .lineName(req.getLineName())
          .productItemCode(req.getProductItemCode())
          .productItemName(req.getProductItemName())
          // 자재 / 재고
          .materialItemSq(item.getMaterialItemSq())
          .materialItemCode(item.getMaterialItemCode())
          .materialItemName(item.getMaterialItemName())
          .materialStockSq(stock.getStockSq())
          .purchaseLotNo(item.getPurchaseLotNo())
          .stockLotNo(item.getStockLotNo())
          // 수량 / 상태
          .calculatedQty(item.getCalculatedQty())
          .inputQty(reserveQty)
          .inputStatus("RESERVED")
          .build();
      inputRecordRepo.save(reservation);
    }
  }

  // 같은 작업지시의 기존 RESERVED 예약을 모두 되돌린다 (재고 예약 해제 후 행 제거).
  private void releaseExistingReservations(Long workOrderSq) {
    List<MaterialInputRecord> reserved =
        inputRecordRepo.findByWorkOrderSqAndInputStatus(workOrderSq, "RESERVED");
    for (MaterialInputRecord rec : reserved) {
      MaterialStock stock = materialStockRepo
          .findByItemSqAndLotNoForUpdate(rec.getMaterialItemSq(), rec.getPurchaseLotNo())
          .orElse(null);
      if (stock != null) {
        stock.releaseReserved(rec.getInputQty() != null ? rec.getInputQty() : 0.0);
        materialStockRepo.save(stock);
      }
      inputRecordRepo.delete(rec);
    }
  }

  /**
   * 원료투입 기록 조회.
   */
  public List<MaterialInputDto.Res> getInputRecords(Long workOrderSq) {
    return inputRecordRepo.findByWorkOrderSq(workOrderSq)
        .stream().map(this::mapToRes).collect(Collectors.toList());
  }

  /**
   * 작업완료 시 RESERVED 예약을 실제 차감으로 확정한다 (FE 미연결, BE 보존).
   */
  @Transactional
  public void confirmInputRecords(Long workOrderSq) {
    List<MaterialInputRecord> reserved =
        inputRecordRepo.findByWorkOrderSqAndInputStatus(workOrderSq, "RESERVED");
    if (reserved.isEmpty()) {
      return;
    }

    String fallbackProdLot = workOrderRepo.findById(workOrderSq)
        .map(WorkOrder::getProductionLotNo)
        .orElse(null);

    for (MaterialInputRecord record : reserved) {
      String recordLot = record.getProductionLotNo();
      String prodLot = (recordLot == null || recordLot.isEmpty()) ? fallbackProdLot : recordLot;

      consumeReservedStock(record, workOrderSq);
      writeConsumeAdjustment(record, prodLot, workOrderSq);

      record.confirm();
      inputRecordRepo.save(record);
    }
  }

  // 예약된 재고를 실제 소비로 확정하고 USE 이력 한 줄을 남긴다.
  private void consumeReservedStock(MaterialInputRecord record, Long workOrderSq) {
    MaterialStock stock = materialStockRepo.findByStockSqForUpdate(record.getMaterialStockSq()).orElse(null);
    if (stock == null) {
      return;
    }
    double consumeQty = record.getInputQty() != null ? record.getInputQty() : 0.0;
    double qtyBefore = stock.getCurrentQty() != null ? stock.getCurrentQty() : 0.0;
    stock.consumeStock(consumeQty);
    materialStockRepo.save(stock);

    stockHistoryRepo.save(MaterialStockHistory.builder()
        .stockSq(stock.getStockSq())
        .warehouseLoc(stock.getWarehouseLoc())
        .changeType("USE")
        .prevQty(qtyBefore)
        .changeQty(-consumeQty)
        .currQty(stock.getCurrentQty())
        .workerId("SYSTEM")
        .regDt(LocalDateTime.now())
        .reason("작업완료 원료투입 확정 (작업지시: " + workOrderSq + ")")
        .build());
  }

  // 입고 테이블에 음수(차감) ADJUST 행을 보태 입고-소비 흐름을 추적 가능하게 한다.
  private void writeConsumeAdjustment(MaterialInputRecord record, String prodLot, Long workOrderSq) {
    String lookupLot = record.getPurchaseLotNo() != null ? record.getPurchaseLotNo() : record.getStockLotNo();
    Long orderDtlSq = findOrderDtlSq(lookupLot, record.getMaterialItemSq());

    double negQty = record.getInputQty() != null ? -record.getInputQty() : 0.0;
    String inboundLot = record.getStockLotNo() != null ? record.getStockLotNo() : "USE-" + workOrderSq;

    inboundRepo.save(MaterialInbound.builder()
        .itemSq(record.getMaterialItemSq())
        .orderDtlSq(orderDtlSq)
        .inboundType("ADJUST")
        .inboundDate(LocalDate.now())
        .inboundQty(negQty)
        .lotNo(inboundLot)
        .purchaseLotNo(record.getPurchaseLotNo())
        .productionLotNo(prodLot)
        .useYn(true)
        .inspectStatus("PASS")
        .remark("원료투입 차감")
        .build());
  }

  // ── 2. PLC 자동 차감 ─────────────────────────────────────────

  /**
   * 작업완료 시 PLC raw 를 호기별 g 로 합산 → 자재별 kg 로 환산 → FIFO 차감.
   * 재고가 모자라면 음수로 떨어뜨리지 않고 차감을 멈추며(floor), PLC_AUTO 기록이 이미 있으면 멱등하게 건너뛴다.
   */
  @Transactional
  public void confirmPlcAutoConsume(Long workOrderSq) {
    if (workOrderSq == null) {
      return;
    }
    // 멱등성: PLC_AUTO 기록이 이미 있으면 재실행하지 않는다.
    if (!inputRecordRepo.findByWorkOrderSqAndInputStatus(workOrderSq, "PLC_AUTO").isEmpty()) {
      return;
    }

    WorkOrder workOrder = workOrderRepo.findById(workOrderSq).orElse(null);
    boolean usable = workOrder != null
        && workOrder.getItemSq() != null
        && workOrder.getLineName() != null
        && workOrder.getWorkStartTime() != null;
    if (!usable) {
      return;
    }

    Map<String, Long> feederToMaterial = buildFeederMapping(workOrder.getItemSq());
    if (feederToMaterial.isEmpty()) {
      return;
    }

    LocalDateTime windowStart = workOrder.getWorkStartTime();
    LocalDateTime windowEnd = workOrder.getWorkEndTime() != null
        ? workOrder.getWorkEndTime()
        : LocalDateTime.now();
    Map<Long, Double> usageGByMaterial =
        sumPlcUsage(workOrder, feederToMaterial, windowStart, windowEnd);

    String productionLotNo = workOrder.getProductionLotNo();
    for (Long materialItemSq : feederToMaterial.values()) {
      double usedG = usageGByMaterial.getOrDefault(materialItemSq, 0.0);
      double usedKg = roundTo3(usedG / 1000.0);
      consumeOneMaterialFifo(workOrder, materialItemSq, usedG, usedKg, productionLotNo, workOrderSq);
    }
  }

  // BOM(배합형)에서 호기(F+숫자) ↔ 구성품 매핑을 만든다.
  private Map<String, Long> buildFeederMapping(Long productItemSq) {
    List<BomLineRepository.PlcMapping> bomLines =
        bomLineRepo.findPlcMappingByProductItemSqs(Set.of(productItemSq));
    Map<String, Long> mapping = new HashMap<>();
    for (BomLineRepository.PlcMapping line : bomLines) {
      if (line.getPlcMachineNo() == null || line.getComponentItemSq() == null) {
        continue;
      }
      String digits = line.getPlcMachineNo().replaceAll("\\D", "");
      if (!digits.isEmpty()) {
        mapping.put("F" + digits, line.getComponentItemSq());
      }
    }
    return mapping;
  }

  // PLC raw 윈도우를 라인+호기로 매칭해 자재별 g 합계를 낸다.
  private Map<Long, Double> sumPlcUsage(WorkOrder workOrder, Map<String, Long> feederToMaterial,
                                        LocalDateTime from, LocalDateTime to) {
    Map<Long, Double> usage = new HashMap<>();
    List<PlcRawLog> logs = plcRawLogRepo.findByCollectedDtBetweenOrderByCollectedDtAsc(from, to);
    for (PlcRawLog p : logs) {
      if (p.getLineCode() == null || p.getFeederNo() == null || p.getValue() == null) {
        continue;
      }
      if (!Objects.equals(p.getLineCode(), workOrder.getLineName())) {
        continue;
      }
      Long materialItemSq = feederToMaterial.get(p.getFeederNo());
      if (materialItemSq != null) {
        usage.merge(materialItemSq, p.getValue(), Double::sum);
      }
    }
    return usage;
  }

  // 자재 하나를 FIFO(lastInDate ASC, 동일자는 stockSq ASC)로 차감하고 audit 1행을 남긴다.
  private void consumeOneMaterialFifo(WorkOrder workOrder, Long materialItemSq,
                                      double usedG, double usedKg,
                                      String productionLotNo, Long workOrderSq) {
    Item materialItem = itemRepo.findById(materialItemSq).orElse(null);
    String materialItemCode = materialItem != null ? materialItem.getItemCode() : null;
    String materialItemName = materialItem != null ? materialItem.getItemName() : null;

    double remaining = usedKg;
    Long lastStockSq = null;
    String lastPurchaseLotNo = null;

    if (remaining > 0.0) {
      for (MaterialStock stock : fifoOrderedStocks(materialItemSq)) {
        if (remaining <= 0.0) {
          break;
        }
        double avail = stock.getCurrentQty() != null ? stock.getCurrentQty() : 0.0;
        if (avail <= 0.0) {
          continue;
        }
        double take = Math.min(avail, remaining);
        stock.consumeStock(take);
        materialStockRepo.save(stock);
        remaining = roundTo3(remaining - take);
        lastStockSq = stock.getStockSq();
        lastPurchaseLotNo = stock.getLotNo();

        stockHistoryRepo.save(MaterialStockHistory.builder()
            .stockSq(stock.getStockSq())
            .warehouseLoc(stock.getWarehouseLoc())
            .changeType("USE")
            .prevQty(avail)
            .changeQty(-take)
            .currQty(stock.getCurrentQty())
            .workerId("PLC")
            .regDt(LocalDateTime.now())
            .reason("PLC 자동 차감 (작업지시: " + workOrderSq + ")")
            .build());

        Long orderDtlSq = findOrderDtlSq(stock.getLotNo(), materialItemSq);
        String fifoLot = stock.getLotNo() != null ? stock.getLotNo() : "PLC-" + workOrderSq;
        inboundRepo.save(MaterialInbound.builder()
            .itemSq(materialItemSq)
            .orderDtlSq(orderDtlSq)
            .inboundType("ADJUST")
            .inboundDate(LocalDate.now())
            .inboundQty(-take)
            .lotNo(fifoLot)
            .purchaseLotNo(stock.getLotNo())
            .productionLotNo(productionLotNo)
            .useYn(true)
            .inspectStatus("PASS")
            .remark("PLC 자동 차감")
            .build());
      }
    }
    // remaining > 0 = 재고 부족분. 음수 floor 정책으로 차감하지 않고 그대로 둔다 (더미 PLC 기간 안전장치).

    // PLC 산출 결과 + raw g 를 담은 audit 1행.
    MaterialInputRecord audit = MaterialInputRecord.builder()
        .workOrderSq(workOrderSq)
        .productionLotNo(productionLotNo)
        .lineName(workOrder.getLineName())
        .materialItemSq(materialItemSq)
        .materialItemCode(materialItemCode)
        .materialItemName(materialItemName)
        .materialStockSq(lastStockSq != null ? lastStockSq : 0L)
        .purchaseLotNo(lastPurchaseLotNo)
        .inputQty(usedKg)
        .plcRawG(usedG)
        .inputStatus("PLC_AUTO")
        .build();
    inputRecordRepo.save(audit);
  }

  // 해당 자재의 잔량>0 재고를 FIFO 순(입고일 ASC, 동일자 stockSq ASC)으로 정렬.
  private List<MaterialStock> fifoOrderedStocks(Long materialItemSq) {
    // 잔량>0 재고행을 행 잠금으로 읽어(동시 차감 방지) FIFO(입고일 ASC, 동일자 stockSq ASC)로 정렬한다.
    return materialStockRepo.findByItemSqWithStockForUpdate(materialItemSq).stream()
        .sorted(Comparator
            .comparing(MaterialStock::getLastInDate, Comparator.nullsLast(Comparator.naturalOrder()))
            .thenComparing(MaterialStock::getStockSq, Comparator.nullsLast(Comparator.naturalOrder())))
        .collect(Collectors.toList());
  }

  // ── 보조 ───────────────────────────────────────────────────────

  // 구매 LotNo 로 동일 품목의 원본 입고를 찾아 orderDtlSq 를 끌어온다. 못 찾으면 0L.
  private Long findOrderDtlSq(String lotNo, Long materialItemSq) {
    return inboundRepo.findByAnyLotNo(lotNo).stream()
        .filter(ib -> ib.getItemSq() != null && ib.getItemSq().equals(materialItemSq))
        .map(MaterialInbound::getOrderDtlSq)
        .findFirst()
        .orElse(0L);
  }

  // 셋째 자리 반올림.
  private double roundTo3(double value) {
    return Math.round(value * 1000.0) / 1000.0;
  }

  private MaterialStock findOrCreateStock(Long itemSq, String purchaseLotNo) {
    return materialStockRepo.findByItemSqAndLotNo(itemSq, purchaseLotNo)
        .orElseGet(() -> createStockFromInbound(itemSq, purchaseLotNo));
  }

  // 재고 행이 아직 없으면 동일 Lot 입고 합계를 초기 현재고로 잡아 새로 만든다.
  private MaterialStock createStockFromInbound(Long itemSq, String purchaseLotNo) {
    double initialQty = inboundRepo.findByAnyLotNo(purchaseLotNo).stream()
        .filter(ib -> ib.getItemSq() != null && ib.getItemSq().equals(itemSq))
        .mapToDouble(ib -> ib.getInboundQty() != null ? ib.getInboundQty() : 0.0)
        .sum();
    MaterialStock created = MaterialStock.builder()
        .itemSq(itemSq)
        .lotNo(purchaseLotNo)
        .warehouseLoc("")
        .currentQty(initialQty)
        .lastInDate(LocalDate.now())
        .build();
    return materialStockRepo.save(created);
  }

  private MaterialInputDto.Res mapToRes(MaterialInputRecord src) {
    MaterialInputDto.Res dto = new MaterialInputDto.Res();
    // 식별자 / 작업지시 컨텍스트
    dto.setInputSq(src.getInputSq());
    dto.setWorkOrderSq(src.getWorkOrderSq());
    dto.setProductionLotNo(src.getProductionLotNo());
    dto.setLineName(src.getLineName());
    // 제품 정보
    dto.setProductItemCode(src.getProductItemCode());
    dto.setProductItemName(src.getProductItemName());
    // 자재 / 재고 정보
    dto.setMaterialItemSq(src.getMaterialItemSq());
    dto.setMaterialItemCode(src.getMaterialItemCode());
    dto.setMaterialItemName(src.getMaterialItemName());
    dto.setMaterialStockSq(src.getMaterialStockSq());
    dto.setStockLotNo(src.getStockLotNo());
    dto.setPurchaseLotNo(src.getPurchaseLotNo());
    // 수량 / 상태 / 시각
    dto.setInputStatus(src.getInputStatus());
    dto.setCalculatedQty(src.getCalculatedQty());
    dto.setInputQty(src.getInputQty());
    dto.setPlcRawG(src.getPlcRawG());
    dto.setRegDt(src.getRegDt());
    return dto;
  }
}
