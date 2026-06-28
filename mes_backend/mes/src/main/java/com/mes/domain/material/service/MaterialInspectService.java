package com.mes.domain.material.service;

import com.mes.domain.customer.entity.Customer;
import com.mes.domain.customer.repository.CustomerRepository;
import com.mes.domain.inspect.entity.InspectItem;
import com.mes.domain.inspect.entity.InspectStandard;
import com.mes.domain.inspect.repository.InspectStandardRepository;
import com.mes.domain.item.entity.Item;
import com.mes.domain.item.repository.ItemRepository;
import com.mes.domain.material.dto.MaterialInspectDto;
import com.mes.domain.material.entity.InboundInspectResult;
import com.mes.domain.material.entity.MaterialInbound;
import com.mes.domain.material.entity.MaterialInspectLot;
import com.mes.domain.material.entity.StockStatus;
import com.mes.domain.material.repository.InboundInspectResultRepository;
import com.mes.domain.material.repository.MaterialInboundRepository;
import com.mes.domain.material.repository.MaterialInspectLotRepository;
import com.mes.domain.purchase.entity.PurchaseOrder;
import com.mes.domain.purchase.entity.PurchaseOrderDetail;
import com.mes.domain.purchase.repository.PurchaseOrderDetailRepository;
import com.mes.domain.purchase.repository.PurchaseOrderRepository;
import com.mes.domain.quality.entity.InspectionResult;
import com.mes.domain.quality.entity.Ncr;
import com.mes.domain.quality.entity.NcrActionStatus;
import com.mes.domain.quality.repository.NcrRepository;
import com.mes.domain.stock.entity.MaterialStock;
import com.mes.domain.stock.entity.MaterialStockHistory;
import com.mes.domain.stock.repository.MaterialStockHistoryRepository;
import com.mes.domain.stock.repository.MaterialStockRepository;
import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;
import com.mes.global.support.EntityIndex;
import com.mes.global.excel.ExcelColumn;
import com.mes.global.excel.ExcelStreamWriter;
import com.mes.global.response.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.OutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 수입검사(가입고 품목 검사) 도메인 서비스.
 *
 * 담당 범위는 네 갈래다 — 검사 대상 목록, 검사 화면 진입 데이터, 판정 저장/삭제,
 * 그리고 같은 검사 데이터를 "불량" 시각으로 재구성하는 자재불량현황.
 *
 * 두 가지 불변 규칙을 기억할 것:
 *   1) 저장 시점의 기준서를 결과 행에 박제한다 → 이후 기준서가 바뀌어도 과거 판정은 불변.
 *   2) REJECT는 NCR 자동 생성, PASS는 구매 LOT 단위로 재고·이력 반영.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MaterialInspectService {

  private static final String OCCUR_TYPE_MATERIAL = "MATERIAL";
  private static final String INSPECT_TYPE_INCOMING = "INCOMING";
  private static final int MAX_SAMPLE = 15;
  private static final String JUDGE_PASS = "PASS";
  private static final String JUDGE_REJECT = "REJECT";

  private final MaterialInboundRepository inboundRepo;
  private final MaterialInspectLotRepository inspectLotRepo;
  private final InboundInspectResultRepository resultRepo;
  private final InspectStandardRepository inspectStandardRepo;
  private final PurchaseOrderDetailRepository orderDetailRepo;
  private final PurchaseOrderRepository orderRepo;
  private final ItemRepository itemRepo;
  private final CustomerRepository customerRepo;
  private final NcrRepository ncrRepo;
  private final MaterialStockRepository materialStockRepo;
  private final MaterialStockHistoryRepository materialStockHistoryRepo;

  /* ============================ 목록 조회 ============================ */

  /** 검사 대기/완료 목록. 날짜·상태로 DB에서 1차로 좁히고 연관 마스터는 한 번에 모아 매핑한다. */
  public List<MaterialInspectDto.ListRes> getList(MaterialInspectDto.SearchReq req) {
    List<MaterialInbound> inbounds =
        inboundRepo.findBySearchCondition(req.getDateFrom(), req.getDateTo(), null).stream()
            .filter(this::isUsable)
            .filter(m -> req.getInspectStatus() == null
                || req.getInspectStatus().equals(m.getInspectStatus()))
            .collect(Collectors.toList());
    if (inbounds.isEmpty()) {
      return List.of();
    }

    Map<Long, Item> itemMap = loadItems(inbounds);
    Map<Long, PurchaseOrderDetail> dtlMap = loadOrderDetails(inbounds);
    Map<Long, Customer> customerMap = loadCustomers(dtlMap);

    String keyword = req.getKeyword();
    return inbounds.stream()
        .filter(m -> matchesKeyword(m, itemMap, keyword))
        .map(m -> mapToListRes(m, itemMap, dtlMap, customerMap))
        .collect(Collectors.toList());
  }

  private boolean matchesKeyword(MaterialInbound m, Map<Long, Item> itemMap, String keyword) {
    if (keyword == null || keyword.isEmpty()) {
      return true;
    }
    String kw = keyword.toLowerCase();
    Item item = itemMap.get(m.getItemSq());
    String code = lowerOr(item != null ? item.getItemCode() : null, "");
    String name = lowerOr(item != null ? item.getItemName() : null, "");
    String lot = lowerOr(m.getLotNo(), "");
    return code.contains(kw) || name.contains(kw) || lot.contains(kw);
  }

  private static String lowerOr(String s, String fallback) {
    return s != null ? s.toLowerCase() : fallback;
  }

  /* ============================ 자재불량현황 ============================ */

  /**
   * 자재불량현황 페이징. PASS/REJECT만 모아 시료별 NG 합계까지 한 응답에 담는다(예전 N+1 /form 호출 제거).
   *  - 불합격: 입고 자체가 안 잡히므로 전체 입고량을 불량으로, 잔량 0.
   *  - 합격: NG 시료 수만 불량으로, 나머지는 입고잔량.
   */
  public PageResponse<MaterialInspectDto.DefectListRes> getDefectListPaged(
      MaterialInspectDto.SearchReq req) {
    List<MaterialInbound> inbounds =
        inboundRepo.findBySearchCondition(req.getDateFrom(), req.getDateTo(), null).stream()
            .filter(this::isUsable)
            .filter(this::isJudged)
            .collect(Collectors.toList());
    if (inbounds.isEmpty()) {
      return paginate(List.of(), req.getPage(), req.getSize());
    }

    Map<Long, Item> itemMap = loadItems(inbounds);
    Map<Long, List<InboundInspectResult>> resultsByInbound = loadResults(inbounds);
    DefectFilter filter = DefectFilter.from(req);

    // 입고 건별로 불량 행을 만들되 필터에 걸리면 null → 버림
    List<MaterialInspectDto.DefectListRes> rows = inbounds.stream()
        .map(m -> buildDefectRow(m, itemMap.get(m.getItemSq()), resultsByInbound, filter))
        .filter(Objects::nonNull)
        .collect(Collectors.toCollection(ArrayList::new));

    rows.sort(orderedComparator(defectComparator(req.getSortField()), req.getSortDirection()));
    return paginate(rows, req.getPage(), req.getSize());
  }

  /** sortDirection이 ASC가 아니면 내림차순(기본). */
  private static <T> Comparator<T> orderedComparator(Comparator<T> base, String sortDirection) {
    boolean ascending = "ASC".equalsIgnoreCase(sortDirection);
    return ascending ? base : base.reversed();
  }

  /** page/size 정규화 + 안전 subList 슬라이싱. */
  private static <T> PageResponse<T> paginate(List<T> all, Integer pageReq, Integer sizeReq) {
    int page = normalizePage(pageReq);
    int size = normalizeSize(sizeReq);
    int total = all.size();
    int from = Math.min(page * size, total);
    int to = Math.min(from + size, total);
    return PageResponse.of(all.subList(from, to), page, size, (long) total);
  }

  /** 엑셀 export용 — 동일 필터를 적용하되 페이징 없이 전체를 반환. */
  public List<MaterialInspectDto.DefectListRes> getDefectListAll(MaterialInspectDto.SearchReq req) {
    MaterialInspectDto.SearchReq full = new MaterialInspectDto.SearchReq();
    full.setDateFrom(req.getDateFrom());
    full.setDateTo(req.getDateTo());
    full.setItemCode(req.getItemCode());
    full.setItemName(req.getItemName());
    full.setLotNo(req.getLotNo());
    full.setInspectResult(req.getInspectResult());
    full.setSortField(req.getSortField());
    full.setSortDirection(req.getSortDirection());
    full.setPage(0);
    full.setSize(Integer.MAX_VALUE);
    return getDefectListPaged(full).getContent();
  }

  private MaterialInspectDto.DefectListRes buildDefectRow(
      MaterialInbound m, Item item,
      Map<Long, List<InboundInspectResult>> resultsByInbound, DefectFilter filter) {
    String itemCode = item != null ? safeStr(item.getItemCode()) : "";
    String itemName = item != null ? safeStr(item.getItemName()) : "";
    String lotNo = safeStr(m.getInspectLotNo());
    if (lotNo.isEmpty()) {
      lotNo = safeStr(m.getLotNo());
    }

    String judged = JUDGE_PASS.equals(m.getInspectStatus()) ? "합격" : "불합격";
    if (!filter.accepts(itemCode, itemName, lotNo, judged)) {
      return null;
    }

    int ngSamples = 0;
    Integer sampleCnt = null;
    for (InboundInspectResult r : resultsByInbound.getOrDefault(m.getInboundSq(), List.of())) {
      Integer cnt = r.getSampleCnt();
      if (cnt == null) {
        continue;
      }
      if (sampleCnt == null) {
        sampleCnt = cnt; // 표시용 시료수는 첫 항목 기준
      }
      ngSamples += countNgSamples(samplesOf(r), cnt);
    }

    double inboundQty = m.getInboundQty() != null ? m.getInboundQty() : 0.0;
    boolean reject = JUDGE_REJECT.equals(m.getInspectStatus());
    double defectQty = reject ? inboundQty : ngSamples;
    double remaining = reject ? 0.0 : inboundQty - defectQty;

    MaterialInspectDto.DefectListRes res = new MaterialInspectDto.DefectListRes();
    res.setInboundSq(m.getInboundSq());
    res.setInspectNo(m.getInspectNo());
    res.setInspectDate(m.getInspectDate());
    res.setInspectorName(m.getInspectorName());
    res.setItemCode(itemCode);
    res.setItemName(itemName);
    res.setLotNo(lotNo);
    res.setInspectLotNo(m.getInspectLotNo());
    res.setInboundQty(remaining);
    res.setDefectQty(defectQty);
    res.setSampleCnt(sampleCnt);
    res.setInspectResult(judged);
    res.setFileName(m.getFileName());
    res.setFilePath(m.getFilePath());
    return res;
  }

  private Comparator<MaterialInspectDto.DefectListRes> defectComparator(String field) {
    Comparator<MaterialInspectDto.DefectListRes> byDate =
        Comparator.comparing(MaterialInspectDto.DefectListRes::getInspectDate,
            Comparator.nullsLast(Comparator.naturalOrder()));
    if (field == null || field.isEmpty()) {
      return byDate;
    }
    switch (field) {
      case "itemCode":
        return Comparator.comparing(MaterialInspectDto.DefectListRes::getItemCode,
            Comparator.nullsLast(Comparator.naturalOrder()));
      case "itemName":
        return Comparator.comparing(MaterialInspectDto.DefectListRes::getItemName,
            Comparator.nullsLast(Comparator.naturalOrder()));
      case "lotNo":
        return Comparator.comparing(MaterialInspectDto.DefectListRes::getLotNo,
            Comparator.nullsLast(Comparator.naturalOrder()));
      case "defectQty":
        return Comparator.comparing(MaterialInspectDto.DefectListRes::getDefectQty,
            Comparator.nullsLast(Comparator.naturalOrder()));
      case "inspectResult":
        return Comparator.comparing(MaterialInspectDto.DefectListRes::getInspectResult,
            Comparator.nullsLast(Comparator.naturalOrder()));
      case "inspectDate":
      default:
        return byDate;
    }
  }

  /* ============================ 검사 화면 진입 ============================ */

  /**
   * 가입고 PK로 검사 화면 정보를 만든다.
   *  - 등록완료(PASS/REJECT) & 저장결과 존재: 박제된 결과 기준(옛 데이터는 itemDtlSq로 최신 기준서 폴백).
   *  - 미검사(WAIT/null): 최신 기준서 항목을 깔고, 부분 저장된 측정값이 있으면 덮어쓴다.
   */
  public MaterialInspectDto.InspectFormRes getInspectForm(Long inboundSq) {
    MaterialInbound inbound = inboundRepo.findById(inboundSq)
        .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND));

    MaterialInspectDto.InspectFormRes res = new MaterialInspectDto.InspectFormRes();
    res.setInboundSq(inbound.getInboundSq());
    res.setInboundQty(inbound.getInboundQty());
    res.setLotNo(inbound.getLotNo());
    res.setInspectLotNo(inbound.getInspectLotNo());
    res.setInspectNo(inbound.getInspectNo());
    res.setInspectorName(inbound.getInspectorName());
    res.setInspectDate(inbound.getInspectDate());
    res.setPackingQty(inbound.getPackingQty());
    res.setPackingUnit(inbound.getPackingUnit());
    res.setLotQty(inbound.getLotQty());
    res.setRemark(inbound.getRemark());
    res.setFileName(inbound.getFileName());
    res.setFilePath(inbound.getFilePath());
    res.setInspectStatus(inbound.getInspectStatus());
    res.setInboundDate(inbound.getInboundDate());

    fillOrderInfoForForm(res, inbound.getOrderDtlSq());

    Item item = itemRepo.findById(inbound.getItemSq()).orElse(null);
    if (item != null) {
      res.setItemCode(item.getItemCode());
      res.setItemName(item.getItemName());
      res.setAccountType(item.getAccountType());
      // 공급사성적서 조건부 필수 판정용 (수입검사유무)
      res.setImportInspGb(item.getImportInspGb());
    }

    List<InboundInspectResult> savedResults = resultRepo.findByInboundSq(inboundSq);
    res.setItems(resolveFormItems(inbound, savedResults));
    res.setInspectLots(resolveFormLots(inbound, inboundSq));
    return res;
  }

  private List<MaterialInspectDto.InspectItemRes> resolveFormItems(
      MaterialInbound inbound, List<InboundInspectResult> savedResults) {
    boolean completed = isJudged(inbound);
    if (completed && !savedResults.isEmpty()) {
      return formItemsFromSnapshot(inbound, savedResults);
    }
    return formItemsFromStandard(inbound, savedResults);
  }

  /** 등록완료 케이스: 저장된 결과를 그대로 쓰되 박제 컬럼이 NULL인 옛 데이터만 최신 기준서로 보강. */
  private List<MaterialInspectDto.InspectItemRes> formItemsFromSnapshot(
      MaterialInbound inbound, List<InboundInspectResult> savedResults) {
    Map<Long, InspectItem> fallback = latestStandardItems(inbound.getItemSq());
    return savedResults.stream().map(r -> {
      InspectItem fb = fallback.get(r.getItemDtlSq());
      MaterialInspectDto.InspectItemRes dto = new MaterialInspectDto.InspectItemRes();
      dto.setItemDtlSq(r.getItemDtlSq());
      dto.setInspectItemName(coalesce(r.getInspectItemName(), fb != null ? fb.getInspectItemName() : null));
      dto.setInspectCriteria(coalesce(r.getInspectCriteria(), fb != null ? fb.getInspectCriteria() : null));
      dto.setMeasureType(coalesce(r.getMeasureType(), fb != null ? fb.getMeasureType() : null));
      dto.setInspectMethod(coalesce(r.getInspectMethod(), fb != null ? fb.getInspectMethod() : null));
      dto.setInspectCycle(coalesce(r.getInspectCycle(), fb != null ? fb.getInspectCycle() : null));
      dto.setSampleCnt(r.getSampleCnt() != null ? r.getSampleCnt().toString()
          : (fb != null ? fb.getSampleCnt() : null));
      dto.setBaseVal(coalesce(r.getBaseVal(), fb != null ? fb.getBaseVal() : null));
      dto.setMaxVal(coalesce(r.getMaxVal(), fb != null ? fb.getMaxVal() : null));
      dto.setMinVal(coalesce(r.getMinVal(), fb != null ? fb.getMinVal() : null));
      dto.setMeasureVal(r.getMeasureVal());
      dto.setResultYn(r.getResultYn() != null ? r.getResultYn().name() : null);
      copySamples(r, dto);
      return dto;
    }).collect(Collectors.toList());
  }

  /** 미검사 케이스: 최신 기준서 항목을 깔고, 부분 저장된 측정값이 있으면 덮어쓴다. */
  private List<MaterialInspectDto.InspectItemRes> formItemsFromStandard(
      MaterialInbound inbound, List<InboundInspectResult> savedResults) {
    InspectStandard std = latestStandard(inbound.getItemSq());
    if (std == null) {
      return new ArrayList<>();
    }
    Map<Long, InboundInspectResult> savedByItemDtl = savedResults.stream()
        .collect(Collectors.toMap(InboundInspectResult::getItemDtlSq, r -> r));

    return std.getInspectItems().stream().map(stdItem -> {
      MaterialInspectDto.InspectItemRes dto = new MaterialInspectDto.InspectItemRes();
      dto.setItemDtlSq(stdItem.getItemDtlSq());
      dto.setInspectItemName(stdItem.getInspectItemName());
      dto.setInspectCriteria(stdItem.getInspectCriteria());
      dto.setMeasureType(stdItem.getMeasureType());
      dto.setInspectMethod(stdItem.getInspectMethod());
      dto.setInspectCycle(stdItem.getInspectCycle());
      dto.setSampleCnt(stdItem.getSampleCnt());
      dto.setBaseVal(stdItem.getBaseVal());
      dto.setMaxVal(stdItem.getMaxVal());
      dto.setMinVal(stdItem.getMinVal());

      InboundInspectResult saved = savedByItemDtl.get(stdItem.getItemDtlSq());
      if (saved != null) {
        dto.setMeasureVal(saved.getMeasureVal());
        dto.setResultYn(saved.getResultYn() != null ? saved.getResultYn().name() : null);
        copySamples(saved, dto);
      }
      return dto;
    }).collect(Collectors.toList());
  }

  private List<MaterialInspectDto.InspectLotRes> resolveFormLots(MaterialInbound inbound, Long inboundSq) {
    List<MaterialInspectLot> savedLots = inspectLotRepo.findByInboundSqOrderByLotSeqAsc(inboundSq);
    if (!savedLots.isEmpty()) {
      return savedLots.stream()
          .map(l -> new MaterialInspectDto.InspectLotRes(l.getLotSeq(), l.getInspectLotNo(), l.getLotQty()))
          .collect(Collectors.toList());
    }
    return previewChildLots(
        inbound.getInspectLotNo(),
        inbound.getInboundQty() != null ? inbound.getInboundQty().intValue() : null,
        inbound.getPackingQty(),
        inbound.getLotQty());
  }

  /* ============================ 자식 LOT 미리보기/분배 ============================ */

  /** 부모 LOT + 가입고수량 + 포장단위 + 로트수량 → 자식 LOT N개 미리보기. */
  private List<MaterialInspectDto.InspectLotRes> previewChildLots(
      String parentLotNo, Integer inboundQty, Integer packingQty, Integer lotQty) {
    if (parentLotNo == null || lotQty == null || lotQty <= 0 || inboundQty == null) {
      return new ArrayList<>();
    }
    int n = lotQty;
    Integer[] qtys = distributeLotQty(inboundQty, packingQty, n);
    List<MaterialInspectDto.InspectLotRes> list = new ArrayList<>(n);
    for (int i = 0; i < n; i++) {
      String lotNo = (n == 1) ? parentLotNo : parentLotNo + "-" + String.format("%02d", i + 1);
      list.add(new MaterialInspectDto.InspectLotRes(i + 1, lotNo, qtys[i]));
    }
    return list;
  }

  /** 앞 (n-1)개는 packingQty, 마지막은 잔여. packingQty가 없으면 균등(floor) 분배 후 마지막에 잔여. */
  private Integer[] distributeLotQty(Integer inboundQty, Integer packingQty, int n) {
    Integer[] result = new Integer[n];
    if (n == 1) {
      result[0] = inboundQty;
      return result;
    }
    if (packingQty != null && packingQty > 0) {
      int last = inboundQty - packingQty * (n - 1);
      for (int i = 0; i < n - 1; i++) {
        result[i] = packingQty;
      }
      result[n - 1] = last > 0 ? last : packingQty;
    } else {
      int each = inboundQty / n;
      for (int i = 0; i < n - 1; i++) {
        result[i] = each;
      }
      result[n - 1] = inboundQty - each * (n - 1);
    }
    return result;
  }

  /* ============================ 판정 저장 ============================ */

  /** 검사 판정 저장: 마스터 갱신 → 결과 재저장(스냅샷) → NCR 동기화 → 자식 LOT 재생성 → 합격 시 재고 반영. */
  @Transactional
  public void saveInspectResult(MaterialInspectDto.SaveReq req) {
    MaterialInbound inbound = inboundRepo.findById(req.getInboundSq())
        .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND));

    inbound.updateInspectInfo(
        req.getInspectStatus(), req.getPassedQty(), req.getRejectedQty(),
        req.getInspectLotNo(), req.getInspectNo(), req.getInspectorName(), req.getInspectDate(),
        req.getPackingQty(), req.getPackingUnit(), req.getLotQty(),
        req.getFileName(), req.getFilePath(), req.getRemark());

    resultRepo.deleteByInboundSq(req.getInboundSq());
    int totalNg = persistItemResults(req, inbound);

    syncNcr(req, inbound, totalNg);
    regenerateChildLots(req, inbound);
    applyStockOnPass(req, inbound);
  }

  /** 항목별 결과를 저장 시점 기준서로 박제하며 저장하고, NG 시료 총합을 돌려준다. */
  private int persistItemResults(MaterialInspectDto.SaveReq req, MaterialInbound inbound) {
    if (req.getItemResults() == null) {
      return 0;
    }
    Map<Long, InspectItem> stdItemMap = latestStandardItems(inbound.getItemSq());

    int totalNg = 0;
    for (MaterialInspectDto.ItemResultDto r : req.getItemResults()) {
      InspectItem stdItem = stdItemMap.get(r.getItemDtlSq());
      resultRepo.save(buildResult(req.getInboundSq(), r, stdItem));
      totalNg += countNg(r);
    }
    return totalNg;
  }

  private InboundInspectResult buildResult(
      Long inboundSq, MaterialInspectDto.ItemResultDto r, InspectItem stdItem) {
    return InboundInspectResult.builder()
        .inboundSq(inboundSq)
        .itemDtlSq(r.getItemDtlSq())
        .measureVal(r.getMeasureVal())
        .resultYn(r.getResultYn() != null ? InspectionResult.valueOf(r.getResultYn()) : null)
        .sampleCnt(r.getSampleCnt())
        // 등록 시점 기준 스냅샷 (이후 기준서 수정에도 과거 결과 불변)
        .inspectItemName(stdItem != null ? stdItem.getInspectItemName() : null)
        .inspectCriteria(stdItem != null ? stdItem.getInspectCriteria() : null)
        .measureType(stdItem != null ? stdItem.getMeasureType() : null)
        .inspectMethod(stdItem != null ? stdItem.getInspectMethod() : null)
        .inspectCycle(stdItem != null ? stdItem.getInspectCycle() : null)
        .baseVal(stdItem != null ? stdItem.getBaseVal() : null)
        .maxVal(stdItem != null ? stdItem.getMaxVal() : null)
        .minVal(stdItem != null ? stdItem.getMinVal() : null)
        .x1(r.getX1()).x2(r.getX2()).x3(r.getX3()).x4(r.getX4()).x5(r.getX5())
        .x6(r.getX6()).x7(r.getX7()).x8(r.getX8()).x9(r.getX9()).x10(r.getX10())
        .x11(r.getX11()).x12(r.getX12()).x13(r.getX13()).x14(r.getX14()).x15(r.getX15())
        .build();
  }

  private int countNg(MaterialInspectDto.ItemResultDto r) {
    int cnt = r.getSampleCnt() != null ? r.getSampleCnt() : 0;
    String[] vals = {
        r.getX1(), r.getX2(), r.getX3(), r.getX4(), r.getX5(),
        r.getX6(), r.getX7(), r.getX8(), r.getX9(), r.getX10(),
        r.getX11(), r.getX12(), r.getX13(), r.getX14(), r.getX15()
    };
    return countNgSamples(vals, cnt);
  }

  /** 기존 NCR을 지운 뒤, 불합격이면 새 NCR 등록. */
  private void syncNcr(MaterialInspectDto.SaveReq req, MaterialInbound inbound, int totalNg) {
    String lotNo = req.getInspectLotNo();
    if (lotNo != null) {
      List<Ncr> existing = ncrRepo.findByOccurTypeAndLotNo(OCCUR_TYPE_MATERIAL, lotNo);
      if (!existing.isEmpty()) {
        ncrRepo.deleteAll(existing);
      }
    }
    if (!JUDGE_REJECT.equals(req.getInspectStatus())) {
      return;
    }
    Ncr ncr = Ncr.builder()
        .occurType(OCCUR_TYPE_MATERIAL)
        .occurDate(req.getInspectDate() != null ? req.getInspectDate() : LocalDate.now())
        .occurPlace("입고검사")
        .itemSq(inbound.getItemSq())
        .lotNo(lotNo)
        .badQty(Math.max(totalNg, 1))
        .defectType("입고검사 불합격")
        // finderNm은 NOT NULL — 검사자명이 없어도 NCR 등록 실패로 검사 저장이 통째 롤백되지 않게 폴백.
        .finderNm(req.getInspectorName() != null && !req.getInspectorName().isEmpty()
            ? req.getInspectorName() : "SYSTEM")
        .actionStatus(NcrActionStatus.WAIT)
        .regDt(LocalDateTime.now())
        .build();
    ncrRepo.save(ncr);
  }

  /** 자식 LOT을 지우고 다시 만든다. 합격이면 AVAILABLE, 아니면 REJECTED. */
  private void regenerateChildLots(MaterialInspectDto.SaveReq req, MaterialInbound inbound) {
    inspectLotRepo.deleteByInboundSq(req.getInboundSq());
    boolean pass = JUDGE_PASS.equals(req.getInspectStatus());
    List<MaterialInspectDto.InspectLotRes> childLots = previewChildLots(
        req.getInspectLotNo(),
        inbound.getInboundQty() != null ? inbound.getInboundQty().intValue() : null,
        req.getPackingQty(), req.getLotQty());
    for (MaterialInspectDto.InspectLotRes child : childLots) {
      inspectLotRepo.save(MaterialInspectLot.builder()
          .inboundSq(req.getInboundSq())
          .lotSeq(child.getLotSeq())
          .inspectLotNo(child.getInspectLotNo())
          .lotQty(child.getLotQty())
          .stockStatus(pass ? StockStatus.AVAILABLE : StockStatus.REJECTED)
          .regDt(LocalDateTime.now())
          .build());
    }
  }

  /** 합격 & 양품 수량이 있을 때만 구매 LOT 단위로 재고를 더하고 이력을 남긴다(재고 단위=구매 LOT). */
  private void applyStockOnPass(MaterialInspectDto.SaveReq req, MaterialInbound inbound) {
    boolean pass = JUDGE_PASS.equals(req.getInspectStatus());
    if (!pass || req.getPassedQty() == null || req.getPassedQty() <= 0.0) {
      return;
    }
    LocalDate inDate = req.getInspectDate() != null ? req.getInspectDate() : LocalDate.now();
    String stockLotNo = stockLotNoOf(inbound);
    double passedQty = req.getPassedQty();

    MaterialStock stock = materialStockRepo
        .findByItemSqAndLotNoForUpdate(inbound.getItemSq(), stockLotNo)
        .orElse(null);
    if (stock == null) {
      stock = MaterialStock.builder()
          .itemSq(inbound.getItemSq())
          .lotNo(stockLotNo)
          .currentQty(passedQty)
          .lastInDate(inDate)
          .regDt(LocalDateTime.now())
          .build();
    } else {
      double prev = stock.getCurrentQty() != null ? stock.getCurrentQty() : 0.0;
      stock.updateStock(stock.getItemWeight(), prev + passedQty,
          stock.getWarehouseLoc(), stock.getRemark(), stock.getWriterId());
    }
    materialStockRepo.save(stock);

    MaterialStockHistory history = MaterialStockHistory.builder()
        .stockSq(stock.getStockSq())
        .warehouseLoc(stock.getWarehouseLoc())
        .changeType("INBOUND")
        .prevQty(stock.getCurrentQty() - passedQty)
        .changeQty(passedQty)
        .currQty(stock.getCurrentQty())
        .workerId(req.getInspectorName())
        .reason("입고검사 합격")
        .regDt(LocalDateTime.now())
        .build();
    materialStockHistoryRepo.save(history);

    inbound.updateStockStatus(StockStatus.AVAILABLE);
  }

  /* ============================ 판정 삭제 (WAIT 복귀) ============================ */

  /** 검사 결과를 지우고 상태를 WAIT으로 되돌린다. 합격이었으면 재고도 롤백. */
  @Transactional
  public void deleteInspectResult(List<Long> inboundIds) {
    for (Long inboundSq : inboundIds) {
      MaterialInbound inbound = inboundRepo.findById(inboundSq)
          .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND));

      removeRelatedNcr(inbound.getInspectLotNo());
      rollbackStockIfPassed(inbound);

      inspectLotRepo.deleteByInboundSq(inboundSq);
      inbound.resetInspectInfo();
      resultRepo.deleteByInboundSq(inboundSq);
    }
  }

  private void removeRelatedNcr(String lotNo) {
    if (lotNo == null) {
      return;
    }
    List<Ncr> existing = ncrRepo.findByOccurTypeAndLotNo(OCCUR_TYPE_MATERIAL, lotNo);
    if (!existing.isEmpty()) {
      ncrRepo.deleteAll(existing);
    }
  }

  private void rollbackStockIfPassed(MaterialInbound inbound) {
    boolean wasPassed = JUDGE_PASS.equals(inbound.getInspectStatus())
        && inbound.getPassedQty() != null && inbound.getPassedQty() > 0.0;
    if (!wasPassed) {
      return;
    }
    String stockLotNo = stockLotNoOf(inbound);
    MaterialStock stock = materialStockRepo
        .findByItemSqAndLotNoForUpdate(inbound.getItemSq(), stockLotNo)
        .orElse(null);

    if (stock != null) {
      double prev = stock.getCurrentQty() != null ? stock.getCurrentQty() : 0.0;
      double passedQty = inbound.getPassedQty();
      double next = prev - passedQty;
      if (next <= 0.0) {
        materialStockRepo.delete(stock);
      } else {
        stock.updateStock(stock.getItemWeight(), next,
            stock.getWarehouseLoc(), stock.getRemark(), stock.getWriterId());
        materialStockRepo.save(stock);
      }
      materialStockHistoryRepo.save(MaterialStockHistory.builder()
          .stockSq(stock.getStockSq())
          .warehouseLoc(stock.getWarehouseLoc())
          .changeType("ADJUST")
          .prevQty(prev)
          .changeQty(-passedQty)
          .currQty(next > 0.0 ? next : 0.0)
          .workerId("SYSTEM")
          .reason("입고검사 결과 삭제")
          .regDt(LocalDateTime.now())
          .build());
    }
    inbound.updateStockStatus(StockStatus.REJECTED);
  }

  /* ============================ LOT 채번 ============================ */

  /** 입고검사 LOT번호 채번: IS-yyyyMMdd-XX(2자리). prefix가 다른 max 결과면 1로 폴백. */
  public String generateInspectLotNo(LocalDate date) {
    LocalDate target = date != null ? date : LocalDate.now();
    String prefix = "IS-" + target.format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "-";

    String maxLotNo = inboundRepo.findMaxInspectLotNo(prefix);
    int next = 1;
    if (maxLotNo != null && maxLotNo.startsWith(prefix)) {
      try {
        next = Integer.parseInt(maxLotNo.substring(prefix.length())) + 1;
      } catch (NumberFormatException e) {
        next = 1;
      }
    }
    return prefix + String.format("%02d", next);
  }

  /* ============================ 엑셀 export ============================ */

  /** 입고검사 결과(PASS/REJECT)를 SXSSF 스트리밍으로 export. itemCode/itemName/customerName 필터. */
  public void streamIncomingInspectExcel(MaterialInspectDto.SearchReq req, OutputStream out)
      throws IOException {
    String itemCode = lower(req.getItemCode());
    String itemName = lower(req.getItemName());
    String customerName = lower(req.getCustomerName());

    List<MaterialInspectDto.ListRes> rows = getList(req).stream()
        .filter(r -> JUDGE_PASS.equals(r.getInspectStatus()) || JUDGE_REJECT.equals(r.getInspectStatus()))
        .filter(r -> itemCode == null
            || (r.getItemCode() != null && r.getItemCode().toLowerCase().contains(itemCode)))
        .filter(r -> itemName == null
            || (r.getItemName() != null && r.getItemName().toLowerCase().contains(itemName)))
        .filter(r -> customerName == null
            || (r.getCustomerName() != null && r.getCustomerName().toLowerCase().contains(customerName)))
        .collect(Collectors.toList());

    AtomicInteger rowNo = new AtomicInteger(0);
    List<ExcelColumn<MaterialInspectDto.ListRes>> columns = List.of(
        ExcelColumn.of("No.", r -> rowNo.incrementAndGet()),
        ExcelColumn.of("발주번호", MaterialInspectDto.ListRes::getOrderNo),
        ExcelColumn.of("계정구분", MaterialInspectDto.ListRes::getAccountType),
        ExcelColumn.of("품번", MaterialInspectDto.ListRes::getItemCode),
        ExcelColumn.of("품명", MaterialInspectDto.ListRes::getItemName),
        ExcelColumn.of("Lot.No.", r -> r.getInspectLotNo() != null && !r.getInspectLotNo().isEmpty()
            ? r.getInspectLotNo() : r.getLotNo()),
        ExcelColumn.of("검사수량", MaterialInspectDto.ListRes::getInboundQty),
        ExcelColumn.of("검사결과", MaterialInspectDto.ListRes::getInspectResult),
        ExcelColumn.of("성적서", r -> (r.getFileName() != null && !r.getFileName().isEmpty()) ? "첨부" : ""),
        ExcelColumn.of("검사일자", MaterialInspectDto.ListRes::getInspectDate)
    );
    try (ExcelStreamWriter<MaterialInspectDto.ListRes> writer =
             new ExcelStreamWriter<>("입고검사결과", columns)) {
      writer.writeRows(rows);
      writer.writeTo(out);
    }
  }

  /* ============================ 연관 마스터 일괄 로드 ============================ */

  private Map<Long, Item> loadItems(List<MaterialInbound> inbounds) {
    List<Long> itemSqs = inbounds.stream().map(MaterialInbound::getItemSq)
        .filter(Objects::nonNull).distinct().collect(Collectors.toList());
    return EntityIndex.byId(itemSqs, itemRepo::findAllById, Item::getItemSq);
  }

  private Map<Long, PurchaseOrderDetail> loadOrderDetails(List<MaterialInbound> inbounds) {
    List<Long> dtlSqs = inbounds.stream().map(MaterialInbound::getOrderDtlSq)
        .filter(Objects::nonNull).distinct().collect(Collectors.toList());
    return EntityIndex.byId(dtlSqs, orderDetailRepo::findAllById, PurchaseOrderDetail::getOrderDtlSq);
  }

  private Map<Long, Customer> loadCustomers(Map<Long, PurchaseOrderDetail> dtlMap) {
    List<Long> custSqs = dtlMap.values().stream()
        .map(d -> d.getPurchaseOrder() != null ? d.getPurchaseOrder().getCustomerSq() : null)
        .filter(Objects::nonNull).distinct().collect(Collectors.toList());
    return EntityIndex.byId(custSqs, customerRepo::findAllById, Customer::getCustomerSq);
  }

  private Map<Long, List<InboundInspectResult>> loadResults(List<MaterialInbound> inbounds) {
    List<Long> inboundSqs = inbounds.stream().map(MaterialInbound::getInboundSq)
        .filter(Objects::nonNull).distinct().collect(Collectors.toList());
    if (inboundSqs.isEmpty()) {
      return Map.of();
    }
    return resultRepo.findByInboundSqIn(inboundSqs).stream()
        .collect(Collectors.groupingBy(InboundInspectResult::getInboundSq));
  }

  /* ============================ 매핑 / 발주정보 ============================ */

  private MaterialInspectDto.ListRes mapToListRes(MaterialInbound m,
      Map<Long, Item> itemMap, Map<Long, PurchaseOrderDetail> dtlMap, Map<Long, Customer> customerMap) {
    MaterialInspectDto.ListRes res = new MaterialInspectDto.ListRes();
    res.setInboundSq(m.getInboundSq());
    res.setLotNo(m.getLotNo());
    res.setInboundDate(m.getInboundDate());
    res.setInboundQty(m.getInboundQty());
    res.setInspectStatus(m.getInspectStatus());
    res.setPassedQty(m.getPassedQty());
    res.setRejectedQty(m.getRejectedQty());
    res.setInspectLotNo(m.getInspectLotNo());
    res.setInspectNo(m.getInspectNo());
    res.setInspectorName(m.getInspectorName());
    res.setInspectDate(m.getInspectDate());
    res.setPackingQty(m.getPackingQty());
    res.setPackingUnit(m.getPackingUnit());
    res.setLotQty(m.getLotQty());
    res.setRemark(m.getRemark());
    res.setFileName(m.getFileName());
    res.setFilePath(m.getFilePath());

    PurchaseOrderDetail dtl = dtlMap.get(m.getOrderDtlSq());
    if (dtl != null && dtl.getPurchaseOrder() != null) {
      PurchaseOrder po = dtl.getPurchaseOrder();
      res.setOrderNo(po.getOrderNo());
      res.setOrderQty(dtl.getOrderQty());
      res.setInReqDate(po.getInReqDate() != null ? po.getInReqDate().toString() : "");
      Customer customer = customerMap.get(po.getCustomerSq());
      if (customer != null) {
        res.setCustomerName(customer.getCustomerName());
        res.setCustomerCode(customer.getCustomerCode());
      }
    }

    Item item = itemMap.get(m.getItemSq());
    if (item != null) {
      res.setItemCode(item.getItemCode());
      res.setItemName(item.getItemName());
      res.setAccountType(item.getAccountType());
    }

    res.setInspectResult(judgmentLabel(m.getInspectStatus()));
    return res;
  }

  private void fillOrderInfoForForm(MaterialInspectDto.InspectFormRes res, Long orderDtlSq) {
    PurchaseOrderDetail dtl = orderDetailRepo.findById(orderDtlSq).orElse(null);
    if (dtl == null) {
      return;
    }
    PurchaseOrder po = dtl.getPurchaseOrder();
    if (po == null) {
      return;
    }
    res.setOrderNo(po.getOrderNo());
    res.setOrderQty(dtl.getOrderQty());
    res.setInReqDate(po.getInReqDate() != null ? po.getInReqDate().toString() : "");
    // 공급사성적서 조건부 필수 판정용 (FE: reqMaterialCertYn && importInspGb 면 필수)
    res.setReqMaterialCertYn(po.getReqMaterialCertYn());

    Customer customer = customerRepo.findById(po.getCustomerSq()).orElse(null);
    if (customer != null) {
      res.setCustomerName(customer.getCustomerName());
      res.setCustomerCode(customer.getCustomerCode());
    }
  }

  /* ============================ 기준서 조회 / 시료 헬퍼 / 잡다한 유틸 ============================ */

  /** 해당 품목의 최신(가장 큰 inspectStdSq) 활성 입고검사 기준서. 없으면 null. */
  private InspectStandard latestStandard(Long itemSq) {
    List<InspectStandard> stds =
        inspectStandardRepo.findBySearchCondition(INSPECT_TYPE_INCOMING, itemSq, null, true);
    if (stds.isEmpty()) {
      return null;
    }
    return stds.stream()
        .max(Comparator.comparing(InspectStandard::getInspectStdSq))
        .orElse(stds.get(0));
  }

  /** 최신 기준서 항목을 itemDtlSq → InspectItem 으로. 없으면 빈 맵. */
  private Map<Long, InspectItem> latestStandardItems(Long itemSq) {
    InspectStandard std = latestStandard(itemSq);
    if (std == null) {
      return Map.of();
    }
    return std.getInspectItems().stream()
        .collect(Collectors.toMap(InspectItem::getItemDtlSq, Function.identity(), (a, b) -> a));
  }

  private void copySamples(InboundInspectResult r, MaterialInspectDto.InspectItemRes dto) {
    dto.setX1(r.getX1()); dto.setX2(r.getX2()); dto.setX3(r.getX3());
    dto.setX4(r.getX4()); dto.setX5(r.getX5()); dto.setX6(r.getX6());
    dto.setX7(r.getX7()); dto.setX8(r.getX8()); dto.setX9(r.getX9());
    dto.setX10(r.getX10()); dto.setX11(r.getX11()); dto.setX12(r.getX12());
    dto.setX13(r.getX13()); dto.setX14(r.getX14()); dto.setX15(r.getX15());
  }

  /** 검사결과 엔티티의 시료 측정값 x1..x15 를 인덱스 접근이 쉬운 배열로 펼친다. */
  private static String[] samplesOf(InboundInspectResult r) {
    return new String[] {
        r.getX1(), r.getX2(), r.getX3(), r.getX4(), r.getX5(),
        r.getX6(), r.getX7(), r.getX8(), r.getX9(), r.getX10(),
        r.getX11(), r.getX12(), r.getX13(), r.getX14(), r.getX15()
    };
  }

  /** 앞 cnt개 시료 중 "NG" 개수. cnt가 배열 길이를 넘으면 길이까지만 센다. */
  private static int countNgSamples(String[] samples, int cnt) {
    int limit = Math.min(cnt, samples.length);
    int ng = 0;
    for (int i = 0; i < limit; i++) {
      if ("NG".equals(samples[i])) {
        ng++;
      }
    }
    return ng;
  }

  private String stockLotNoOf(MaterialInbound inbound) {
    return inbound.getPurchaseLotNo() != null ? inbound.getPurchaseLotNo() : inbound.getLotNo();
  }

  private boolean isUsable(MaterialInbound m) {
    return m.getUseYn() != null && m.getUseYn();
  }

  private boolean isJudged(MaterialInbound m) {
    String status = m.getInspectStatus();
    return JUDGE_PASS.equals(status) || JUDGE_REJECT.equals(status);
  }

  private String judgmentLabel(String status) {
    if (JUDGE_PASS.equals(status)) {
      return "합격";
    }
    return JUDGE_REJECT.equals(status) ? "불합격" : "";
  }

  private static String coalesce(String primary, String fallback) {
    return primary != null ? primary : fallback;
  }

  private static String safeStr(String s) {
    return s != null ? s : "";
  }

  private static String lower(String s) {
    return (s == null || s.isEmpty()) ? null : s.toLowerCase();
  }

  private static int normalizePage(Integer page) {
    return page != null && page >= 0 ? page : 0;
  }

  private static int normalizeSize(Integer size) {
    return size != null && size > 0 ? size : 50;
  }

  /** 자재불량현황의 4종 필터(품번/품명/LOT/검사결과)를 한 곳에 묶는다. */
  private record DefectFilter(String code, String name, String lot, String result) {

    static DefectFilter from(MaterialInspectDto.SearchReq req) {
      return new DefectFilter(
          emptyToNull(req.getItemCode()),
          emptyToNull(req.getItemName()),
          emptyToNull(req.getLotNo()),
          emptyToNull(req.getInspectResult()));
    }

    boolean accepts(String itemCode, String itemName, String lotNo, String judged) {
      if (code != null && !itemCode.toLowerCase().contains(code.toLowerCase())) {
        return false;
      }
      if (name != null && !itemName.toLowerCase().contains(name.toLowerCase())) {
        return false;
      }
      if (lot != null && !lotNo.toLowerCase().contains(lot.toLowerCase())) {
        return false;
      }
      return result == null || "전체".equals(result) || result.equals(judged);
    }

    private static String emptyToNull(String s) {
      return (s == null || s.isEmpty()) ? null : s;
    }
  }
}
