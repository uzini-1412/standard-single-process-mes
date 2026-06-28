package com.mes.domain.production.service;

import com.mes.domain.item.entity.Item;
import com.mes.domain.item.repository.ItemRepository;
import com.mes.domain.production.dto.WorkResultDto;
import com.mes.domain.production.entity.WorkOrder;
import com.mes.domain.production.entity.WorkResult;
import com.mes.domain.production.entity.WorkResultDetail;
import com.mes.domain.production.repository.DowntimeRepository;
import com.mes.domain.production.repository.ProductionWorkOrderRepository;
import com.mes.domain.production.repository.ProductionWorkResultDetailRepository;
import com.mes.domain.production.repository.ProductionWorkResultRepository;
import com.mes.domain.stock.entity.ProductStock;
import com.mes.domain.stock.entity.ProductStockHistory;
import com.mes.domain.stock.repository.ProductStockHistoryRepository;
import com.mes.domain.stock.repository.ProductStockRepository;
import com.mes.domain.system.service.SystemConfigService;
import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;
import com.mes.global.paging.PagedQueryExecutor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkResultService {

  // 같은 검색조건에서 페이지 1→2→3 전환 시 count 재실행을 막는 캐시 TTL.
  // 30초면 다른 운영자/키오스크가 새로 들어와도 cache hit 가 살아 있다.
  private static final Duration PAGE_COUNT_TTL = Duration.ofSeconds(30);

  private final ProductionWorkResultRepository workResultRepo;
  private final ProductionWorkResultDetailRepository workResultDetailRepo;
  private final ProductionWorkOrderRepository workOrderRepo;
  private final com.mes.domain.production.repository.ProductionWorkOrderDetailRepository workOrderDetailRepo;
  private final DowntimeRepository downtimeRepo;
  private final ItemRepository itemRepo;
  private final ProductStockRepository productStockRepo;
  private final ProductStockHistoryRepository productStockHistoryRepo;
  private final ProductionMaterialInputService materialInputService;
  private final SystemConfigService systemConfigService;
  private final PagedQueryExecutor pagedQueryExecutor;

  // ── 1. 작업실적 등록 (생산완료 처리) ─────────────────────────

  @Transactional
  public void saveResult(WorkResultDto.SaveReq req) {
    // 수정(resultSq 존재) 재저장이면, 이전에 반영된 완제품 입고분을 먼저 되돌려 중복 입고를 막는다(멱등성).
    reverseProducedGoodsStock(req.getResultSq());

    // 마스터 준비 → 상세 적재 및 수량 합산 → 수량요약 확정 → 저장.
    WorkResult result = prepareResultMaster(req);
    QtyTally tally = persistDetailsAndTally(result, req);
    applyQtySummary(result, req, tally);
    workResultRepo.save(result);

    // 품목이 지정된 경우에만 완제품 입고와 자재 소비를 후처리한다.
    if (req.getItemSq() == null) {
      return;
    }
    stockInProducedGoods(result, req, tally.badQty);
    consumeMaterialsIfConfigured(req.getWorkOrderSq());
  }

  // resultSq 가 있으면 기존 마스터를 끌어와 상세만 비우고(전량 재생성), 없으면 새 마스터를 만든다.
  private WorkResult prepareResultMaster(WorkResultDto.SaveReq req) {
    Long resultSq = req.getResultSq();
    if (resultSq != null) {
      WorkResult found = workResultRepo.findById(resultSq)
          .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND));
      found.getDetails().clear();
      return found;
    }
    return WorkResult.builder()
        .workOrderSq(req.getWorkOrderSq())
        .lineSq(req.getLineSq())
        .lineName(req.getLineName())
        .itemSq(req.getItemSq())
        .workDate(req.getWorkDate())
        .startTime(req.getStartTime())
        .endTime(req.getEndTime())
        .build();
  }

  // 입력된 롤(LOT) 상세를 마스터에 연결하면서, 생산길이를 수량 단위로 보고 전체/양품/불량을 합산한다.
  private QtyTally persistDetailsAndTally(WorkResult result, WorkResultDto.SaveReq req) {
    QtyTally tally = new QtyTally();
    List<WorkResultDto.DetailDto> rows = req.getDetails();
    if (rows == null) {
      return tally;
    }
    for (WorkResultDto.DetailDto d : rows) {
      result.addDetail(toResultDetail(d));

      // 생산길이를 수량으로 환산. intValue 로 소수점 절삭(반올림 없음).
      Double length = d.getProdLength();
      int qty = length != null ? length.intValue() : 0;
      boolean ng = "NG".equals(d.getJudgeCode());
      tally.totalQty += qty;
      if (ng) {
        tally.badQty += qty;
      } else {
        tally.goodQty += qty;
      }
    }
    return tally;
  }

  // DetailDto → WorkResultDetail 엔티티 변환.
  private WorkResultDetail toResultDetail(WorkResultDto.DetailDto d) {
    var judge = d.getJudgeCode() != null
        ? com.mes.domain.quality.entity.InspectionResult.valueOf(d.getJudgeCode())
        : null;
    return WorkResultDetail.builder()
        .lotNo(d.getLotNo())
        .rollNo(d.getRollNo())
        .prodWidth(d.getProdWidth())
        .prodLength(d.getProdLength())
        .realBasisWeight(d.getRealBasisWeight())
        .netWeight(d.getNetWeight())
        .grossWeight(d.getGrossWeight())
        .workStartDt(d.getWorkStartDt())
        .workEndDt(d.getWorkEndDt())
        .judgeCode(judge)
        .defectType(d.getDefectType())
        .remark(d.getRemark())
        .build();
  }

  // 사용자가 품질현황(생산/불량)을 직접 입력했으면 그 값을 채택하고, 아니면 합산값(있으면 지시 목표수량)으로 떨어진다.
  private void applyQtySummary(WorkResult result, WorkResultDto.SaveReq req, QtyTally tally) {
    boolean manualEntered = req.getTotalProdQty() != null || req.getBadQty() != null;
    if (manualEntered) {
      int prodQty = req.getTotalProdQty() != null ? req.getTotalProdQty() : tally.totalQty;
      int badQty = req.getBadQty() != null ? req.getBadQty() : tally.badQty;
      int goodQty = req.getGoodQty() != null ? req.getGoodQty() : (prodQty - badQty);
      result.updateQtySummary(prodQty, goodQty, badQty);
      result.updateDefectTypes(req.getAppearanceDefect(), req.getDimensionDefect());
      return;
    }

    // 입력이 없을 때 기본 생산수량은 합산값이지만, 작업지시 목표수량이 있으면 그것으로 대체한다.
    Integer targetQty = req.getWorkOrderSq() == null ? null
        : workOrderRepo.findById(req.getWorkOrderSq()).map(WorkOrder::getTargetQty).orElse(null);
    int prodQty = targetQty != null ? targetQty : tally.totalQty;
    result.updateQtySummary(prodQty, prodQty - tally.badQty, tally.badQty);
  }

  // 작업실적 수정 재저장 시, 이전에 이 resultSq 로 더해진 완제품 입고분을 되돌린다.
  // 쌓여 있던 INBOUND 이력만큼 ProductStock 에서 차감하고 해당 이력 행을 제거해, 뒤이은 재입고가 멱등이 되게 한다.
  private void reverseProducedGoodsStock(Long resultSq) {
    if (resultSq == null) {
      return;
    }
    List<ProductStockHistory> prior = productStockHistoryRepo.findByRefTypeAndRefSq("WORK_RESULT", resultSq);
    List<ProductStockHistory> reversed = new ArrayList<>();
    for (ProductStockHistory h : prior) {
      if (!h.isInbound()) {
        continue;
      }
      ProductStock stock = productStockRepo.findById(h.getStockSq()).orElse(null);
      if (stock == null) {
        continue;
      }
      double backM = currentQtyM(stock) - (h.getChangeQtyM() != null ? h.getChangeQtyM() : 0.0);
      int backEa = currentQtyEa(stock) - (h.getChangeQtyEa() != null ? h.getChangeQtyEa() : 0);
      // 정상 역분개라면 음수가 나오지 않지만, 그 사이 다른 출고로 줄었을 수 있어 0 으로 막는다.
      stock.updateStock(Math.max(0.0, backM), Math.max(0, backEa), stock.getRemark());
      productStockRepo.save(stock);
      reversed.add(h);
    }
    if (!reversed.isEmpty()) {
      productStockHistoryRepo.deleteAll(reversed);
    }
  }

  // 생산완료 시 완제품 재고(ProductStock)를 자동 증가시킨다.
  // 우선 롤 상세 단위로 입고하고, 상세로 한 건도 처리되지 않았고 작업지시가 있으면 헤더 집계로 입고한다.
  private void stockInProducedGoods(WorkResult result, WorkResultDto.SaveReq req, int badQty) {
    String storageLoc = itemRepo.findById(req.getItemSq())
        .map(Item::getEffectiveStorageLocation).orElse("");

    boolean detailStocked = stockInByDetails(result, req, storageLoc);
    boolean fallbackToHeader = !detailStocked && req.getWorkOrderSq() != null;
    if (fallbackToHeader) {
      stockInByHeader(result, req, storageLoc, badQty);
    }
  }

  // 롤 상세(LOT) 단위로 완제품 재고를 생성/증가시킨다. 한 건이라도 입고하면 true.
  private boolean stockInByDetails(WorkResult result, WorkResultDto.SaveReq req, String storageLoc) {
    List<WorkResultDto.DetailDto> rows = req.getDetails();
    if (rows == null || rows.isEmpty()) {
      return false;
    }
    Long itemSq = req.getItemSq();
    boolean stocked = false;
    for (WorkResultDto.DetailDto d : rows) {
      boolean skip = d.getLotNo() == null || d.getLotNo().isEmpty() || "NG".equals(d.getJudgeCode());
      if (skip) {
        continue;
      }
      double prodLength = d.getProdLength() != null ? d.getProdLength() : 0.0;
      ProductStock stock = productStockRepo
          .findByItemSqAndLotNo(itemSq, d.getLotNo()).orElse(null);

      double prevM = currentQtyM(stock);
      int prevEa = currentQtyEa(stock);
      double newM = prevM + prodLength;
      int newEa = prevEa + 1;

      stock = upsertProductStock(stock, itemSq, d.getLotNo(), newM, newEa, storageLoc, req.getWorkDate());
      ProductStock saved = productStockRepo.save(stock);

      productStockHistoryRepo.save(buildStockHistory(saved, itemSq, d.getLotNo(),
          prevM, prodLength, newM, prevEa, 1, newEa, result.getResultSq(), req.getWriterId(), "생산입고(롤)"));
      stocked = true;
    }
    return stocked;
  }

  // 재고행의 현재 수량(m / ea)을 null 안전하게 꺼낸다.
  private static double currentQtyM(ProductStock stock) {
    return stock != null && stock.getCurrentQtyM() != null ? stock.getCurrentQtyM() : 0.0;
  }

  private static int currentQtyEa(ProductStock stock) {
    return stock != null && stock.getCurrentQtyEa() != null ? stock.getCurrentQtyEa() : 0;
  }

  // 롤 상세가 없거나 lotNo 가 비어 디테일 입고가 안 된 경우, 헤더 양품수량으로 집계 입고한다.
  private void stockInByHeader(WorkResult result, WorkResultDto.SaveReq req, String storageLoc, int badQty) {
    String lotNo = workOrderRepo.findById(req.getWorkOrderSq())
        .map(wo -> wo.getProductionLotNo() != null ? wo.getProductionLotNo() : wo.getLotNo())
        .orElse(null);
    if (lotNo == null || lotNo.isEmpty()) {
      return;
    }

    int headerGoodQty = resolveHeaderGoodQty(req);
    if (headerGoodQty <= 0) {
      return;
    }
    Long itemSq = req.getItemSq();

    ProductStock stock = productStockRepo
        .findByItemSqAndLotNo(itemSq, lotNo).orElse(null);
    double prevM = currentQtyM(stock);
    int prevEa = currentQtyEa(stock);

    double goodAsM = headerGoodQty;
    int eaIncrement = estimateRollCount(itemSq, headerGoodQty);
    double newM = prevM + goodAsM;
    int newEa = prevEa + eaIncrement;

    stock = upsertProductStock(stock, itemSq, lotNo, newM, newEa, storageLoc, req.getWorkDate());
    ProductStock saved = productStockRepo.save(stock);

    productStockHistoryRepo.save(buildStockHistory(saved, itemSq, lotNo,
        prevM, goodAsM, newM, prevEa, eaIncrement, newEa,
        result.getResultSq(), req.getWriterId(), "생산입고(헤더집계)"));
  }

  // 헤더 양품수량 산출 규칙: goodQty 가 있으면 그 값. 없을 때 totalProdQty 가 있으면
  // (badQty 가 주어졌으면) 총생산-불량, 아니면 총생산. 둘 다 없으면 0.
  private int resolveHeaderGoodQty(WorkResultDto.SaveReq req) {
    if (req.getGoodQty() != null) {
      return req.getGoodQty();
    }
    if (req.getTotalProdQty() == null) {
      return 0;
    }
    return req.getBadQty() != null
        ? req.getTotalProdQty() - req.getBadQty()
        : req.getTotalProdQty();
  }

  // 롤 수 추정 — 상세가 없을 때 ceil(생산량 / 품목 단위길이)로 환산하되 최소 1롤.
  // 품목 길이를 모르면 1롤로 본다. (예: 단위길이 200m 품목을 400m 생산 → 2롤)
  private int estimateRollCount(Long itemSq, int headerGoodQty) {
    Double itemLen = itemRepo.findById(itemSq).map(Item::getEffectiveLength).orElse(null);
    boolean unknownLength = itemLen == null || itemLen <= 0;
    if (unknownLength) {
      return 1;
    }
    int ea = (int) Math.ceil(headerGoodQty / itemLen);
    return Math.max(1, ea);
  }

  // 기존 재고가 있으면 수량을 갱신, 없으면 새 재고행을 만든다.
  private ProductStock upsertProductStock(ProductStock stock, Long itemSq, String lotNo,
                                          double newQtyM, int newQtyEa, String storageLoc,
                                          java.time.LocalDate inDate) {
    if (stock != null) {
      stock.updateStock(newQtyM, newQtyEa, null);
      return stock;
    }
    return ProductStock.builder()
        .itemSq(itemSq)
        .lotNo(lotNo)
        .currentQtyM(newQtyM)
        .currentQtyEa(newQtyEa)
        .storageLoc(storageLoc)
        .stockStatus("NORMAL")
        .lastInDate(inDate)
        .build();
  }

  private ProductStockHistory buildStockHistory(ProductStock saved, Long itemSq, String lotNo,
                                                double prevM, double changeM, double currM,
                                                int prevEa, int changeEa, int currEa,
                                                Long refSq, String workerId, String reason) {
    return ProductStockHistory.builder()
        .stockSq(saved.getStockSq())
        .itemSq(itemSq)
        .lotNo(lotNo)
        .changeType("INBOUND")
        .changeQtyM(changeM)
        .prevQtyM(prevM)
        .currQtyM(currM)
        .changeQtyEa(changeEa)
        .prevQtyEa(prevEa)
        .currQtyEa(currEa)
        .refType("WORK_RESULT")
        .refSq(refSq)
        .reason(reason)
        .workerId(workerId)
        .build();
  }

  // 작업완료 시 자재 소비 — material.consume.mode 로 분기 (STANDARDIZATION.md §10·§11).
  //   BACKFLUSH = PLC raw 기반 자동 차감 (호기별 g 합산 → 자재별 kg 환산 → FIFO 차감, 음수 floor)
  //   MANUAL    = 수동 투입(RESERVED) 확정 차감 (자재투입현황 등록형)
  private void consumeMaterialsIfConfigured(Long workOrderSq) {
    if (workOrderSq == null) {
      return;
    }
    boolean backflush = "BACKFLUSH".equals(systemConfigService.get("material.consume.mode"));
    try {
      if (backflush) {
        materialInputService.confirmPlcAutoConsume(workOrderSq);
      } else {
        materialInputService.confirmInputRecords(workOrderSq);
      }
    } catch (Exception e) {
      // 자재 데이터 미비/매핑 불일치가 있어도 작업완료 자체는 실패시키지 않는다.
      // 단, 원인 추적이 가능하도록 경고 로그는 남긴다.
      log.warn("작업완료 중 자재 소비 처리 실패 (workOrderSq={}, backflush={}) — 완료는 그대로 진행: {}",
          workOrderSq, backflush, e.getMessage(), e);
    }
  }

  // 등록 처리 중 누적되는 수량 합계 컨테이너.
  private static final class QtyTally {
    int totalQty;
    int goodQty;
    int badQty;
  }

  // ── 2. 작업실적 현황 조회 (페이징) ──────────────────────────

  /**
   * LOT 펼침 행 단위 페이징. 응답 행 수가 콤보박스 size 와 정확히 맞도록 native LIMIT/OFFSET 으로 경계를 보장하고,
   * work_order/item/work_order_dtl 부가정보는 페이지 안 행에 한해 일괄 매핑한다.
   */
  public com.mes.global.response.PageResponse<WorkResultDto.ResultListRes> getResultStatusPaged(WorkResultDto.SearchReq req) {
    int page = (req.getPage() != null && req.getPage() >= 0) ? req.getPage() : 0;
    int size = (req.getSize() != null && req.getSize() > 0) ? req.getSize() : 50;
    int offset = page * size;

    String itemCode = blankToNull(req.getItemCode());
    String itemName = blankToNull(req.getItemName());
    String lineName = blankToNull(req.getLineName());

    // 같은 검색조건의 count 는 Redis 캐시(TTL 30s)에 태워 페이지 전환 시 재계산을 피하고, count·paged 를 병렬 실행한다.
    String countKey = "page:count:expandedRows:" + req.getDateFrom() + ":" + req.getDateTo()
        + ":" + req.getLineSq() + ":" + lineName + ":" + itemCode + ":" + itemName;

    com.mes.global.response.PageResponse<com.mes.domain.production.repository.ProductionWorkResultRepository.ExpandedRow> rawPage =
        pagedQueryExecutor.execute(page, size,
            () -> workResultRepo.countExpandedRows(
                req.getDateFrom(), req.getDateTo(), req.getLineSq(), lineName, itemCode, itemName),
            () -> workResultRepo.findExpandedRowsPaged(
                req.getDateFrom(), req.getDateTo(), req.getLineSq(), lineName, itemCode, itemName, size, offset),
            countKey, PAGE_COUNT_TTL);

    List<WorkResultDto.ResultListRes> content = mapExpandedRows(rawPage.getContent());
    return com.mes.global.response.PageResponse.of(content, page, size, rawPage.getTotalElements());
  }

  /**
   * 제품중량 상세 — workOrderSq 의 모든 LOT 펼침 행 (페이지 경계 무관).
   */
  public List<WorkResultDto.ResultListRes> getExpandedRowsByWorkOrderSq(Long workOrderSq) {
    if (workOrderSq == null) {
      return new ArrayList<>();
    }
    return mapExpandedRows(workResultRepo.findExpandedRowsByWorkOrderSq(workOrderSq));
  }

  // ExpandedRow 목록을 응답행으로 변환. 작업지시/품목은 페이지 내 PK 를 모아 한 번에 조회(N+1 방지)한다.
  private List<WorkResultDto.ResultListRes> mapExpandedRows(
      List<com.mes.domain.production.repository.ProductionWorkResultRepository.ExpandedRow> rows) {
    if (rows.isEmpty()) {
      return new ArrayList<>();
    }

    List<Long> woSqs = rows.stream().map(r -> r.getWorkOrderSq())
        .filter(Objects::nonNull).distinct().collect(Collectors.toList());
    List<Long> itemSqs = rows.stream().map(r -> r.getItemSq())
        .filter(Objects::nonNull).distinct().collect(Collectors.toList());
    Map<Long, WorkOrder> woMap = mapWorkOrders(woSqs);
    Map<Long, Item> itemMap = mapItems(itemSqs);

    List<WorkResultDto.ResultListRes> out = new ArrayList<>(rows.size());
    for (var r : rows) {
      out.add(toExpandedRowRes(r, woMap, itemMap));
    }
    return out;
  }

  // ExpandedRow 한 건 → 응답행.
  private WorkResultDto.ResultListRes toExpandedRowRes(
      com.mes.domain.production.repository.ProductionWorkResultRepository.ExpandedRow r,
      Map<Long, WorkOrder> woMap, Map<Long, Item> itemMap) {
    WorkResultDto.ResultListRes res = new WorkResultDto.ResultListRes();
    res.setResultSq(r.getResultSq());
    res.setWorkOrderSq(r.getWorkOrderSq());
    res.setLineSq(r.getLineSq());
    res.setLineName(r.getLineName());
    res.setWorkDate(r.getWorkDate());
    res.setItemSq(r.getItemSq());
    res.setTotalProdQty(r.getTotalProdQty());
    res.setTotalGoodQty(r.getTotalGoodQty());
    res.setTotalBadQty(r.getTotalBadQty());
    res.setAppearanceDefect(r.getAppearanceDefect());
    res.setDimensionDefect(r.getDimensionDefect());

    // 기본 시각은 dtl 실측, 없으면 master, 그래도 없으면 작업지시 계획시각으로 보강.
    LocalDateTime startTime = r.getWorkStartDt() != null ? r.getWorkStartDt() : r.getStartTime();
    LocalDateTime endTime = r.getWorkEndDt() != null ? r.getWorkEndDt() : r.getEndTime();

    WorkOrder wo = r.getWorkOrderSq() != null ? woMap.get(r.getWorkOrderSq()) : null;
    if (wo != null) {
      res.setTargetQty(wo.getTargetQty());
      res.setProductionLotNo(wo.getProductionLotNo());
      res.setPlannedManageWeight(wo.getManageWeight());
      if (startTime == null) {
        startTime = wo.getWorkStartTime();
      }
      if (endTime == null) {
        endTime = wo.getWorkEndTime();
      }
    }
    res.setStartTime(startTime);
    res.setEndTime(endTime);

    Item item = r.getItemSq() != null ? itemMap.get(r.getItemSq()) : null;
    if (item == null) {
      res.setWidth(r.getProdWidth());
    } else {
      res.setItemCode(item.getItemCode());
      res.setItemName(item.getItemName());
      res.setBasisWeight(item.getEffectiveBasisWeight());
      // 폭: dtl 실측이 있으면 우선, 없으면 품목 스펙.
      res.setWidth(r.getProdWidth() != null ? r.getProdWidth() : item.getEffectiveWidth());
      // length: 품목 스펙 길이(지시 시점). 실측 길이는 manageLength 로 분리.
      res.setLength(item.getEffectiveLength());
    }

    // dtl 행이면 LOT 단위 실측을 싣고, 아니면(레거시 미완성) work_date 로 lotNo 를 합성한다.
    if (r.getResultDtlSq() != null) {
      res.setLotNo(r.getLotNo());
      res.setRealBasisWeight(r.getRealBasisWeight());
      res.setGrossWeight(r.getGrossWeight());
      res.setManageLength(r.getProdLength());
    } else if (res.getWorkDate() != null) {
      res.setLotNo(synthesizeLotNo(res.getWorkDate()));
    }
    return res;
  }

  // ── 2-1 / 2-2. 차트·불량 요약 ───────────────────────────────

  /**
   * 라인×월별 생산길이(m) 합계 — 생산추이도 차트 소스.
   * 클라이언트에서 1년치 work_result 를 받아 집계하던 부하를 DB GROUP BY 한 줄로 대체한다.
   * 라인명 정규화/매칭은 호출 측(FE)이 공통정보 카탈로그로 처리.
   */
  public List<WorkResultDto.LineMonthlySum> getLineMonthlyTrend(java.time.LocalDate dateFrom, java.time.LocalDate dateTo) {
    var aggregated = workResultRepo.sumProdLengthGroupByLineAndMonth(dateFrom, dateTo);
    List<WorkResultDto.LineMonthlySum> trend = new ArrayList<>(aggregated.size());
    for (var r : aggregated) {
      WorkResultDto.LineMonthlySum dto = new WorkResultDto.LineMonthlySum();
      dto.setLineName(r.getLineName());
      dto.setMonth(r.getMonth());
      dto.setQty(r.getQty() != null ? r.getQty().doubleValue() : 0.0);
      trend.add(dto);
    }
    return trend;
  }

  /**
   * 기간별 불량현황 (경량). 불량 > 0 행만 DB 에서 거르고 LOT 전개/WO/PWR 조회 없이 품목 정보만 붙인다.
   */
  public List<WorkResultDto.ResultListRes> getDefectSummary(WorkResultDto.SearchReq req) {
    String itemCode = blankToNull(req.getItemCode());
    String itemName = blankToNull(req.getItemName());
    List<WorkResult> list = workResultRepo.findDefectsBySearchCondition(
        req.getDateFrom(), req.getDateTo(), req.getLineSq(), itemCode, itemName);
    if (list.isEmpty()) {
      return new ArrayList<>();
    }

    Map<Long, Item> itemMap = mapItems(distinctItemSqs(list));
    List<WorkResultDto.ResultListRes> result = new ArrayList<>(list.size());
    for (WorkResult r : list) {
      WorkResultDto.ResultListRes res = baseResultRow(r);
      Item item = r.getItemSq() != null ? itemMap.get(r.getItemSq()) : null;
      if (item != null) {
        applyItemSpec(res, item);
      }
      result.add(res);
    }
    return result;
  }

  // 품목 스펙(코드/명/평량/폭/길이)을 응답행에 채운다.
  private void applyItemSpec(WorkResultDto.ResultListRes res, Item item) {
    res.setItemCode(item.getItemCode());
    res.setItemName(item.getItemName());
    res.setBasisWeight(item.getEffectiveBasisWeight());
    res.setWidth(item.getEffectiveWidth());
    res.setLength(item.getEffectiveLength());
  }

  // ── 2. 작업실적 현황 조회 (Master + Detail) ─────────────────

  /**
   * 작업실적 현황 (Master+Detail). 시작/종료일은 한쪽만 와도 쿼리에서 IS NULL 로 처리.
   */
  public List<WorkResultDto.ResultListRes> getResultStatus(WorkResultDto.SearchReq req) {
    String itemCode = blankToNull(req.getItemCode());
    String itemName = blankToNull(req.getItemName());
    String lineName = blankToNull(req.getLineName());
    List<WorkResult> list = workResultRepo.findBySearchCondition(
        req.getDateFrom(), req.getDateTo(), req.getLineSq(), lineName, itemCode, itemName);
    if (list.isEmpty()) {
      return new ArrayList<>();
    }
    return buildResultListRows(list);
  }

  // 전체 조회·페이징 조회가 공유하는 매핑 로직.
  private List<WorkResultDto.ResultListRes> buildResultListRows(List<WorkResult> list) {
    List<Long> woSqs = list.stream().map(WorkResult::getWorkOrderSq)
        .filter(Objects::nonNull).distinct().collect(Collectors.toList());
    Map<Long, WorkOrder> woMap = mapWorkOrders(woSqs);
    Map<Long, Item> itemMap = mapItems(distinctItemSqs(list));
    Map<Long, List<WorkResultDetail>> detailMap = loadDetailMap(list);

    List<WorkResultDto.ResultListRes> resultList = new ArrayList<>();
    for (WorkResult r : list) {
      WorkResultDto.ResultListRes master = baseResultRow(r);

      WorkOrder wo = r.getWorkOrderSq() != null ? woMap.get(r.getWorkOrderSq()) : null;
      if (wo != null) {
        master.setTargetQty(wo.getTargetQty());
        master.setStartTime(wo.getWorkStartTime());
        master.setEndTime(wo.getWorkEndTime());
        master.setProductionLotNo(wo.getProductionLotNo());
        master.setPlannedManageWeight(wo.getManageWeight());
      }
      // 지시에서 시각을 못 얻은 경우 마스터 자체 시각으로 폴백.
      if (master.getStartTime() == null) {
        master.setStartTime(r.getStartTime());
      }
      if (master.getEndTime() == null) {
        master.setEndTime(r.getEndTime());
      }

      Item item = itemMap.get(r.getItemSq());
      if (item != null) {
        applyItemSpec(master, item);
      }

      List<WorkResultDetail> details = r.getResultSq() != null
          ? detailMap.getOrDefault(r.getResultSq(), List.of())
          : List.of();
      applyDetailTimeSpan(master, details);

      if (details.isEmpty()) {
        // 상세 없는 미완성 레거시 — work_date 로 lot_no 합성 후 마스터 1행만.
        if (master.getWorkDate() != null) {
          master.setLotNo(synthesizeLotNo(master.getWorkDate()));
        }
        resultList.add(master);
      } else {
        for (WorkResultDetail d : details) {
          resultList.add(expandLotRow(master, d));
        }
      }
    }
    return resultList;
  }

  // 상세 시각 범위(최소 시작 / 최대 종료)를 구해 마스터 시각을 덮어쓴다. 해당 값이 하나도 없으면 그대로 둔다.
  private void applyDetailTimeSpan(WorkResultDto.ResultListRes master, List<WorkResultDetail> details) {
    if (details == null || details.isEmpty()) {
      return;
    }
    LocalDateTime earliest = null;
    LocalDateTime latest = null;
    for (WorkResultDetail d : details) {
      LocalDateTime s = d.getWorkStartDt();
      if (s != null && (earliest == null || s.isBefore(earliest))) {
        earliest = s;
      }
      LocalDateTime e = d.getWorkEndDt();
      if (e != null && (latest == null || e.isAfter(latest))) {
        latest = e;
      }
    }
    if (earliest != null) {
      master.setStartTime(earliest);
    }
    if (latest != null) {
      master.setEndTime(latest);
    }
  }

  // 마스터 값을 그대로 가져온 행을 만든 다음, 롤/LOT 상세의 실측치로 덮어쓴다.
  private WorkResultDto.ResultListRes expandLotRow(WorkResultDto.ResultListRes master, WorkResultDetail d) {
    WorkResultDto.ResultListRes lotRes = new WorkResultDto.ResultListRes();

    // 식별/라인/품목 — 마스터 그대로.
    lotRes.setResultSq(master.getResultSq());
    lotRes.setWorkOrderSq(master.getWorkOrderSq());
    lotRes.setWorkDate(master.getWorkDate());
    lotRes.setLineSq(master.getLineSq());
    lotRes.setLineName(master.getLineName());
    lotRes.setItemSq(master.getItemSq());
    lotRes.setItemCode(master.getItemCode());
    lotRes.setItemName(master.getItemName());
    lotRes.setBasisWeight(master.getBasisWeight());
    lotRes.setPlannedManageWeight(master.getPlannedManageWeight());
    lotRes.setProductionLotNo(master.getProductionLotNo());
    lotRes.setTargetQty(master.getTargetQty());

    // 수량/불량 집계 — 마스터 그대로.
    lotRes.setTotalProdQty(master.getTotalProdQty());
    lotRes.setTotalGoodQty(master.getTotalGoodQty());
    lotRes.setTotalBadQty(master.getTotalBadQty());
    lotRes.setAppearanceDefect(master.getAppearanceDefect());
    lotRes.setDimensionDefect(master.getDimensionDefect());

    // length 는 품목 스펙 길이(마스터). 폭/시각은 상세 실측이 있으면 우선.
    lotRes.setLength(master.getLength());
    lotRes.setWidth(d.getProdWidth() != null ? d.getProdWidth() : master.getWidth());
    lotRes.setStartTime(d.getWorkStartDt() != null ? d.getWorkStartDt() : master.getStartTime());
    lotRes.setEndTime(d.getWorkEndDt() != null ? d.getWorkEndDt() : master.getEndTime());

    // LOT 단위 실측 — real_basis_weight(legacy INSPECT_WEIGHT2), 롤 실측 중량, 실측 길이.
    lotRes.setLotNo(d.getLotNo());
    lotRes.setRealBasisWeight(d.getRealBasisWeight());
    lotRes.setGrossWeight(d.getGrossWeight());
    lotRes.setManageLength(d.getProdLength());
    return lotRes;
  }

  // ── 3. 제품 불량 현황 (Detail 직접 조회) ───────────────────

  public List<WorkResultDto.DetailRes> getDefectStatus(WorkResultDto.SearchReq req) {
    // 판정코드 NG 인 상세행만 가져와 응답 DTO 로 변환.
    var defects = workResultDetailRepo.findDefects(req.getDateFrom(), req.getDateTo(), req.getLineSq());
    return defects.stream().map(this::mapToDetailRes).collect(Collectors.toList());
  }

  // ── 공통 보조 ──────────────────────────────────────────────

  // 마스터(WorkResult)의 공통 헤더/집계 필드만 채운 기본 응답행.
  private WorkResultDto.ResultListRes baseResultRow(WorkResult wr) {
    WorkResultDto.ResultListRes res = new WorkResultDto.ResultListRes();
    // 식별/라인/품목
    res.setResultSq(wr.getResultSq());
    res.setWorkOrderSq(wr.getWorkOrderSq());
    res.setLineSq(wr.getLineSq());
    res.setLineName(wr.getLineName());
    res.setWorkDate(wr.getWorkDate());
    res.setItemSq(wr.getItemSq());
    // 수량 집계
    res.setTotalProdQty(wr.getTotalProdQty());
    res.setTotalGoodQty(wr.getTotalGoodQty());
    res.setTotalBadQty(wr.getTotalBadQty());
    // 불량 분류
    res.setAppearanceDefect(wr.getAppearanceDefect());
    res.setDimensionDefect(wr.getDimensionDefect());
    return res;
  }

  private List<Long> distinctItemSqs(List<WorkResult> list) {
    return list.stream().map(WorkResult::getItemSq)
        .filter(Objects::nonNull).distinct().collect(Collectors.toList());
  }

  // 작업지시 PK 목록을 WorkOrder Map(PK→엔티티)으로. 빈 목록이면 빈 Map.
  private Map<Long, WorkOrder> mapWorkOrders(List<Long> woSqs) {
    if (woSqs.isEmpty()) {
      return Map.of();
    }
    List<WorkOrder> found = workOrderRepo.findAllById(woSqs);
    return found.stream().collect(Collectors.toMap(WorkOrder::getWorkOrderSq, Function.identity()));
  }

  // 품목 PK 목록을 Item Map(PK→엔티티)으로. 빈 목록이면 빈 Map.
  private Map<Long, Item> mapItems(List<Long> itemSqs) {
    if (itemSqs.isEmpty()) {
      return Map.of();
    }
    List<Item> found = itemRepo.findAllById(itemSqs);
    return found.stream().collect(Collectors.toMap(Item::getItemSq, Function.identity()));
  }

  // N+1 방지: 상세를 resultSq IN 조회로 한 번에 끌어와 resultSq 별로 묶는다.
  private Map<Long, List<WorkResultDetail>> loadDetailMap(List<WorkResult> list) {
    List<Long> resultSqs = list.stream().map(WorkResult::getResultSq)
        .filter(Objects::nonNull).distinct().collect(Collectors.toList());
    if (resultSqs.isEmpty()) {
      return Map.of();
    }
    return workResultDetailRepo.findByWorkResultResultSqIn(resultSqs).stream()
        .filter(d -> d.getWorkResult() != null && d.getWorkResult().getResultSq() != null)
        .collect(Collectors.groupingBy(d -> d.getWorkResult().getResultSq()));
  }

  // 상세가 없는 레거시 행용 lot_no 합성: yyyyMMdd-1-1.
  private String synthesizeLotNo(java.time.LocalDate workDate) {
    return workDate.toString().replace("-", "") + "-1-1";
  }

  private WorkResultDto.DetailRes mapToDetailRes(WorkResultDetail detail) {
    WorkResultDto.DetailRes dto = new WorkResultDto.DetailRes();
    dto.setResultDtlSq(detail.getResultDtlSq());
    dto.setLotNo(detail.getLotNo());
    dto.setRollNo(detail.getRollNo());
    // 치수 / 중량 실측
    dto.setProdWidth(detail.getProdWidth());
    dto.setProdLength(detail.getProdLength());
    dto.setRealBasisWeight(detail.getRealBasisWeight());
    dto.setNetWeight(detail.getNetWeight());
    dto.setGrossWeight(detail.getGrossWeight());
    // 판정 / 시각
    dto.setDefectType(detail.getDefectType());
    var judge = detail.getJudgeCode();
    dto.setJudgeCode(judge != null ? judge.name() : null);
    dto.setWorkStartDt(detail.getWorkStartDt());
    dto.setWorkEndDt(detail.getWorkEndDt());
    return dto;
  }

  private static String blankToNull(String value) {
    if (value == null || value.isEmpty()) {
      return null;
    }
    return value;
  }
}
