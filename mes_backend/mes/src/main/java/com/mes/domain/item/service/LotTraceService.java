package com.mes.domain.item.service;

import com.mes.domain.customer.entity.Customer;
import com.mes.domain.customer.repository.CustomerRepository;
import com.mes.domain.item.dto.LotTraceDto;
import com.mes.domain.item.dto.LotTraceSearchDto;
import com.mes.domain.item.dto.MfgLotDetailDto;
import com.mes.domain.item.dto.PurchaseLotDetailDto;
import com.mes.domain.sales.entity.SalesOrder;
import com.mes.domain.sales.entity.SalesOrderDetail;
import com.mes.domain.sales.repository.SalesOrderDetailRepository;
import com.mes.domain.shipment.entity.ShipmentOrderDetail;
import com.mes.domain.shipment.repository.ShipmentOrderDetailRepository;
import com.mes.domain.item.entity.Item;
import com.mes.domain.item.repository.ItemRepository;
import com.mes.domain.material.entity.MaterialInbound;
import com.mes.domain.material.repository.MaterialInboundRepository;
import com.mes.domain.production.entity.MaterialInputRecord;
import com.mes.domain.production.entity.WorkOrder;
import com.mes.domain.production.entity.WorkResult;
import com.mes.domain.production.entity.WorkResultDetail;
import com.mes.domain.production.repository.MaterialInputRecordRepository;
import com.mes.domain.production.repository.ProductionWorkOrderRepository;
import com.mes.domain.production.repository.ProductionWorkResultDetailRepository;
import com.mes.domain.production.repository.ProductionWorkResultRepository;
import com.mes.domain.purchase.entity.PurchaseOrder;
import com.mes.domain.purchase.entity.PurchaseOrderDetail;
import com.mes.domain.purchase.repository.PurchaseOrderDetailRepository;
import com.mes.domain.inspect.entity.ProcessInspectResult;
import com.mes.domain.inspect.repository.ProcessInspectResultRepository;
import com.mes.domain.quality.entity.ShipmentInspect;
import com.mes.domain.quality.repository.ShipmentInspectRepository;
import com.mes.domain.shipment.entity.ShipmentPlan;
import com.mes.domain.shipment.entity.ShipmentResult;
import com.mes.domain.shipment.repository.ShipmentPlanRepository;
import com.mes.domain.shipment.repository.ShipmentResultRepository;
import com.mes.domain.stock.entity.ProductStock;
import com.mes.domain.stock.repository.ProductStockRepository;
import com.mes.global.support.EntityIndex;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;
import java.util.stream.Collectors;

@lombok.extern.slf4j.Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LotTraceService {

  private final ItemRepository itemRepository;
  private final MaterialInboundRepository inboundRepository;
  private final ProductStockRepository productStockRepository;
  private final ShipmentInspectRepository shipInspectRepository;
  private final ShipmentPlanRepository planRepository;
  private final ShipmentResultRepository resultRepository;
  private final ProductionWorkResultRepository workResultRepository;
  private final ProductionWorkResultDetailRepository workResultDetailRepository;
  private final ProductionWorkOrderRepository workOrderRepository;
  private final MaterialInputRecordRepository materialInputRecordRepository;
  private final PurchaseOrderDetailRepository purchaseOrderDetailRepository;
  private final CustomerRepository customerRepository;
  private final SalesOrderDetailRepository salesOrderDetailRepository;
  private final ShipmentOrderDetailRepository shipmentOrderDetailRepository;
  private final ProcessInspectResultRepository processInspectResultRepository;

  public LotTraceDto.Res trace(String lotNo) {
    LotTraceDto.Res res = new LotTraceDto.Res();
    res.setLotNo(lotNo);
    res.setHistories(new ArrayList<>());

    boolean found = false;

    // 1) 자재 입고: lotNo, purchaseLotNo, inspectLotNo 모두 검색
    List<MaterialInbound> inbounds = inboundRepository.findByAnyLotNo(lotNo);
    if (!inbounds.isEmpty()) {
      found = true;
      MaterialInbound ib = inbounds.get(0);
      fillFromInbound(res, ib);

      // 발주 정보 가져오기 (orderDtlSq → PurchaseOrderDetail → PurchaseOrder)
      if (ib.getOrderDtlSq() != null) {
        purchaseOrderDetailRepository.findById(ib.getOrderDtlSq()).ifPresent(dtl -> {
          PurchaseOrder po = dtl.getPurchaseOrder();
          if (po != null) {
            res.setPurchaseOrderNo(po.getOrderNo());
            if (res.getCustomerName() == null && po.getCustomerSq() != null) {
              customerRepository.findById(po.getCustomerSq())
                  .ifPresent(c -> res.setCustomerName(c.getCustomerName()));
            }
            // 입고요청일
            LotTraceDto.HistoryItem poH = new LotTraceDto.HistoryItem();
            poH.setDate(po.getOrderDate() != null ? po.getOrderDate().toString() : "-");
            poH.setType("PURCHASE");
            poH.setDescription("발주 " + po.getOrderNo()
                + (po.getInReqDate() != null ? " (입고요청일: " + po.getInReqDate() + ")" : ""));
            res.getHistories().add(0, poH);
          }
        });
      }

      // 같은 품목의 다른 입고건도 합산 (총 입고량 계산)
      if (inbounds.size() > 1) {
        double totalQty = inbounds.stream()
            .mapToDouble(i -> i.getInboundQty() != null ? i.getInboundQty() : 0.0)
            .sum();
        res.setCurrentQty(totalQty);
      }
    }

    // 2) 완제품 재고 (ProductStock.lotNo) - 인덱스 조회
    ProductStock matchedStock = productStockRepository.findFirstByLotNo(lotNo).orElse(null);
    if (matchedStock != null) {
      found = true;
      fillFromProductStock(res, matchedStock);
    }

    // 3) 생산실적 상세 (WorkResultDetail.lotNo = PR-xxx) - 인덱스 조회
    WorkResultDetail matchedDetail = workResultDetailRepository.findFirstByLotNo(lotNo).orElse(null);
    if (matchedDetail != null) {
      found = true;
      fillFromWorkResultDetail(res, matchedDetail);
    }

    // 4) 출하검사 (ShipmentInspect.lotNo = FIS-xxx)
    List<ShipmentInspect> inspects = shipInspectRepository.findByLotNo(lotNo);
    if (!inspects.isEmpty()) {
      found = true;
      fillFromShipInspect(res, inspects.get(0));
    }

    // 5) 출하계획 (ShipmentPlan.lotNo = IS-xxx) - 인덱스 조회
    ShipmentPlan matchedPlan = planRepository.findFirstByLotNo(lotNo).orElse(null);
    if (matchedPlan != null) {
      found = true;
      fillFromShipmentPlan(res, matchedPlan);
    }

    // 6) 출하실적 (ShipmentResult.lotNo) - 인덱스 조회
    ShipmentResult matchedResult = resultRepository.findFirstByLotNo(lotNo).orElse(null);
    if (matchedResult != null) {
      found = true;
      fillFromShipmentResult(res, matchedResult);
    }

    // 7) 품번으로도 시도 (품목 마스터 직접 검색)
    if (!found) {
      itemRepository.findByItemCode(lotNo).ifPresent(item -> {
        res.setItemCode(item.getItemCode());
        res.setItemName(item.getItemName());
        res.setAccountType(item.getAccountType());
        res.setStorageLoc(item.getEffectiveStorageLocation());
        if (item.getEffectiveBasisWeight() != null) res.setBasisWeight(item.getEffectiveBasisWeight());
        if (item.getEffectiveWidth() != null) res.setWidth(item.getEffectiveWidth());
        if (item.getEffectiveLength() != null) res.setLength(item.getEffectiveLength());
        res.setProgressStatus("품목정보");
      });
    }

    // 품목정보 보완
    if (res.getItemCode() != null && res.getItemName() == null) {
      itemRepository.findByItemCode(res.getItemCode()).ifPresent(item -> {
        res.setItemName(item.getItemName());
        res.setAccountType(item.getAccountType());
      });
    }

    // progressStatus 결정
    if (res.getProgressStatus() == null) {
      if (matchedResult != null) res.setProgressStatus("출하완료");
      else if (inspects.stream().anyMatch(i -> "OK".equals(i.getJudgeCode()))) res.setProgressStatus("출하대기");
      else if (matchedStock != null) res.setProgressStatus("재고보관중");
      else if (matchedDetail != null) res.setProgressStatus("생산완료");
      else if (!inbounds.isEmpty()) res.setProgressStatus("입고완료");
      else res.setProgressStatus("-");
    }

    return res;
  }

  private void fillFromInbound(LotTraceDto.Res res, MaterialInbound ib) {
    itemRepository.findById(ib.getItemSq()).ifPresent(item -> {
      if (res.getItemCode() == null) {
        res.setItemCode(item.getItemCode());
        res.setItemName(item.getItemName());
        res.setAccountType(item.getAccountType());
        res.setStorageLoc(item.getEffectiveStorageLocation());
      }
    });
    res.setCurrentQty(ib.getInboundQty());
    res.setQtyUnit("kg");
    res.setInboundDate(ib.getInboundDate() != null ? ib.getInboundDate().toString() : null);
    res.setPurchaseLotNo(ib.getPurchaseLotNo());
    res.setInspectStatus(ib.getInspectStatus());

    LotTraceDto.HistoryItem h = new LotTraceDto.HistoryItem();
    h.setDate(ib.getInboundDate() != null ? ib.getInboundDate().toString() : "-");
    h.setType("INBOUND");
    StringBuilder desc = new StringBuilder("입고 수량: " + ib.getInboundQty());
    if (ib.getPurchaseLotNo() != null) desc.append(" (구매LOT: ").append(ib.getPurchaseLotNo()).append(")");
    if (ib.getInspectStatus() != null) {
      desc.append(" 검사: ").append("PASS".equals(ib.getInspectStatus()) ? "합격" :
          "REJECT".equals(ib.getInspectStatus()) ? "불합격" : ib.getInspectStatus());
    }
    h.setDescription(desc.toString());
    res.getHistories().add(h);

    // 입고검사 이력
    if (ib.getInspectDate() != null) {
      LotTraceDto.HistoryItem ih = new LotTraceDto.HistoryItem();
      ih.setDate(ib.getInspectDate().toString());
      ih.setType("INSPECT");
      ih.setDescription("입고검사 " + (ib.getInspectLotNo() != null ? ib.getInspectLotNo() : "")
          + " 판정: " + ("PASS".equals(ib.getInspectStatus()) ? "합격" :
          "REJECT".equals(ib.getInspectStatus()) ? "불합격" : (ib.getInspectStatus() != null ? ib.getInspectStatus() : "대기"))
          + (ib.getInspectorName() != null ? " (검사자: " + ib.getInspectorName() + ")" : ""));
      res.getHistories().add(ih);
    }
  }

  private void fillFromProductStock(LotTraceDto.Res res, ProductStock stock) {
    itemRepository.findById(stock.getItemSq()).ifPresent(item -> {
      if (res.getItemCode() == null) {
        res.setItemCode(item.getItemCode());
        res.setItemName(item.getItemName());
        res.setAccountType(item.getAccountType());
        if (item.getEffectiveBasisWeight() != null) res.setBasisWeight(item.getEffectiveBasisWeight());
        if (item.getEffectiveWidth() != null) res.setWidth(item.getEffectiveWidth());
        if (item.getEffectiveLength() != null) res.setLength(item.getEffectiveLength());
      }
    });
    res.setStorageLoc(stock.getStorageLoc());
    res.setCurrentQty(stock.getCurrentQtyM());
    res.setQtyUnit("m");
    if (res.getInboundDate() == null && stock.getLastInDate() != null) {
      res.setInboundDate(stock.getLastInDate().toString());
    }
  }

  private void fillFromWorkResultDetail(LotTraceDto.Res res, WorkResultDetail detail) {
    res.setProductionLotNo(detail.getLotNo());
    if (res.getCurrentQty() == null && detail.getProdLength() != null) {
      res.setCurrentQty(detail.getProdLength());
      res.setQtyUnit("m");
    }
    LotTraceDto.HistoryItem h = new LotTraceDto.HistoryItem();
    h.setDate(detail.getWorkEndDt() != null ? detail.getWorkEndDt().toLocalDate().toString() : "-");
    h.setType("PRODUCTION");
    h.setDescription("생산 롤#" + detail.getRollNo() + " 판정: " + detail.getJudgeCode()
        + " 길이: " + detail.getProdLength() + "m");
    res.getHistories().add(h);
  }

  private void fillFromShipInspect(LotTraceDto.Res res, ShipmentInspect insp) {
    res.setShipInspectLotNo(insp.getLotNo());
    res.setShipInspectStatus(insp.getJudgeCode() != null ? insp.getJudgeCode().name() : null);
    if (res.getItemCode() == null) {
      res.setItemCode(insp.getItemCode());
      res.setItemName(insp.getItemName());
    }
    if (insp.getBasisWeight() != null) res.setBasisWeight(insp.getBasisWeight());
    if (insp.getWidth() != null) res.setWidth(insp.getWidth());
    if (insp.getLength() != null) res.setLength(insp.getLength());

    LotTraceDto.HistoryItem h = new LotTraceDto.HistoryItem();
    h.setDate(insp.getInspectDate() != null ? insp.getInspectDate().toString() : "-");
    h.setType("SHIP_INSPECT");
    h.setDescription("출하검사 " + insp.getJudgeCode()
        + (insp.getInspectorNm() != null ? " (검사자: " + insp.getInspectorNm() + ")" : ""));
    res.getHistories().add(h);
  }

  private void fillFromShipmentPlan(LotTraceDto.Res res, ShipmentPlan plan) {
    res.setShipmentPlanLotNo(plan.getLotNo());
    if (res.getItemCode() == null) {
      res.setItemCode(plan.getItemCode());
      res.setItemName(plan.getItemName());
    }
    if (res.getCustomerName() == null) res.setCustomerName(plan.getCustomerName());

    LotTraceDto.HistoryItem h = new LotTraceDto.HistoryItem();
    h.setDate(plan.getExpectedShipDate() != null ? plan.getExpectedShipDate().toString() : "-");
    h.setType("SHIP_PLAN");
    h.setDescription("출하계획 " + plan.getPlanQty() + "m → " + plan.getCustomerName()
        + " (상태: " + plan.getPlanStatus() + ")");
    res.getHistories().add(h);
  }

  private void fillFromShipmentResult(LotTraceDto.Res res, ShipmentResult result) {
    res.setProgressStatus("출하완료");
    LotTraceDto.HistoryItem h = new LotTraceDto.HistoryItem();
    h.setDate(result.getShipDate() != null ? result.getShipDate().toString() : "-");
    h.setType("SHIPPED");
    h.setDescription("출하완료 " + result.getShippedQty() + "m (납품일: " + result.getShipDate() + ")");
    res.getHistories().add(h);
  }

  // ──────────────────────────────────────────────
  // LOT 추적 검색 리스트
  // ──────────────────────────────────────────────
  public List<LotTraceSearchDto.SearchItem> searchLots(LotTraceSearchDto.SearchReq req) {
    List<LotTraceSearchDto.SearchItem> results = new ArrayList<>();
    AtomicInteger idCounter = new AtomicInteger(1);

    LocalDate dateFrom = parseDate(req.getDateFrom(), LocalDate.of(2000, 1, 1));
    LocalDate dateTo = parseDate(req.getDateTo(), LocalDate.now().plusYears(1));
    String searchType = req.getSearchType();
    String keyword = req.getSearchValue();

    // 1) 구매LOT (MaterialInbound) - N+1 방지: 일괄 조회
    if (searchType == null || "PURCHASE".equals(searchType)) {
      List<MaterialInbound> inbounds = inboundRepository.findBySearchCondition(dateFrom, dateTo, keyword);
      if (!inbounds.isEmpty()) {
        Map<Long, PurchaseOrderDetail> pDtlMap = EntityIndex.byId(
            EntityIndex.keys(inbounds, MaterialInbound::getOrderDtlSq),
            purchaseOrderDetailRepository::findAllById, PurchaseOrderDetail::getOrderDtlSq);
        Map<Long, Customer> pCustMap = EntityIndex.byId(
            EntityIndex.keys(pDtlMap.values(), d -> d.getPurchaseOrder() != null ? d.getPurchaseOrder().getCustomerSq() : null),
            customerRepository::findAllById, Customer::getCustomerSq);
        Map<Long, Item> pItemMap = EntityIndex.byId(
            EntityIndex.keys(inbounds, MaterialInbound::getItemSq),
            itemRepository::findAllById, Item::getItemSq);

        for (MaterialInbound ib : inbounds) {
          results.add(buildPurchaseRow(idCounter.getAndIncrement(), ib, pDtlMap, pCustMap, pItemMap));
        }
      }
    }

    // 2) 제조LOT — pw_tb(OP단말 제품중량현황 입력) + dtl_tb(작업완료/레거시) UNION.
    //   같은 work_order 에 pw 행이 있으면 pw 만, 없으면 dtl 사용 (생산실적조회와 동일 정책).
    if (searchType == null || "MFG".equals(searchType)) {
      List<ProductionWorkResultRepository.ExpandedRow> rows =
          workResultRepository.findForLotTraceAll(dateFrom, dateTo, keyword);
      Map<Long, Item> mItemMap = EntityIndex.byId(
          EntityIndex.keys(rows, ProductionWorkResultRepository.ExpandedRow::getItemSq),
          itemRepository::findAllById, Item::getItemSq);

      for (ProductionWorkResultRepository.ExpandedRow row : rows) {
        if (row.getLotNo() == null) continue;
        results.add(buildMfgRow(idCounter.getAndIncrement(), row, mItemMap));
      }
    }

    // 3) 출하 (ShipmentResult → ShipmentOrderDetail 스냅샷 활용) - N+1 방지: 일괄 조회
    if (searchType == null || "SHIP".equals(searchType)) {
      List<ShipmentResult> shipResults = resultRepository.findBySearchCondition(dateFrom, dateTo);
      if (!shipResults.isEmpty()) {
        Map<Long, ShipmentOrderDetail> sDtlMap = EntityIndex.byId(
            EntityIndex.keys(shipResults, ShipmentResult::getShipDtlSq),
            shipmentOrderDetailRepository::findAllById, ShipmentOrderDetail::getShipDtlSq);
        Map<Long, Customer> sCustMap = EntityIndex.byId(
            EntityIndex.keys(shipResults, ShipmentResult::getCustomerSq),
            customerRepository::findAllById, Customer::getCustomerSq);
        Map<Long, Item> sItemMap = EntityIndex.byId(
            EntityIndex.keys(shipResults, ShipmentResult::getItemSq),
            itemRepository::findAllById, Item::getItemSq);

        for (ShipmentResult sr : shipResults) {
          if (keyword != null && !keyword.isEmpty() && !sr.getLotNo().contains(keyword)) continue;
          results.add(buildShipRow(idCounter.getAndIncrement(), sr, sDtlMap, sCustMap, sItemMap));
        }
      }
    }

    return results;
  }

  // ──────────────────────────────────────────────
  // LOT 추적 연계 LOT 일괄 조회 (엑셀 출력용)
  //  - 구매LOT → 동일 itemSq의 모든 제조 LOT
  //  - 제조LOT → 동일 WorkResult의 모든 제품 LOT 중 실제 출하된 것
  //  - 출하LOT → 비어 있음
  //  구매상세/제조상세 화면의 연계 LOT 정의를 그대로 따른다.
  // ──────────────────────────────────────────────
  public List<LotTraceSearchDto.LinkedLotsItem> getLinkedLotsBulk(LotTraceSearchDto.LinkedLotsReq req) {
    List<LotTraceSearchDto.LinkedLotsItem> out = new ArrayList<>();
    if (req == null || req.getItems() == null || req.getItems().isEmpty()) return out;

    Map<String, List<String>> resultMap = new HashMap<>();

    // 1) 구매 LOT → 제조 LOT
    //    chain: MaterialInputRecord.purchase_lot_no → work_order_sq → WorkResult → WorkResultDetail.lot_no (롤별)
    List<String> purchaseLotNos = req.getItems().stream()
        .filter(k -> "purchase".equals(k.getTypeBg()))
        .map(LotTraceSearchDto.LinkedLotKey::getLotNo)
        .filter(Objects::nonNull).distinct().collect(Collectors.toList());

    if (!purchaseLotNos.isEmpty()) {
      List<MaterialInputRecord> inputs = materialInputRecordRepository.findByPurchaseLotNoIn(purchaseLotNos);
      // purchaseLotNo → Set<workOrderSq>
      Map<String, Set<Long>> purchaseLotToWoSqs = new HashMap<>();
      for (MaterialInputRecord mir : inputs) {
        if (mir.getPurchaseLotNo() == null || mir.getWorkOrderSq() == null) continue;
        purchaseLotToWoSqs
            .computeIfAbsent(mir.getPurchaseLotNo(), k -> new HashSet<>())
            .add(mir.getWorkOrderSq());
      }
      Set<Long> allWoSqs = purchaseLotToWoSqs.values().stream()
          .flatMap(Set::stream).collect(Collectors.toSet());

      // workOrderSq → Set<resultSq>
      Map<Long, Set<Long>> woSqToResultSqs = new HashMap<>();
      if (!allWoSqs.isEmpty()) {
        List<WorkResult> wrs = workResultRepository.findByWorkOrderSqIn(allWoSqs);
        for (WorkResult wr : wrs) {
          if (wr.getWorkOrderSq() == null || wr.getResultSq() == null) continue;
          woSqToResultSqs
              .computeIfAbsent(wr.getWorkOrderSq(), k -> new HashSet<>())
              .add(wr.getResultSq());
        }
      }

      // workOrderSq → List<lotNo> (work_result_dtl 기준)
      Set<Long> allResultSqs = woSqToResultSqs.values().stream()
          .flatMap(Set::stream).collect(Collectors.toSet());
      Map<Long, Set<String>> woSqToLotNos = new HashMap<>();
      if (!allResultSqs.isEmpty()) {
        List<WorkResultDetail> allDetails = workResultDetailRepository.findByWorkResultResultSqIn(allResultSqs);
        for (WorkResultDetail d : allDetails) {
          if (d.getWorkResult() == null || d.getLotNo() == null) continue;
          Long woSq = d.getWorkResult().getWorkOrderSq();
          if (woSq == null) continue;
          woSqToLotNos.computeIfAbsent(woSq, k -> new HashSet<>()).add(d.getLotNo());
        }
      }

      // 조립: purchaseLotNo → 모든 연계된 제조 LOT
      for (String pLot : purchaseLotNos) {
        Set<Long> woSqs = purchaseLotToWoSqs.getOrDefault(pLot, Set.of());
        List<String> mfgLots = woSqs.stream()
            .flatMap(wo -> woSqToLotNos.getOrDefault(wo, Set.<String>of()).stream())
            .distinct().collect(Collectors.toList());
        resultMap.put(pLot, mfgLots);
      }
    }

    // 2) 제조 LOT → 출하 LOT (동일 WorkResult의 제품 LOT 중 ShipmentResult에 존재하는 것)
    List<String> mfgLotNos = req.getItems().stream()
        .filter(k -> "mfg".equals(k.getTypeBg()))
        .map(LotTraceSearchDto.LinkedLotKey::getLotNo)
        .filter(Objects::nonNull).distinct().collect(Collectors.toList());

    if (!mfgLotNos.isEmpty()) {
      // 입력 LOT → workOrderSq 매핑: work_result_dtl 기준
      Map<String, Long> inputLotToWoSq = new HashMap<>();
      for (WorkResultDetail d : workResultDetailRepository.findByLotNoIn(mfgLotNos)) {
        if (d.getWorkResult() == null || d.getWorkResult().getWorkOrderSq() == null) continue;
        inputLotToWoSq.put(d.getLotNo(), d.getWorkResult().getWorkOrderSq());
      }

      // workOrderSq → 동일 작업지시의 모든 제품 LOT (work_result_dtl 기준)
      Set<Long> allWoSqs = new HashSet<>(inputLotToWoSq.values());
      Map<Long, Set<String>> woSqToProductLots = new HashMap<>();
      if (!allWoSqs.isEmpty()) {
        List<WorkResult> wrsAll = workResultRepository.findByWorkOrderSqIn(allWoSqs);
        Set<Long> resultSqs = new HashSet<>();
        Map<Long, Long> resultSqToWoSq = new HashMap<>();
        for (WorkResult wr : wrsAll) {
          if (wr.getResultSq() == null || wr.getWorkOrderSq() == null) continue;
          if (woSqToProductLots.containsKey(wr.getWorkOrderSq())) continue;
          resultSqs.add(wr.getResultSq());
          resultSqToWoSq.put(wr.getResultSq(), wr.getWorkOrderSq());
        }
        if (!resultSqs.isEmpty()) {
          for (WorkResultDetail d : workResultDetailRepository.findByWorkResultResultSqIn(resultSqs)) {
            if (d.getWorkResult() == null || d.getLotNo() == null) continue;
            Long woSq = resultSqToWoSq.get(d.getWorkResult().getResultSq());
            if (woSq == null) continue;
            woSqToProductLots.computeIfAbsent(woSq, k -> new HashSet<>()).add(d.getLotNo());
          }
        }
      }

      // 모든 후보 제품 LOT에 대한 ShipmentResult 일괄 조회
      Set<String> candidateProdLots = woSqToProductLots.values().stream()
          .flatMap(Set::stream).filter(Objects::nonNull).collect(Collectors.toSet());
      Set<String> shippedLots = new HashSet<>();
      if (!candidateProdLots.isEmpty()) {
        List<ShipmentResult> shipResults = resultRepository.findByLotNoIn(candidateProdLots);
        for (ShipmentResult sr : shipResults) {
          if (sr.getLotNo() != null) shippedLots.add(sr.getLotNo());
        }
      }

      for (String mfgLot : mfgLotNos) {
        Long woSq = inputLotToWoSq.get(mfgLot);
        if (woSq == null) {
          resultMap.put(mfgLot, List.of());
          continue;
        }
        Set<String> siblings = woSqToProductLots.getOrDefault(woSq, Set.of());
        List<String> shipLots = siblings.stream()
            .filter(shippedLots::contains).distinct().collect(Collectors.toList());
        resultMap.put(mfgLot, shipLots);
      }
    }

    // 3) 출하 LOT → 연계 없음
    for (LotTraceSearchDto.LinkedLotKey k : req.getItems()) {
      if ("ship".equals(k.getTypeBg()) && k.getLotNo() != null) {
        resultMap.putIfAbsent(k.getLotNo(), List.of());
      }
    }

    // 응답 구성 (요청 순서 유지)
    Set<String> seen = new HashSet<>();
    for (LotTraceSearchDto.LinkedLotKey k : req.getItems()) {
      if (k.getLotNo() == null || !seen.add(k.getLotNo())) continue;
      LotTraceSearchDto.LinkedLotsItem item = new LotTraceSearchDto.LinkedLotsItem();
      item.setLotNo(k.getLotNo());
      item.setLinkedLots(resultMap.getOrDefault(k.getLotNo(), List.of()));
      out.add(item);
    }
    return out;
  }

  // ──────────────────────────────────────────────
  // LOT 추적 검색 (페이징 버전 - 대용량 대응)
  // ──────────────────────────────────────────────
  public com.mes.global.response.PageResponse<LotTraceSearchDto.SearchItem> searchLotsPaged(
      LotTraceSearchDto.SearchReq req) {
    int page = req.getPage() != null && req.getPage() >= 0 ? req.getPage() : 0;
    int size = req.getSize() != null && req.getSize() > 0 ? req.getSize() : 50;
    org.springframework.data.domain.Pageable pageable =
        org.springframework.data.domain.PageRequest.of(page, size);

    LocalDate dateFrom = parseDate(req.getDateFrom(), LocalDate.of(2000, 1, 1));
    LocalDate dateTo = parseDate(req.getDateTo(), LocalDate.now().plusYears(1));
    String searchType = req.getSearchType();
    String keyword = (req.getSearchValue() != null && !req.getSearchValue().isEmpty()) ? req.getSearchValue() : null;
    AtomicInteger idCounter = new AtomicInteger((page * size) + 1);

    // PURCHASE
    if ("PURCHASE".equals(searchType)) {
      org.springframework.data.domain.Page<MaterialInbound> p =
          inboundRepository.findBySearchConditionPaged(dateFrom, dateTo, keyword, pageable);
      List<MaterialInbound> inbounds = p.getContent();
      List<LotTraceSearchDto.SearchItem> content = new ArrayList<>();
      if (!inbounds.isEmpty()) {
        Map<Long, PurchaseOrderDetail> pDtlMap = EntityIndex.byId(
            EntityIndex.keys(inbounds, MaterialInbound::getOrderDtlSq),
            purchaseOrderDetailRepository::findAllById, PurchaseOrderDetail::getOrderDtlSq);
        Map<Long, Customer> pCustMap = EntityIndex.byId(
            EntityIndex.keys(pDtlMap.values(), d -> d.getPurchaseOrder() != null ? d.getPurchaseOrder().getCustomerSq() : null),
            customerRepository::findAllById, Customer::getCustomerSq);
        Map<Long, Item> pItemMap = EntityIndex.byId(
            EntityIndex.keys(inbounds, MaterialInbound::getItemSq),
            itemRepository::findAllById, Item::getItemSq);

        for (MaterialInbound ib : inbounds) {
          content.add(buildPurchaseRow(idCounter.getAndIncrement(), ib, pDtlMap, pCustMap, pItemMap));
        }
      }
      return com.mes.global.response.PageResponse.of(content, page, size, p.getTotalElements());
    }

    // MFG — pw_tb + dtl_tb UNION (작업지시별 pw 우선) 기반 LOT 행 페이징.
    if ("MFG".equals(searchType)) {
      long totalElements = workResultRepository.countForLotTrace(dateFrom, dateTo, keyword);
      List<ProductionWorkResultRepository.ExpandedRow> rows =
          workResultRepository.findForLotTracePaged(dateFrom, dateTo, keyword, size, page * size);
      List<LotTraceSearchDto.SearchItem> content = new ArrayList<>();
      if (!rows.isEmpty()) {
        List<Long> mItemSqs = rows.stream().map(ProductionWorkResultRepository.ExpandedRow::getItemSq)
            .filter(Objects::nonNull).distinct().collect(Collectors.toList());
        Map<Long, Item> mItemMap = mItemSqs.isEmpty() ? Map.of()
            : itemRepository.findAllById(mItemSqs).stream()
                .collect(Collectors.toMap(Item::getItemSq, Function.identity()));

        for (ProductionWorkResultRepository.ExpandedRow row : rows) {
          if (row.getLotNo() == null) continue;
          content.add(buildMfgRow(idCounter.getAndIncrement(), row, mItemMap));
        }
      }
      return com.mes.global.response.PageResponse.of(content, page, size, totalElements);
    }

    // SHIP
    if ("SHIP".equals(searchType)) {
      org.springframework.data.domain.Page<ShipmentResult> p =
          resultRepository.findForLotTracePaged(dateFrom, dateTo, keyword, pageable);
      List<ShipmentResult> shipResults = p.getContent();
      List<LotTraceSearchDto.SearchItem> content = new ArrayList<>();
      if (!shipResults.isEmpty()) {
        Map<Long, ShipmentOrderDetail> sDtlMap = EntityIndex.byId(
            EntityIndex.keys(shipResults, ShipmentResult::getShipDtlSq),
            shipmentOrderDetailRepository::findAllById, ShipmentOrderDetail::getShipDtlSq);
        Map<Long, Customer> sCustMap = EntityIndex.byId(
            EntityIndex.keys(shipResults, ShipmentResult::getCustomerSq),
            customerRepository::findAllById, Customer::getCustomerSq);
        Map<Long, Item> sItemMap = EntityIndex.byId(
            EntityIndex.keys(shipResults, ShipmentResult::getItemSq),
            itemRepository::findAllById, Item::getItemSq);

        for (ShipmentResult sr : shipResults) {
          content.add(buildShipRow(idCounter.getAndIncrement(), sr, sDtlMap, sCustMap, sItemMap));
        }
      }
      return com.mes.global.response.PageResponse.of(content, page, size, p.getTotalElements());
    }

    // searchType 미지정: 빈 페이지 반환 (3종 합집합 페이징은 복잡 → 프론트가 타입 선택 필요)
    return com.mes.global.response.PageResponse.of(List.of(), page, size, 0L);
  }

  // ──────────────────────────────────────────────
  // 구매 LOT 상세
  // ──────────────────────────────────────────────
  public PurchaseLotDetailDto.Res getPurchaseLotDetail(String lotNo) {
    PurchaseLotDetailDto.Res res = new PurchaseLotDetailDto.Res();
    res.setLotNo(lotNo);
    res.setInspections(new ArrayList<>());
    res.setMfgLinks(new ArrayList<>());
    res.setStockByLot(new ArrayList<>());

    List<MaterialInbound> inbounds = inboundRepository.findByAnyLotNo(lotNo);
    if (inbounds.isEmpty()) return res;

    MaterialInbound ib = inbounds.get(0);
    res.setReceiptDate(ib.getInboundDate() != null ? ib.getInboundDate().toString() : "-");
    res.setReceivedQty(ib.getInboundQty() != null ? ib.getInboundQty().toString() : "-");

    // item info
    itemRepository.findById(ib.getItemSq()).ifPresent(itm -> {
      res.setItemCode(itm.getItemCode());
      res.setItemName(itm.getItemName());
      res.setStorageLocation(itm.getEffectiveStorageLocation());
    });

    // vendor + PO info
    if (ib.getOrderDtlSq() != null) {
      purchaseOrderDetailRepository.findById(ib.getOrderDtlSq()).ifPresent(dtl -> {
        PurchaseOrder po = dtl.getPurchaseOrder();
        if (po != null) {
          res.setPurchaseOrderNo(po.getOrderNo());
          res.setOrderedQty(dtl.getOrderQty() != null ? dtl.getOrderQty().toString() : "-");
          if (po.getCustomerSq() != null) {
            customerRepository.findById(po.getCustomerSq()).ifPresent(c -> {
              res.setVendorName(c.getCustomerName());
              res.setVendorCode(c.getCustomerCode());
            });
          }
        }
      });
    }

    // inspection
    if (ib.getInspectDate() != null) {
      PurchaseLotDetailDto.InspectionItem insp = new PurchaseLotDetailDto.InspectionItem();
      insp.setInspectNo(ib.getInspectNo() != null ? ib.getInspectNo() : ib.getInspectLotNo());
      insp.setInspectDate(ib.getInspectDate().toString());
      insp.setInspectorName(ib.getInspectorName());
      insp.setSampleCount(ib.getLotQty());
      insp.setResult("PASS".equals(ib.getInspectStatus()) ? "합격" :
          "REJECT".equals(ib.getInspectStatus()) ? "불합격" : ib.getInspectStatus());
      res.getInspections().add(insp);
    }

    // mfg links - 동일 itemSq의 WorkResultDetail만 조회 (기존: 전체 스캔 후 메모리 필터)
    List<WorkResultDetail> mfgDetails = ib.getItemSq() != null
        ? workResultDetailRepository.findByWorkResultItemSq(ib.getItemSq())
        : List.of();
    for (WorkResultDetail d : mfgDetails) {
      PurchaseLotDetailDto.MfgLinkItem link = new PurchaseLotDetailDto.MfgLinkItem();
      link.setMfgLotNo(d.getLotNo());
      link.setInputTime(d.getWorkStartDt() != null ? d.getWorkStartDt().toString().replace("T", " ") : "-");
      link.setInputQty(d.getNetWeight() != null ? d.getNetWeight().toString() : "-");
      link.setStandardRatio("-");
      link.setOverRate("0.0");
      link.setOver(false);
      res.getMfgLinks().add(link);
    }

    // stock by lot - same item's other inbound records (인덱스 조회로 동일품목만 가져옴)
    List<MaterialInbound> sameItemInbounds = ib.getItemSq() != null
        ? inboundRepository.findByItemSq(ib.getItemSq())
        : List.of();
    Map<Long, PurchaseOrderDetail> dtlMap = EntityIndex.byId(
        EntityIndex.keys(sameItemInbounds, MaterialInbound::getOrderDtlSq),
        purchaseOrderDetailRepository::findAllById, PurchaseOrderDetail::getOrderDtlSq);
    Map<Long, Customer> custMap = EntityIndex.byId(
        EntityIndex.keys(dtlMap.values(), d -> d.getPurchaseOrder() != null ? d.getPurchaseOrder().getCustomerSq() : null),
        customerRepository::findAllById, Customer::getCustomerSq);

    for (MaterialInbound sib : sameItemInbounds) {
      PurchaseLotDetailDto.StockItem stock = new PurchaseLotDetailDto.StockItem();
      stock.setLotNo(sib.getPurchaseLotNo() != null ? sib.getPurchaseLotNo() : sib.getLotNo());
      stock.setInboundDate(sib.getInboundDate() != null ? sib.getInboundDate().toString() : "-");
      if (sib.getOrderDtlSq() != null) {
        PurchaseOrderDetail dtl = dtlMap.get(sib.getOrderDtlSq());
        if (dtl != null && dtl.getPurchaseOrder() != null && dtl.getPurchaseOrder().getCustomerSq() != null) {
          Customer c = custMap.get(dtl.getPurchaseOrder().getCustomerSq());
          if (c != null) stock.setVendorName(c.getCustomerName());
        }
      }
      stock.setReceivedQty(sib.getInboundQty() != null ? sib.getInboundQty().toString() : "0");
      stock.setConsumedQty("0");
      stock.setCurrentQty(sib.getInboundQty() != null ? sib.getInboundQty().toString() : "0");
      stock.setStatus(sib.getStockStatus() != null && "N".equals(sib.getStockStatus()) ? "소진" : "재고");
      stock.setLocation(res.getStorageLocation() != null ? res.getStorageLocation() : "-");
      res.getStockByLot().add(stock);
    }

    return res;
  }

  // ──────────────────────────────────────────────
  // 제조 LOT 상세
  //  - 진입 LOT 은 work_result_dtl 에서 workOrderSq 확보.
  //  - 작업지시 단위로 묶어 work_result_dtl 정책으로 LOT 펼침.
  //  - 원소재 투입은 같은 itemSq 의 모든 자재입고가 아니라 MaterialInputRecord(실제 투입 기록) 사용.
  //  - 출하 연계는 dtl LOT 으로 ShipmentResult 매칭.
  // ──────────────────────────────────────────────
  public MfgLotDetailDto.Res getMfgLotDetail(String lotNo) {
    MfgLotDetailDto.Res res = new MfgLotDetailDto.Res();
    res.setLotNo(lotNo);
    res.setProductWeights(new ArrayList<>());
    res.setMaterials(new ArrayList<>());
    res.setQaResults(new ArrayList<>());
    res.setShipLinks(new ArrayList<>());
    res.setDefects(new ArrayList<>());

    // 진입: work_result_dtl 에서 workOrderSq 확보.
    WorkResultDetail matched = workResultDetailRepository.findFirstByLotNo(lotNo).orElse(null);
    if (matched == null) return res;
    WorkResult wr = workResultRepository.findById(matched.getWorkResult().getResultSq())
        .orElse(matched.getWorkResult());
    Long workOrderSq = wr.getWorkOrderSq();
    res.setProdDate(wr.getWorkDate() != null ? wr.getWorkDate().toString() : "-");

    // item info
    Item item = itemRepository.findById(wr.getItemSq()).orElse(null);
    if (item != null) {
      res.setItemCode(item.getItemCode());
      res.setItemName(item.getItemName());
      if (item.getEffectiveBasisWeight() != null) res.setBasisWeight(String.valueOf(item.getEffectiveBasisWeight().intValue()));
      if (item.getEffectiveWidth() != null) res.setWidth(String.valueOf(item.getEffectiveWidth().intValue()));
    }

    // 작업지시 단위 LOT 펼침: work_result_dtl 기준 (생산실적조회와 동일 정책)
    List<ProductionWorkResultRepository.ExpandedRow> expandedRows = workOrderSq != null
        ? workResultRepository.findExpandedRowsByWorkOrderSq(workOrderSq)
        : List.of();

    // 실생산량 = 펼친 LOT 행의 prodLength 합산
    double totalProdLength = 0.0;
    for (ProductionWorkResultRepository.ExpandedRow row : expandedRows) {
      if (row.getProdLength() != null) totalProdLength += row.getProdLength();
    }
    res.setActualQty(totalProdLength > 0 ? String.valueOf(totalProdLength) : "-");

    // 관리평량(g/m²): WorkOrder master의 manageWeight 직접 조회 (폭 무관 단일값)
    WorkOrder wo = workOrderRepository.findById(wr.getWorkOrderSq()).orElse(null);
    Double mw = wo != null ? wo.getManageWeight() : null;
    res.setManagedWeight(mw != null && mw > 0 ? mw.toString() : "-");
    res.setSpeed("-");

    // line / time
    String lineInfo = (wr.getLineName() != null ? wr.getLineName() : "-");
    if (wr.getStartTime() != null && wr.getEndTime() != null) {
      DateTimeFormatter tf = DateTimeFormatter.ofPattern("HH:mm");
      lineInfo += " / " + wr.getStartTime().format(tf) + "~" + wr.getEndTime().format(tf);
    }
    res.setLineTime(lineInfo);

    // good/defect (Integer 단위)
    int good = wr.getTotalGoodQty() != null ? wr.getTotalGoodQty() : 0;
    int bad = wr.getTotalBadQty() != null ? wr.getTotalBadQty() : 0;
    res.setGoodDefect(good + "m / " + bad + "m");
    res.setOrderedQty(wr.getTotalProdQty() != null ? wr.getTotalProdQty().toString() : "-");

    // 롤/LOT 현황 - 작업지시의 모든 LOT 행 (work_result_dtl 기준)
    List<String> productLotNos = new ArrayList<>();
    for (ProductionWorkResultRepository.ExpandedRow row : expandedRows) {
      MfgLotDetailDto.ProductWeightItem pw = new MfgLotDetailDto.ProductWeightItem();
      pw.setLotNo(row.getLotNo());
      pw.setRollNo(row.getRollNo());
      pw.setProdWidth(row.getProdWidth() != null ? row.getProdWidth().toString() : "-");
      pw.setProdLength(row.getProdLength() != null ? row.getProdLength().toString() : "-");
      pw.setRealBasisWeight(row.getRealBasisWeight() != null ? row.getRealBasisWeight().toString() : "-");
      pw.setNetWeight(row.getNetWeight() != null ? row.getNetWeight().toString() : "-");
      pw.setGrossWeight(row.getGrossWeight() != null ? row.getGrossWeight().toString() : "-");
      pw.setJudgeCode(row.getJudgeCode() != null ? row.getJudgeCode() : "-");
      pw.setWorkDate(row.getWorkEndDt() != null ? row.getWorkEndDt().toLocalDate().toString()
          : (row.getWorkDate() != null ? row.getWorkDate().toString() : "-"));
      res.getProductWeights().add(pw);
      if (row.getLotNo() != null) productLotNos.add(row.getLotNo());
    }

    // 원소재 투입 — 같은 itemSq 의 모든 자재입고가 아니라 실제 투입 기록(MaterialInputRecord) 사용.
    // workOrderSq 기준으로 조회. 동일 purchase_lot_no 는 합산해 1줄로 표시.
    List<MaterialInputRecord> inputs = workOrderSq != null
        ? materialInputRecordRepository.findByWorkOrderSq(workOrderSq)
        : List.of();
    if (!inputs.isEmpty()) {
      Map<Long, Item> matItemMap = EntityIndex.byId(
          EntityIndex.keys(inputs, MaterialInputRecord::getMaterialItemSq),
          itemRepository::findAllById, Item::getItemSq);

      // purchaseLotNo 별 (자재itemSq) 합산
      Map<String, MaterialInputRecord> firstByPurchaseLot = new java.util.LinkedHashMap<>();
      Map<String, Double> sumQtyByPurchaseLot = new HashMap<>();
      for (MaterialInputRecord mir : inputs) {
        String key = mir.getPurchaseLotNo() != null ? mir.getPurchaseLotNo()
            : (mir.getStockLotNo() != null ? mir.getStockLotNo() : "-");
        firstByPurchaseLot.putIfAbsent(key, mir);
        double q = mir.getInputQty() != null ? mir.getInputQty() : 0.0;
        sumQtyByPurchaseLot.merge(key, q, Double::sum);
      }

      for (Map.Entry<String, MaterialInputRecord> e : firstByPurchaseLot.entrySet()) {
        MaterialInputRecord mir = e.getValue();
        MfgLotDetailDto.MaterialItem mat = new MfgLotDetailDto.MaterialItem();
        mat.setPurchaseLotNo(e.getKey());
        Item matItem = mir.getMaterialItemSq() != null ? matItemMap.get(mir.getMaterialItemSq()) : null;
        if (matItem != null) {
          mat.setItemCode(matItem.getItemCode());
          mat.setMaterialType(matItem.getItemName());
        } else {
          if (mir.getMaterialItemCode() != null) mat.setItemCode(mir.getMaterialItemCode());
          if (mir.getMaterialItemName() != null) mat.setMaterialType(mir.getMaterialItemName());
        }
        mat.setStandardRatio("-");
        mat.setInputQty(String.valueOf(sumQtyByPurchaseLot.getOrDefault(e.getKey(), 0.0)));
        mat.setOverRate("0.0");
        mat.setOver(false);
        res.getMaterials().add(mat);
      }
    }

    // QA - 자주검사(ProcessInspectResult) workOrderSq로 조회
    List<ProcessInspectResult> inspectResults = processInspectResultRepository.findByWorkOrderSq(wr.getWorkOrderSq());
    for (ProcessInspectResult pir : inspectResults) {
      // 초품
      if (pir.getFirstVal() != null) {
        MfgLotDetailDto.QaItem qaFirst = new MfgLotDetailDto.QaItem();
        qaFirst.setInspectType("자주(초)");
        qaFirst.setInspectTime(pir.getInspectDate() != null ? pir.getInspectDate().toString() : "-");
        qaFirst.setInspectItem("평량(g/m²)");
        qaFirst.setStandard("-");
        qaFirst.setMeasured(pir.getFirstVal());
        qaFirst.setPass(!"불합격".equals(pir.getPassFail()));
        res.getQaResults().add(qaFirst);
      }
      // 종품
      if (pir.getLastVal() != null) {
        MfgLotDetailDto.QaItem qaLast = new MfgLotDetailDto.QaItem();
        qaLast.setInspectType("자주(종)");
        qaLast.setInspectTime(pir.getInspectDate() != null ? pir.getInspectDate().toString() : "-");
        qaLast.setInspectItem("평량(g/m²)");
        qaLast.setStandard("-");
        qaLast.setMeasured(pir.getLastVal());
        qaLast.setPass(!"불합격".equals(pir.getPassFail()));
        res.getQaResults().add(qaLast);
      }
      // QA LOT No
      if (res.getQaLotNo() == null) {
        res.setQaLotNo("QC-" + (pir.getInspectDate() != null ? pir.getInspectDate().toString().replace("-", "") : "") + "-" + pir.getResultSq());
      }
    }

    // 출하연계: 출하실적의 lotNo가 곧 제조 LOT (스캔 출하 모델)
    // productLotNos로 ShipmentResult를 직접 조회 → ShipmentOrderDetail → ShipmentPlan → SalesOrder
    // N+1 방지: 제조 LOT 묶음의 출하실적을 한 번에 조회한 뒤 LOT 순서대로 첫 행만 사용
    Map<String, ShipmentResult> shipResultByLot = productLotNos.isEmpty() ? Map.of()
        : resultRepository.findByLotNoIn(productLotNos).stream()
            .collect(Collectors.toMap(ShipmentResult::getLotNo, Function.identity(), (a, b) -> a));
    List<ShipmentResult> matchedShipResults = new ArrayList<>();
    for (String prodLot : productLotNos) {
      ShipmentResult sr = shipResultByLot.get(prodLot);
      if (sr != null) matchedShipResults.add(sr);
    }

    if (!matchedShipResults.isEmpty()) {
      Map<Long, ShipmentOrderDetail> sodByDtlMap = EntityIndex.byId(
          EntityIndex.keys(matchedShipResults, ShipmentResult::getShipDtlSq),
          shipmentOrderDetailRepository::findAllById, ShipmentOrderDetail::getShipDtlSq);
      Map<Long, ShipmentPlan> planByIdMap = EntityIndex.byId(
          EntityIndex.keys(sodByDtlMap.values(), ShipmentOrderDetail::getPlanSq),
          planRepository::findAllById, ShipmentPlan::getPlanSq);
      Map<Long, SalesOrderDetail> sodByIdMap = EntityIndex.byId(
          EntityIndex.keys(planByIdMap.values(), ShipmentPlan::getSalesOrderDtlSq),
          salesOrderDetailRepository::findAllById, SalesOrderDetail::getOrderDtlSq);

      List<String> shipLotNos = matchedShipResults.stream().map(ShipmentResult::getLotNo)
          .filter(Objects::nonNull).distinct().collect(Collectors.toList());
      Map<String, List<ShipmentInspect>> inspectByLotMap = shipLotNos.isEmpty() ? Map.of()
          : shipInspectRepository.findByLotNoIn(shipLotNos).stream()
              .collect(Collectors.groupingBy(ShipmentInspect::getLotNo));

      for (ShipmentResult sr : matchedShipResults) {
        ShipmentOrderDetail sod = sr.getShipDtlSq() != null ? sodByDtlMap.get(sr.getShipDtlSq()) : null;
        MfgLotDetailDto.ShipLinkItem link = new MfgLotDetailDto.ShipLinkItem();
        link.setShipLotNo(sr.getLotNo());
        link.setShipDate(sr.getShipDate() != null ? sr.getShipDate().toString() : "-");
        link.setCustomerName(sod != null && sod.getCustomerName() != null ? sod.getCustomerName() : "-");
        link.setShippedQty(sr.getShippedQty() != null ? sr.getShippedQty().toString() : "-");
        List<ShipmentInspect> si = inspectByLotMap.getOrDefault(sr.getLotNo(), List.of());
        link.setQaResult(!si.isEmpty() ? ("OK".equals(si.get(0).getJudgeCode()) ? "합격" : "불합격") : "-");
        if (sod != null && sod.getPlanSq() != null) {
          ShipmentPlan plan = planByIdMap.get(sod.getPlanSq());
          if (plan != null && plan.getSalesOrderDtlSq() != null) {
            SalesOrderDetail soDtl = sodByIdMap.get(plan.getSalesOrderDtlSq());
            if (soDtl != null && soDtl.getSalesOrder() != null) {
              link.setSalesOrderNo(soDtl.getSalesOrder().getOrderNo());
            }
          }
        }
        if (link.getSalesOrderNo() == null) link.setSalesOrderNo("-");
        res.getShipLinks().add(link);
      }
    }

    // 공정 불량 - LOT 펼침 결과의 NG 행 (pw_tb 는 judgeCode 컬럼 없어 NULL, dtl_tb fallback 시에만 잡힘)
    for (ProductionWorkResultRepository.ExpandedRow row : expandedRows) {
      if (!"NG".equals(row.getJudgeCode())) continue;
      MfgLotDetailDto.DefectItem def = new MfgLotDetailDto.DefectItem();
      def.setDefectType(row.getDefectType() != null ? row.getDefectType() : "불량");
      def.setQty(row.getProdLength() != null ? row.getProdLength().toString() : "-");
      def.setOccurTime(row.getWorkEndDt() != null
          ? row.getWorkEndDt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
          : (row.getWorkDate() != null ? row.getWorkDate().toString() : "-"));
      def.setAction("-");
      res.getDefects().add(def);
    }

    return res;
  }

  // ──────────────────────────────────────────────
  // 수주 역참조 정보
  // ──────────────────────────────────────────────
  public List<LotTraceSearchDto.SalesOrderRefItem> getSalesOrderRefs(LotTraceSearchDto.SearchReq req) {
    List<LotTraceSearchDto.SalesOrderRefItem> results = new ArrayList<>();

    LocalDate dateFrom = parseDate(req.getDateFrom(), LocalDate.of(2000, 1, 1));
    LocalDate dateTo = parseDate(req.getDateTo(), LocalDate.now().plusYears(1));
    String keyword = req.getSearchValue();

    // 출하실적 조회
    List<ShipmentResult> shipResults = resultRepository.findBySearchCondition(dateFrom, dateTo);
    if (shipResults.isEmpty()) return results;

    // N+1 방지: FK 체인 데이터 일괄 조회
    Map<Long, ShipmentOrderDetail> odMap = EntityIndex.byId(
        EntityIndex.keys(shipResults, ShipmentResult::getShipDtlSq),
        shipmentOrderDetailRepository::findAllById, ShipmentOrderDetail::getShipDtlSq);
    Map<Long, ShipmentPlan> planMap = EntityIndex.byId(
        EntityIndex.keys(odMap.values(), ShipmentOrderDetail::getPlanSq),
        planRepository::findAllById, ShipmentPlan::getPlanSq);
    Map<Long, SalesOrderDetail> sodMap = EntityIndex.byId(
        EntityIndex.keys(planMap.values(), ShipmentPlan::getSalesOrderDtlSq),
        salesOrderDetailRepository::findAllById, SalesOrderDetail::getOrderDtlSq);
    Map<Long, Customer> custMap = EntityIndex.byId(
        EntityIndex.keys(shipResults, ShipmentResult::getCustomerSq),
        customerRepository::findAllById, Customer::getCustomerSq);

    for (ShipmentResult sr : shipResults) {
      if (keyword != null && !keyword.isEmpty() && !sr.getLotNo().contains(keyword)) continue;

      ShipmentOrderDetail orderDetail = sr.getShipDtlSq() != null ? odMap.get(sr.getShipDtlSq()) : null;
      if (orderDetail == null || orderDetail.getPlanSq() == null) continue;

      ShipmentPlan plan = planMap.get(orderDetail.getPlanSq());
      if (plan == null || plan.getSalesOrderDtlSq() == null) continue;

      SalesOrderDetail soDtl = sodMap.get(plan.getSalesOrderDtlSq());
      if (soDtl == null) continue;

      SalesOrder so = soDtl.getSalesOrder();
      if (so == null) continue;

      LotTraceSearchDto.SalesOrderRefItem item = new LotTraceSearchDto.SalesOrderRefItem();
      item.setShipLotNo(sr.getLotNo());
      item.setShipDate(sr.getShipDate() != null ? sr.getShipDate().toString() : "-");
      // 거래처명: ShipmentOrderDetail 스냅샷 우선, 없으면 Customer 조회 (Map)
      if (orderDetail.getCustomerName() != null) {
        item.setCustomerName(orderDetail.getCustomerName());
      } else if (sr.getCustomerSq() != null) {
        Customer cust = custMap.get(sr.getCustomerSq());
        if (cust != null) item.setCustomerName(cust.getCustomerName());
      }
      item.setItemCode(orderDetail.getItemCode() != null ? orderDetail.getItemCode() : plan.getItemCode());
      item.setShippedQty(sr.getShippedQty() != null ? sr.getShippedQty().toString() : "-");
      item.setSalesOrderNo(so.getOrderNo());
      item.setSalesOrderDate(so.getOrderDate() != null ? so.getOrderDate().toString() : "-");
      item.setSalesOrderQty(soDtl.getOrderQty() != null ? soDtl.getOrderQty().toString() : "-");

      double orderQty = soDtl.getOrderQty() != null ? soDtl.getOrderQty().doubleValue() : 0.0;
      double shipped = sr.getShippedQty() != null ? sr.getShippedQty() : 0.0;
      item.setRemainQty(String.valueOf(orderQty - shipped));

      results.add(item);
    }

    return results;
  }

  // ── 검색 행(SearchItem) 빌더 ─────────────────────────────────────
  //  searchLots(전체)·searchLotsPaged(페이징) 두 경로가 동일한 행 표현을 공유하므로
  //  타입별 행 조립을 한 곳에 모아 두 경로가 같은 규칙을 재사용하게 한다.

  /** 구매LOT 행: 자재입고 1건 + (발주상세→거래처)·품목 색인으로 표현 행을 만든다. */
  private LotTraceSearchDto.SearchItem buildPurchaseRow(int id, MaterialInbound ib,
      Map<Long, PurchaseOrderDetail> dtlMap, Map<Long, Customer> custMap, Map<Long, Item> itemMap) {
    LotTraceSearchDto.SearchItem row = new LotTraceSearchDto.SearchItem();
    row.setId(id);
    row.setType("구매LOT");
    row.setTypeBg("purchase");
    row.setLotNo(ib.getPurchaseLotNo() != null ? ib.getPurchaseLotNo() : ib.getLotNo());
    row.setDate(ib.getInboundDate() != null ? ib.getInboundDate().toString() : "-");
    PurchaseOrderDetail dtl = ib.getOrderDtlSq() != null ? dtlMap.get(ib.getOrderDtlSq()) : null;
    if (dtl != null && dtl.getPurchaseOrder() != null && dtl.getPurchaseOrder().getCustomerSq() != null) {
      Customer cust = custMap.get(dtl.getPurchaseOrder().getCustomerSq());
      if (cust != null) row.setParty(cust.getCustomerName());
    }
    Item itm = ib.getItemSq() != null ? itemMap.get(ib.getItemSq()) : null;
    if (itm != null) {
      row.setItemCode(itm.getItemCode());
      if (itm.getBasisWeight() != null) row.setBasisWeight(itm.getBasisWeight());
    }
    row.setQty(ib.getInboundQty() != null ? ib.getInboundQty() + "kg" : "-");
    row.setWidth("-");
    row.setLinkedLot("→ 제조LOT 확인");
    return row;
  }

  /** 제조LOT 행: 펼친 생산 행(ExpandedRow) 1건 + 품목 색인으로 표현 행을 만든다. */
  private LotTraceSearchDto.SearchItem buildMfgRow(int id,
      ProductionWorkResultRepository.ExpandedRow src, Map<Long, Item> itemMap) {
    LotTraceSearchDto.SearchItem row = new LotTraceSearchDto.SearchItem();
    row.setId(id);
    row.setType("제조LOT");
    row.setTypeBg("mfg");
    row.setLotNo(src.getLotNo());
    row.setDate(src.getWorkDate() != null ? src.getWorkDate().toString() : "-");
    row.setParty(src.getLineName() != null ? src.getLineName() : "-");
    Item itm = src.getItemSq() != null ? itemMap.get(src.getItemSq()) : null;
    if (itm != null) {
      row.setItemCode(itm.getItemCode());
      if (itm.getBasisWeight() != null) row.setBasisWeight(itm.getBasisWeight());
      if (itm.getWidth() != null) row.setWidth(String.valueOf(itm.getWidth().intValue()));
    }
    row.setQty(src.getProdLength() != null ? src.getProdLength() + "m" : "-");
    row.setLinkedLot("→ 출하LOT 확인");
    return row;
  }

  /** 출하 행: 출하실적 1건 + (출하상세 스냅샷 우선, 없으면 거래처·품목 색인)으로 표현 행을 만든다. */
  private LotTraceSearchDto.SearchItem buildShipRow(int id, ShipmentResult sr,
      Map<Long, ShipmentOrderDetail> dtlMap, Map<Long, Customer> custMap, Map<Long, Item> itemMap) {
    LotTraceSearchDto.SearchItem row = new LotTraceSearchDto.SearchItem();
    row.setId(id);
    row.setType("출하");
    row.setTypeBg("ship");
    row.setLotNo(sr.getLotNo());
    row.setDate(sr.getShipDate() != null ? sr.getShipDate().toString() : "-");
    ShipmentOrderDetail od = sr.getShipDtlSq() != null ? dtlMap.get(sr.getShipDtlSq()) : null;
    if (od != null) {
      row.setParty(od.getCustomerName());
      row.setItemCode(od.getItemCode());
      if (od.getBasisWeight() != null) row.setBasisWeight(od.getBasisWeight());
      if (od.getWidth() != null) row.setWidth(od.getWidth().toString());
    } else {
      if (sr.getCustomerSq() != null) {
        Customer c = custMap.get(sr.getCustomerSq());
        if (c != null) row.setParty(c.getCustomerName());
      }
      if (sr.getItemSq() != null) {
        Item itm = itemMap.get(sr.getItemSq());
        if (itm != null) {
          row.setItemCode(itm.getItemCode());
          if (itm.getBasisWeight() != null) row.setBasisWeight(itm.getBasisWeight());
          if (itm.getWidth() != null) row.setWidth(String.valueOf(itm.getWidth().intValue()));
        }
      }
    }
    row.setQty(sr.getShippedQty() != null ? sr.getShippedQty() + "m" : "-");
    row.setLinkedLot("-");
    return row;
  }

  private LocalDate parseDate(String dateStr, LocalDate defaultVal) {
    if (dateStr == null || dateStr.isEmpty()) return defaultVal;
    try {
      return LocalDate.parse(dateStr);
    } catch (Exception e) {
      try {
        return LocalDate.parse(dateStr.replace("/", "-"));
      } catch (Exception ex) {
        log.debug("날짜 파싱 실패 '{}' — 기본값({}) 사용", dateStr, defaultVal);
        return defaultVal;
      }
    }
  }
}
