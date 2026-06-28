package com.mes.domain.quality.service;

import com.mes.domain.item.entity.Item;
import com.mes.domain.item.repository.ItemRepository;
import com.mes.domain.quality.dto.QualityDto;
import com.mes.domain.quality.entity.InspectionResult;
import com.mes.domain.quality.entity.Ncr;
import com.mes.domain.quality.entity.NcrActionStatus;
import com.mes.domain.quality.entity.ShipmentInspect;
import com.mes.domain.quality.repository.NcrRepository;
import com.mes.domain.quality.repository.ShipmentInspectRepository;
import com.mes.domain.production.entity.WorkResultDetail;
import com.mes.domain.production.repository.ProductionWorkResultDetailRepository;
import com.mes.domain.sales.entity.SalesOrderDetail;
import com.mes.domain.sales.repository.SalesOrderDetailRepository;
import com.mes.domain.shipment.entity.ShipmentOrder;
import com.mes.domain.shipment.entity.ShipmentOrderDetail;
import com.mes.domain.shipment.entity.ShipmentPlan;
import com.mes.domain.shipment.repository.ShipmentOrderDetailRepository;
import com.mes.domain.shipment.repository.ShipmentPlanRepository;
import com.mes.global.excel.ExcelColumn;
import com.mes.global.excel.ExcelStreamWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.OutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;

/**
 * 품질관리 서비스. 출하검사와 부적합(NCR) 두 업무 화면의 백엔드 로직을 담는다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QualityService {

  private static final String NCR_SHIPMENT = "SHIPMENT";
  private static final DateTimeFormatter LOT_DATE = DateTimeFormatter.ofPattern("yyMMdd");

  /** 정렬 허용 컬럼 화이트리스트. 목록은 이 안의 값만 받아들인다. */
  private static final Set<String> SORTABLE_FIELDS =
      Set.of("inspectDate", "itemCode", "itemName", "lotNo", "judgeCode", "weight");

  /** 합부판정 코드 → 한글 라벨 (엑셀 표기용). */
  private static final Map<String, String> JUDGE_LABEL = Map.of("OK", "합격", "NG", "부적합");

  private final ShipmentInspectRepository shipInspectRepository;
  private final NcrRepository ncrRepository;
  private final ItemRepository itemRepository;
  private final ShipmentOrderDetailRepository shipOrderDetailRepository;
  private final ShipmentPlanRepository planRepository;
  private final SalesOrderDetailRepository salesOrderDetailRepository;
  // rollWeight/rollBasis 는 work_result_dtl_tb 의 gross_weight/real_basis_weight 에서 끌어온다.
  private final ProductionWorkResultDetailRepository workResultDetailRepository;

  /** productLotNo 한 개의 노출용 롤중량/생산평량 쌍. */
  private record RollWeightSnapshot(Double rollWeight, Double rollBasis) {}

  // ######################################################################
  // # 부적합(NCR)
  // ######################################################################

  /**
   * 부적합 목록. 기간 미지정이면 [1년 전, 1개월 후] 를 기본 적용하고,
   * keyword는 품번/품명 부분일치로 메모리에서 거른다.
   */
  public List<QualityDto.NcrRes> getNcrList(QualityDto.NcrSearchReq req) {
    LocalDate from = (req.getDateFrom() != null) ? req.getDateFrom() : LocalDate.now().minusYears(1);
    LocalDate to = (req.getDateTo() != null) ? req.getDateTo() : LocalDate.now().plusMonths(1);
    String type = emptyToNull(req.getOccurType());

    List<Ncr> rows = ncrRepository.findBySearchCondition(from, to, type);

    // N+1 방지: 등장한 itemSq 를 한 번에 끌어와 Map 으로.
    Map<Long, Item> itemMap = loadItemMap(rows);

    String keyword = emptyToNull(req.getKeyword());
    String lowered = (keyword != null) ? keyword.toLowerCase() : null;

    List<QualityDto.NcrRes> result = new ArrayList<>(rows.size());
    for (Ncr ncr : rows) {
      Item item = itemMap.get(ncr.getItemSq());
      if (lowered != null && !matchesKeyword(item, lowered)) {
        continue;
      }
      result.add(toNcrRes(ncr, item));
    }
    return result;
  }

  private Map<Long, Item> loadItemMap(Collection<Ncr> rows) {
    Set<Long> itemSqs = new LinkedHashSet<>();
    for (Ncr ncr : rows) {
      Long sq = ncr.getItemSq();
      if (sq != null) {
        itemSqs.add(sq);
      }
    }
    if (itemSqs.isEmpty()) {
      return Map.of();
    }
    Map<Long, Item> map = new HashMap<>();
    itemRepository.findAllById(itemSqs).forEach(it -> map.put(it.getItemSq(), it));
    return map;
  }

  private static boolean matchesKeyword(Item item, String lowered) {
    if (item == null) {
      return false;
    }
    String code = item.getItemCode();
    if (code != null && code.toLowerCase().contains(lowered)) {
      return true;
    }
    String name = item.getItemName();
    return name != null && name.toLowerCase().contains(lowered);
  }

  private QualityDto.NcrRes toNcrRes(Ncr n, Item item) {
    QualityDto.NcrRes res = new QualityDto.NcrRes();
    res.setNcrSq(n.getNcrSq());
    res.setLotNo(n.getLotNo());

    // 발생 정보
    res.setOccurType(n.getOccurType());
    res.setOccurDate(n.getOccurDate());
    res.setOccurPlace(n.getOccurPlace());

    // 불량 내역
    res.setBadQty(n.getBadQty());
    res.setDefectType(n.getDefectType());
    res.setFinderNm(n.getFinderNm());

    // 조치 내역
    NcrActionStatus st = n.getActionStatus();
    res.setActionStatus(st != null ? st.name() : null);
    res.setActionDate(n.getActionDate());
    res.setActionContent(n.getActionContent());
    res.setManagerNm(n.getManagerNm());

    if (item != null) {
      res.setItemCode(item.getItemCode());
      res.setItemName(item.getItemName());
    }
    return res;
  }

  /**
   * 부적합 등록/수정. ncrSq 유무로 신규(필수값 가드)와 부분 갱신을 가른다.
   */
  @Transactional
  public void saveNcr(QualityDto.NcrSaveReq req) {
    Long itemSq = resolveItemSq(req.getItemSq(), req.getItemCode());

    if (req.getNcrSq() == null) {
      insertNcr(req, itemSq);
    } else {
      updateNcr(req, itemSq);
    }
  }

  private void insertNcr(QualityDto.NcrSaveReq req, Long itemSq) {
    // 신규 흐름만 필수값 가드. 수정/조치입력은 일부 필드만 와서 제외한다.
    requireText(req.getOccurType(), "발생구분은 필수 입력값입니다.");
    if (req.getOccurDate() == null) {
      throw new IllegalArgumentException("발생일자는 필수 입력값입니다.");
    }
    if (itemSq == null) {
      throw new IllegalArgumentException("품번을 찾을 수 없습니다.");
    }
    if (req.getBadQty() == null) {
      throw new IllegalArgumentException("불량수량은 필수 입력값입니다.");
    }
    requireText(req.getFinderNm(), "발견자는 필수 입력값입니다.");

    // 조치 내용이 함께 들어오면 등록과 동시에 조치완료(DONE)로 본다.
    NcrActionStatus status = (req.getActionContent() != null) ? NcrActionStatus.DONE : NcrActionStatus.WAIT;

    Ncr.NcrBuilder builder = Ncr.builder();
    builder.occurType(req.getOccurType());
    builder.occurDate(req.getOccurDate());
    builder.occurPlace(req.getOccurPlace());
    builder.itemSq(itemSq);
    builder.lotNo(req.getLotNo());
    builder.badQty(req.getBadQty());
    builder.defectType(req.getDefectType());
    builder.finderNm(req.getFinderNm());
    builder.managerNm(req.getManagerNm());
    builder.actionDate(req.getActionDate());
    builder.actionContent(req.getActionContent());
    builder.actionStatus(status);
    builder.regDt(LocalDateTime.now());
    ncrRepository.save(builder.build());
  }

  private void updateNcr(QualityDto.NcrSaveReq req, Long itemSq) {
    Ncr target = ncrRepository.findById(req.getNcrSq())
        .orElseThrow(() -> new RuntimeException("Data Not Found"));

    // 부분 수정: 들어온 값만 반영하고 비어 있으면 기존 값을 유지한다.
    LocalDate occurDate = coalesce(req.getOccurDate(), target.getOccurDate());
    String occurPlace = coalesce(req.getOccurPlace(), target.getOccurPlace());
    Long resolvedItemSq = coalesce(itemSq, target.getItemSq());
    String lotNo = coalesce(req.getLotNo(), target.getLotNo());
    Integer badQty = coalesce(req.getBadQty(), target.getBadQty());
    String defectType = coalesce(req.getDefectType(), target.getDefectType());
    String finderNm = coalesce(req.getFinderNm(), target.getFinderNm());

    target.updateInfo(occurDate, occurPlace, resolvedItemSq, lotNo, badQty, defectType, finderNm);

    boolean hasAction = req.getActionDate() != null || req.getActionContent() != null;
    if (hasAction) {
      target.updateAction(req.getActionDate(), req.getActionContent(), req.getManagerNm());
    }
  }

  // 첫 인자가 null이 아니면 그대로, null이면 기존 값(fallback)을 돌려준다.
  private static <T> T coalesce(T incoming, T fallback) {
    return (incoming != null) ? incoming : fallback;
  }

  /**
   * 부적합 삭제.
   */
  @Transactional
  public void deleteNcr(List<Long> ids) {
    ncrRepository.deleteAllByIdInBatch(ids);
  }

  // ######################################################################
  // # 출하검사 — 조회
  // ######################################################################

  /**
   * 출하검사 전체조회. DB 필터 후 클라이언트 페이지네이션에 맞춰 통째로 내려준다.
   */
  public QualityDto.ShipInspectListRes getShipmentInspectList(QualityDto.ShipInspectReq req) {
    List<ShipmentInspect> rows = searchRows(req);

    Map<Long, ShipmentOrderDetail> dtlMap = loadDetailMap(rows);
    Map<Long, ShipmentPlan> planMap = loadPlanMap(dtlMap.values());
    Map<String, RollWeightSnapshot> pwMap = buildPwMapFromDtl(dtlMap.values());

    List<QualityDto.ShipInspectRes> list = mapRows(rows, dtlMap, planMap, pwMap);
    return new QualityDto.ShipInspectListRes(list, list.size(), maxSampleCnt(rows));
  }

  /**
   * 출하검사 서버 페이징 + 정렬 조회.
   */
  public QualityDto.ShipInspectPagedListRes getShipmentInspectListPaged(QualityDto.ShipInspectReq req) {
    String itemCode = emptyToNull(req.getItemCode());
    String itemName = emptyToNull(req.getItemName());
    String lotNo = emptyToNull(req.getLotNo());
    String keyword = emptyToNull(req.getKeyword());

    int page = (req.getPage() != null && req.getPage() >= 0) ? req.getPage() : 0;
    int size = (req.getSize() != null && req.getSize() > 0) ? req.getSize() : 50;
    Pageable pageable = PageRequest.of(page, size, resolveShipInspectSort(req.getSortField(), req.getSortDirection()));

    Page<ShipmentInspect> pageResult = shipInspectRepository.findBySearchPaged(
        req.getDateFrom(), req.getDateTo(), itemCode, itemName, lotNo, keyword, pageable);

    // maxSamples 는 현재 페이지가 아니라 검색결과 전체 기준으로 계산한다.
    Integer maxFromAll = shipInspectRepository.findMaxSampleCntBySearch(
        req.getDateFrom(), req.getDateTo(), itemCode, itemName, lotNo, keyword);
    int maxSamples = (maxFromAll != null) ? maxFromAll : 0;

    List<ShipmentInspect> rows = pageResult.getContent();
    if (rows.isEmpty()) {
      return new QualityDto.ShipInspectPagedListRes(
          List.of(), page, size, pageResult.getTotalElements(), pageResult.getTotalPages(), maxSamples);
    }

    Map<Long, ShipmentOrderDetail> dtlMap = loadDetailMap(rows);
    Map<Long, ShipmentPlan> planMap = loadPlanMap(dtlMap.values());
    Map<String, RollWeightSnapshot> pwMap = buildPwMapFromDtl(dtlMap.values());

    List<QualityDto.ShipInspectRes> content = mapRows(rows, dtlMap, planMap, pwMap);
    return new QualityDto.ShipInspectPagedListRes(
        content, page, size, pageResult.getTotalElements(), pageResult.getTotalPages(), maxSamples);
  }

  /**
   * 출하검사 단건 상세. pwMap 없이 단건 폴백 경로로 매핑한다.
   */
  public QualityDto.ShipInspectRes getShipmentInspectDetail(Long shipInspectSq) {
    ShipmentInspect si = shipInspectRepository.findById(shipInspectSq)
        .orElseThrow(() -> new RuntimeException("출하검사 데이터를 찾을 수 없습니다."));
    return toShipInspectRes(si);
  }

  /**
   * 출하검사 등록 대상(미출하 + 미검사). productLotNo로 측정 롤중량을 함께 실어
   * 프론트의 x1 자동채움을 지원한다.
   */
  public List<QualityDto.ShipInspectTargetRes> getShipInspectTargets() {
    List<ShipmentOrderDetail> details = shipOrderDetailRepository.findInspectionTargets();
    if (details.isEmpty()) {
      return List.of();
    }

    Map<Long, ShipmentPlan> planMap = loadPlanMap(details);
    Map<String, RollWeightSnapshot> pwMap = buildPwMapFromDtl(details);

    List<QualityDto.ShipInspectTargetRes> out = new ArrayList<>(details.size());
    for (ShipmentOrderDetail d : details) {
      out.add(toTargetRes(d, planMap, pwMap));
    }
    return out;
  }

  private QualityDto.ShipInspectTargetRes toTargetRes(ShipmentOrderDetail d,
      Map<Long, ShipmentPlan> planMap, Map<String, RollWeightSnapshot> pwMap) {
    QualityDto.ShipInspectTargetRes r = new QualityDto.ShipInspectTargetRes();
    r.setShipDtlSq(d.getShipDtlSq());
    r.setPlanSq(d.getPlanSq());

    if (d.getPlanSq() != null) {
      ShipmentPlan p = planMap.get(d.getPlanSq());
      if (p != null) {
        r.setLotNo(p.getLotNo());
      }
    }

    ShipmentOrder order = d.getShipmentOrder();
    if (order != null) {
      r.setShipOrderSq(order.getShipOrderSq());
      r.setExpectedShipDate(order.getExpectedShipDate() != null ? order.getExpectedShipDate().toString() : null);
      r.setExpectedShipTime(order.getExpectedShipTime() != null ? order.getExpectedShipTime().toString() : null);
      r.setDestination(order.getDestination());
      r.setCustomerReq(order.getCustomerReq());
    }

    r.setCustomerName(d.getCustomerName());
    r.setItemCode(d.getItemCode());
    r.setItemName(d.getItemName());
    r.setBasisWeight(d.getBasisWeight());
    r.setWidth(d.getWidth());
    r.setLength(d.getLength());
    r.setPlanQty(d.getOrderQty());
    r.setPlanQtyEa(d.getOrderQtyEa());
    r.setProductLotNo(d.getProductLotNo());
    applyRollSnapshot(d.getProductLotNo(), pwMap, r::setRollWeight, r::setRollBasis);
    return r;
  }

  /**
   * 태블릿 제품출하 대기 목록. OK/출하LOT/미출하/활성품목 필터는 DB 쿼리에서 끝내고,
   * 여기서는 shipDtlSq 중복만 걷어낸 뒤 슬림 DTO로 매핑한다.
   */
  public List<QualityDto.TabletShipPendingRes> getTabletShipPending() {
    List<ShipmentInspect> rows = shipInspectRepository.findTabletShipPending();
    if (rows.isEmpty()) {
      return List.of();
    }

    List<ShipmentInspect> deduped = dedupByShipDtl(rows);

    // loadDetailMap은 null shipDtlSq를 거르므로 여기서도 동일하게 동작한다.
    Map<Long, ShipmentOrderDetail> dtlMap = loadDetailMap(deduped);
    Map<Long, ShipmentPlan> planMap = loadPlanMap(dtlMap.values());

    List<QualityDto.TabletShipPendingRes> out = new ArrayList<>(deduped.size());
    for (ShipmentInspect s : deduped) {
      ShipmentOrderDetail dtl = dtlMap.get(s.getShipDtlSq());
      if (dtl != null) {
        out.add(toTabletPendingRes(s, dtl, planMap));
      }
    }
    return out;
  }

  // inspect_date DESC 정렬이라, shipDtlSq별로 가장 먼저 등장한(=최신) 검사만 보존한다.
  private static List<ShipmentInspect> dedupByShipDtl(List<ShipmentInspect> rows) {
    Set<Long> seen = new HashSet<>();
    List<ShipmentInspect> kept = new ArrayList<>(rows.size());
    for (ShipmentInspect s : rows) {
      Long dtlSq = s.getShipDtlSq();
      if (dtlSq == null || !seen.add(dtlSq)) {
        continue;
      }
      kept.add(s);
    }
    return kept;
  }

  private QualityDto.TabletShipPendingRes toTabletPendingRes(ShipmentInspect s,
      ShipmentOrderDetail dtl, Map<Long, ShipmentPlan> planMap) {
    ShipmentPlan plan = (dtl.getPlanSq() != null) ? planMap.get(dtl.getPlanSq()) : null;

    QualityDto.TabletShipPendingRes r = new QualityDto.TabletShipPendingRes();
    r.setShipDtlSq(s.getShipDtlSq());
    r.setItemSq(dtl.getItemSq());
    r.setItemCode(s.getItemCode());
    r.setItemName(s.getItemName());
    r.setBasisWeight(s.getBasisWeight());
    r.setWidth(s.getWidth());
    r.setLength(s.getLength());
    r.setPlanQty(dtl.getOrderQty());
    r.setCustomerName(dtl.getCustomerName());
    r.setShipPlanLotNo(plan != null ? plan.getLotNo() : null);
    r.setRemark(s.getRemark());

    ShipmentOrder order = dtl.getShipmentOrder();
    Long customerSq = null;
    if (order != null) {
      customerSq = order.getCustomerSq();
      r.setDestination(order.getDestination());
      r.setExpectedShipDate(order.getExpectedShipDate());
    }
    // 출하지시에 customerSq가 비는 레거시/사고데이터는 plan→salesOrderDetail→SalesOrder로 보정한다.
    // customer_code 폴백은 동일 코드 재등록 시 오매핑 위험이 있어 쓰지 않는다.
    if (customerSq == null && plan != null) {
      customerSq = deriveCustomerSq(plan);
    }
    r.setCustomerSq(customerSq);
    return r;
  }

  // ######################################################################
  // # 출하검사 — 엑셀 export
  // ######################################################################

  /**
   * 출하검사 엑셀 스트리밍. 17만+ 규모도 SXSSF로 흘려보내 프론트 변환 부담을 없앤다.
   */
  public void streamShipInspectExcel(QualityDto.ShipInspectReq req, OutputStream out) throws IOException {
    List<ShipmentInspect> rows = searchRows(req);

    Map<Long, ShipmentOrderDetail> dtlMap = loadDetailMap(rows);
    Map<String, RollWeightSnapshot> pwMap = buildPwMapFromDtl(dtlMap.values());

    AtomicInteger rowNo = new AtomicInteger();
    List<ExcelColumn<ShipmentInspect>> columns = new ArrayList<>();
    columns.add(ExcelColumn.of("No.", s -> rowNo.incrementAndGet()));
    columns.add(ExcelColumn.of("검사일자", ShipmentInspect::getInspectDate));
    columns.add(ExcelColumn.of("품번", ShipmentInspect::getItemCode));
    columns.add(ExcelColumn.of("품명", ShipmentInspect::getItemName));
    columns.add(ExcelColumn.of("평량(g/m²)", ShipmentInspect::getBasisWeight));
    columns.add(ExcelColumn.of("폭(mm)", ShipmentInspect::getWidth));
    columns.add(ExcelColumn.of("길이(m)", ShipmentInspect::getLength));
    columns.add(ExcelColumn.of("생산 롤중량(kg)", s -> resolveRollWeight(s, dtlMap, pwMap)));
    columns.add(ExcelColumn.of("생산평량(g/m²)", s -> resolveRollBasis(s, dtlMap, pwMap)));
    columns.add(ExcelColumn.of("상한치", ShipmentInspect::getMaxVal));
    columns.add(ExcelColumn.of("하한치", ShipmentInspect::getMinVal));
    columns.add(ExcelColumn.of("합부판정", s -> formatJudgeCode(judgeName(s))));
    columns.add(ExcelColumn.of("제품LOT", s -> resolveProductLotNo(s, dtlMap)));
    columns.add(ExcelColumn.of("Lot.No.", ShipmentInspect::getLotNo));
    columns.add(ExcelColumn.of("성적서", ShipmentInspect::getReportFileName));

    try (ExcelStreamWriter<ShipmentInspect> writer = new ExcelStreamWriter<>("출하검사", columns)) {
      writer.writeRows(rows);
      writer.writeTo(out);
    }
  }

  private static String judgeName(ShipmentInspect s) {
    InspectionResult j = s.getJudgeCode();
    return (j != null) ? j.name() : null;
  }

  private static String formatJudgeCode(String code) {
    return (code == null) ? "" : JUDGE_LABEL.getOrDefault(code, code);
  }

  private static Object resolveRollWeight(ShipmentInspect s, Map<Long, ShipmentOrderDetail> dtlMap,
      Map<String, RollWeightSnapshot> pwMap) {
    RollWeightSnapshot pw = lookupPw(s, dtlMap, pwMap);
    // 측정 롤중량이 있으면 그 값을, 없으면 검사 시 입력 중량으로 폴백.
    return (pw != null && pw.rollWeight() != null) ? pw.rollWeight() : s.getWeight();
  }

  private static Object resolveRollBasis(ShipmentInspect s, Map<Long, ShipmentOrderDetail> dtlMap,
      Map<String, RollWeightSnapshot> pwMap) {
    RollWeightSnapshot pw = lookupPw(s, dtlMap, pwMap);
    return (pw == null) ? null : pw.rollBasis();
  }

  private static String resolveProductLotNo(ShipmentInspect s, Map<Long, ShipmentOrderDetail> dtlMap) {
    Long dtlSq = s.getShipDtlSq();
    if (dtlSq == null) {
      return null;
    }
    ShipmentOrderDetail d = dtlMap.get(dtlSq);
    return (d == null) ? null : d.getProductLotNo();
  }

  private static RollWeightSnapshot lookupPw(ShipmentInspect s, Map<Long, ShipmentOrderDetail> dtlMap,
      Map<String, RollWeightSnapshot> pwMap) {
    String productLotNo = resolveProductLotNo(s, dtlMap);
    if (productLotNo == null || productLotNo.isEmpty()) {
      return null;
    }
    return pwMap.get(productLotNo);
  }

  // ######################################################################
  // # 출하검사 — 저장 / 삭제 / 채번
  // ######################################################################

  /**
   * 출하검사 저장. 판정 결과에 따라 부적합(NCR)을 자동 등록/삭제한다.
   */
  @Transactional
  public void saveShipmentInspect(List<QualityDto.ShipInspectSaveReq> reqList) {
    for (QualityDto.ShipInspectSaveReq req : reqList) {
      shipInspectRepository.save(toShipmentInspect(req));
      syncNcrForInspect(req);
    }
  }

  private ShipmentInspect toShipmentInspect(QualityDto.ShipInspectSaveReq req) {
    InspectionResult judge = (req.getJudgeCode() != null)
        ? InspectionResult.valueOf(req.getJudgeCode())
        : null;

    ShipmentInspect.ShipmentInspectBuilder b = ShipmentInspect.builder();

    // 검사 헤더 + 판정
    b.shipDtlSq(req.getShipDtlSq());
    b.lotNo(req.getLotNo());
    b.judgeCode(judge);
    b.inspectQty(req.getInspectQty());
    b.realWeight(req.getRealWeight());
    b.inspectDate(req.getInspectDate());
    b.inspectorNm(req.getInspectorNm());
    b.remark(req.getRemark());

    // 성적서 첨부
    b.reportFilePath(req.getReportFilePath());
    b.reportFileName(req.getReportFileName());

    // 품목 스냅샷
    b.itemCode(req.getItemCode());
    b.itemName(req.getItemName());
    b.basisWeight(req.getBasisWeight());
    b.width(req.getWidth());
    b.length(req.getLength());
    b.weight(req.getWeight());
    b.maxVal(req.getMaxVal());
    b.minVal(req.getMinVal());

    // 검사기준 스냅샷 — 등록 시점 값을 고정해 이후 기준서 변경의 영향을 받지 않게 한다.
    b.inspectItemName(req.getInspectItemName());
    b.inspectCriteria(req.getInspectCriteria());
    b.measureType(req.getMeasureType());
    b.inspectMethod(req.getInspectMethod());
    b.inspectCycle(req.getInspectCycle());
    b.baseVal(req.getBaseVal());

    // 측정값 (시료수 1 → x1만)
    b.sampleCnt(req.getSampleCnt());
    b.x1(req.getX1());

    b.regDt(LocalDateTime.now());
    return b.build();
  }

  private void syncNcrForInspect(QualityDto.ShipInspectSaveReq req) {
    String judge = req.getJudgeCode();
    boolean ok = "OK".equals(judge);
    boolean ng = "NG".equals(judge);

    // 합격/불합격 어느 쪽이든 같은 LOT의 기존 SHIPMENT NCR은 먼저 비운다(불합격→합격 전환 포함).
    if (ok || ng) {
      deleteShipmentNcrByLot(req.getLotNo());
    }
    if (!ng) {
      return;
    }

    Long itemSq = resolveItemSqByCode(req.getItemCode());

    // finderNm 은 NOT NULL. 검사자명이 비면 NCR 저장이 깨져 출하검사 저장까지 롤백되므로 SYSTEM 대체.
    String finder = (req.getInspectorNm() != null && !req.getInspectorNm().isEmpty())
        ? req.getInspectorNm()
        : "SYSTEM";

    LocalDate occurOn = (req.getInspectDate() != null) ? req.getInspectDate() : LocalDate.now();

    Ncr autoNcr = Ncr.builder()
        .occurType(NCR_SHIPMENT)
        .occurPlace("출하검사")
        .occurDate(occurOn)
        .lotNo(req.getLotNo())
        .itemSq(itemSq)
        .badQty(countNgSamples(req))
        .defectType("출하검사 불합격")
        .finderNm(finder)
        .actionStatus(NcrActionStatus.WAIT)
        .regDt(LocalDateTime.now())
        .build();
    ncrRepository.save(autoNcr);
  }

  private void deleteShipmentNcrByLot(String lotNo) {
    if (lotNo == null) {
      return;
    }
    List<Ncr> existing = ncrRepository.findByOccurTypeAndLotNo(NCR_SHIPMENT, lotNo);
    if (!existing.isEmpty()) {
      ncrRepository.deleteAll(existing);
    }
  }

  /**
   * 상/하한치를 벗어난 시료 수. 시료수가 1이므로 x1 하나만 보며, 결과는 최소 1을 보장한다.
   * (기준치가 없거나 시료수 1 특성상 실질적으로 항상 1을 돌려준다.)
   */
  private int countNgSamples(QualityDto.ShipInspectSaveReq req) {
    Double upper = req.getMaxVal();
    Double lower = req.getMinVal();
    Double measured = req.getX1();
    boolean outOfRange = upper != null && lower != null && measured != null
        && (measured < lower || measured > upper);
    int bad = outOfRange ? 1 : 0;
    // 시료수 1 → 불합격 처리 시 불량수량은 최소 1로 보장한다.
    return Math.max(bad, 1);
  }

  /**
   * 출하검사 삭제. 같은 LOT의 SHIPMENT NCR도 함께 정리한다.
   */
  @Transactional
  public void deleteShipmentInspect(List<Long> ids) {
    for (Long id : ids) {
      shipInspectRepository.findById(id)
          .ifPresent(si -> deleteShipmentNcrByLot(si.getLotNo()));
    }
    shipInspectRepository.deleteAllByIdInBatch(ids);
  }

  /**
   * 출하검사 LOT번호 채번 (FIS-yyMMdd-XX). 같은 prefix의 최대값 + 1로 이어 붙인다.
   */
  public String generateShipInspectLotNo(String inspectDate) {
    boolean hasDate = inspectDate != null && !inspectDate.isEmpty();
    LocalDate baseDate = hasDate ? LocalDate.parse(inspectDate) : LocalDate.now();

    String prefix = "FIS-" + baseDate.format(LOT_DATE) + "-";
    int seq = nextSequence(shipInspectRepository.findMaxLotNo(prefix).orElse(null), prefix);
    return prefix + String.format("%02d", seq);
  }

  private static int nextSequence(String maxLot, String prefix) {
    if (maxLot != null) {
      try {
        return Integer.parseInt(maxLot.substring(prefix.length())) + 1;
      } catch (NumberFormatException ignore) {
        // 기존 값 형식이 깨졌으면 1부터 다시 시작한다.
      }
    }
    return 1;
  }

  // ######################################################################
  // # 공용 헬퍼
  // ######################################################################

  private Long resolveItemSq(Long given, String itemCode) {
    if (given != null) {
      return given;
    }
    return resolveItemSqByCode(itemCode);
  }

  private Long resolveItemSqByCode(String itemCode) {
    if (itemCode == null) {
      return null;
    }
    return itemRepository.findByItemCode(itemCode).map(Item::getItemSq).orElse(null);
  }

  private static void requireText(String value, String message) {
    if (value == null || value.isBlank()) {
      throw new IllegalArgumentException(message);
    }
  }

  // 빈 문자열은 검색 조건에서 빠지도록 null 로 환원한다.
  private static String emptyToNull(String value) {
    return (value != null && !value.isEmpty()) ? value : null;
  }

  private List<ShipmentInspect> searchRows(QualityDto.ShipInspectReq req) {
    return shipInspectRepository.findBySearch(
        req.getDateFrom(), req.getDateTo(),
        emptyToNull(req.getItemCode()), emptyToNull(req.getItemName()),
        emptyToNull(req.getLotNo()), emptyToNull(req.getKeyword()));
  }

  private Sort resolveShipInspectSort(String field, String direction) {
    if (field == null || !SORTABLE_FIELDS.contains(field)) {
      return Sort.by(Sort.Order.desc("inspectDate"), Sort.Order.desc("shipInspectSq"));
    }
    return "ASC".equalsIgnoreCase(direction)
        ? Sort.by(Sort.Order.asc(field))
        : Sort.by(Sort.Order.desc(field));
  }

  private List<QualityDto.ShipInspectRes> mapRows(List<ShipmentInspect> rows,
      Map<Long, ShipmentOrderDetail> dtlMap, Map<Long, ShipmentPlan> planMap,
      Map<String, RollWeightSnapshot> pwMap) {
    List<QualityDto.ShipInspectRes> mapped = new ArrayList<>(rows.size());
    for (ShipmentInspect row : rows) {
      mapped.add(toShipInspectRes(row, dtlMap, planMap, pwMap));
    }
    return mapped;
  }

  private Map<Long, ShipmentOrderDetail> loadDetailMap(Collection<ShipmentInspect> rows) {
    Set<Long> dtlSqs = new LinkedHashSet<>();
    for (ShipmentInspect row : rows) {
      if (row.getShipDtlSq() != null) {
        dtlSqs.add(row.getShipDtlSq());
      }
    }
    if (dtlSqs.isEmpty()) {
      return Map.of();
    }
    Map<Long, ShipmentOrderDetail> map = new HashMap<>();
    for (ShipmentOrderDetail dtl : shipOrderDetailRepository.findAllByIdWithOrder(new ArrayList<>(dtlSqs))) {
      map.put(dtl.getShipDtlSq(), dtl);
    }
    return map;
  }

  private Map<Long, ShipmentPlan> loadPlanMap(Collection<ShipmentOrderDetail> dtls) {
    Set<Long> planSqs = new LinkedHashSet<>();
    for (ShipmentOrderDetail dtl : dtls) {
      if (dtl.getPlanSq() != null) {
        planSqs.add(dtl.getPlanSq());
      }
    }
    if (planSqs.isEmpty()) {
      return Map.of();
    }
    Map<Long, ShipmentPlan> map = new HashMap<>();
    for (ShipmentPlan plan : planRepository.findAllById(new ArrayList<>(planSqs))) {
      map.put(plan.getPlanSq(), plan);
    }
    return map;
  }

  private int maxSampleCnt(Collection<ShipmentInspect> rows) {
    return rows.stream()
        .map(ShipmentInspect::getSampleCnt)
        .filter(Objects::nonNull)
        .mapToInt(Integer::intValue)
        .max()
        .orElse(0);
  }

  private Long deriveCustomerSq(ShipmentPlan plan) {
    if (plan.getCustomerSq() != null) {
      return plan.getCustomerSq();
    }
    if (plan.getSalesOrderDtlSq() == null) {
      return null;
    }
    SalesOrderDetail sod = salesOrderDetailRepository.findById(plan.getSalesOrderDtlSq()).orElse(null);
    if (sod == null || sod.getSalesOrder() == null) {
      return null;
    }
    return sod.getSalesOrder().getCustomerSq();
  }

  // ---- 롤중량 스냅샷 (work_result_dtl_tb 기반) ----

  /**
   * 출하지시 상세 모음에서 productLotNo를 모아 RollWeightSnapshot Map을 만든다.
   */
  private Map<String, RollWeightSnapshot> buildPwMapFromDtl(Collection<ShipmentOrderDetail> dtls) {
    Set<String> lotNos = new LinkedHashSet<>();
    for (ShipmentOrderDetail dtl : dtls) {
      String lot = dtl.getProductLotNo();
      if (lot != null && !lot.isEmpty()) {
        lotNos.add(lot);
      }
    }
    return buildRollWeightSnapshotMap(lotNos);
  }

  /**
   * work_result_dtl_tb 의 gross_weight/real_basis_weight 로 LOT별 스냅샷 Map 구성.
   */
  private Map<String, RollWeightSnapshot> buildRollWeightSnapshotMap(Collection<String> lotNos) {
    if (lotNos == null || lotNos.isEmpty()) {
      return Map.of();
    }
    // 호출처가 이미 LinkedHashSet으로 중복을 제거해 넘기지만, List 등으로 들어와도 안전하도록 한 번 더 추린다.
    Set<String> keys = new LinkedHashSet<>();
    for (String lot : lotNos) {
      if (lot != null && !lot.isEmpty()) {
        keys.add(lot);
      }
    }
    if (keys.isEmpty()) {
      return Map.of();
    }

    Map<String, RollWeightSnapshot> out = new HashMap<>();
    for (WorkResultDetail d : workResultDetailRepository.findByLotNoIn(new ArrayList<>(keys))) {
      String lot = d.getLotNo();
      // 같은 LOT가 여러 건이면 가장 먼저 만난 한 건만 채택한다.
      if (lot != null && !out.containsKey(lot)) {
        out.put(lot, new RollWeightSnapshot(d.getGrossWeight(), d.getRealBasisWeight()));
      }
    }
    return out;
  }

  /**
   * 단건(detail) 경로 폴백 — pwMap이 없을 때 LOT 하나만 직접 조회.
   */
  private RollWeightSnapshot lookupRollWeightSnapshot(String productLotNo) {
    if (productLotNo == null || productLotNo.isEmpty()) {
      return null;
    }
    return workResultDetailRepository.findFirstByLotNo(productLotNo)
        .map(d -> new RollWeightSnapshot(d.getGrossWeight(), d.getRealBasisWeight()))
        .orElse(null);
  }

  private void applyRollSnapshot(String lotNo, Map<String, RollWeightSnapshot> pwMap,
      Consumer<Double> weightSetter, Consumer<Double> basisSetter) {
    if (lotNo == null) {
      return;
    }
    RollWeightSnapshot pw = pwMap.get(lotNo);
    if (pw != null) {
      weightSetter.accept(pw.rollWeight());
      basisSetter.accept(pw.rollBasis());
    }
  }

  // ---- 출하검사 응답 매핑 ----

  private QualityDto.ShipInspectRes toShipInspectRes(ShipmentInspect s) {
    return toShipInspectRes(s, null, null, null);
  }

  private QualityDto.ShipInspectRes toShipInspectRes(ShipmentInspect s, Map<Long, ShipmentOrderDetail> dtlMap,
      Map<Long, ShipmentPlan> planMap, Map<String, RollWeightSnapshot> pwMap) {
    QualityDto.ShipInspectRes res = new QualityDto.ShipInspectRes();
    copyInspectColumns(s, res);

    if (s.getShipDtlSq() == null) {
      return res;
    }

    ShipmentOrderDetail dtl = (dtlMap != null)
        ? dtlMap.get(s.getShipDtlSq())
        : shipOrderDetailRepository.findById(s.getShipDtlSq()).orElse(null);
    if (dtl == null) {
      return res;
    }

    applyDetailColumns(res, dtl, planMap);
    applyRollMeasurements(res, dtl.getProductLotNo(), pwMap);
    return res;
  }

  // ShipmentInspect 엔티티 자체 컬럼을 응답 DTO로 그대로 옮긴다 (출하지시/계획 연동값 제외).
  private static void copyInspectColumns(ShipmentInspect s, QualityDto.ShipInspectRes res) {
    // 키 + 검사 헤더
    res.setShipInspectSq(s.getShipInspectSq());
    res.setShipDtlSq(s.getShipDtlSq());
    res.setLotNo(s.getLotNo());
    res.setInspectDate(s.getInspectDate());
    res.setInspectorNm(s.getInspectorNm());
    res.setInspectQty(s.getInspectQty());
    res.setRealWeight(s.getRealWeight());
    res.setRemark(s.getRemark());

    InspectionResult judge = s.getJudgeCode();
    res.setJudgeCode(judge != null ? judge.name() : null);

    // 성적서
    res.setReportFilePath(s.getReportFilePath());
    res.setReportFileName(s.getReportFileName());

    // 품목 스냅샷
    res.setItemCode(s.getItemCode());
    res.setItemName(s.getItemName());
    res.setBasisWeight(s.getBasisWeight());
    res.setWidth(s.getWidth());
    res.setLength(s.getLength());
    res.setWeight(s.getWeight());
    res.setMaxVal(s.getMaxVal());
    res.setMinVal(s.getMinVal());

    // 검사기준 스냅샷
    res.setInspectItemName(s.getInspectItemName());
    res.setInspectCriteria(s.getInspectCriteria());
    res.setMeasureType(s.getMeasureType());
    res.setInspectMethod(s.getInspectMethod());
    res.setInspectCycle(s.getInspectCycle());
    res.setBaseVal(s.getBaseVal());

    // 측정값
    res.setSampleCnt(s.getSampleCnt());
    res.setX1(s.getX1());
  }

  // 출하지시상세/주문/계획 연동 값을 채운다.
  private void applyDetailColumns(QualityDto.ShipInspectRes res, ShipmentOrderDetail dtl,
      Map<Long, ShipmentPlan> planMap) {
    res.setCustomerName(dtl.getCustomerName());
    res.setItemSq(dtl.getItemSq());
    res.setPlanQty(dtl.getOrderQty());
    res.setProductLotNo(dtl.getProductLotNo());

    ShipmentOrder order = dtl.getShipmentOrder();
    if (order != null) {
      res.setDestination(order.getDestination());
      res.setCustomerSq(order.getCustomerSq());
    }
    if (dtl.getPlanSq() != null) {
      ShipmentPlan plan = (planMap != null)
          ? planMap.get(dtl.getPlanSq())
          : planRepository.findById(dtl.getPlanSq()).orElse(null);
      if (plan != null) {
        res.setShipPlanLotNo(plan.getLotNo());
      }
    }
  }

  // 생산일보 측정 롤중량/평량. 목록·페이징은 pwMap, 단건은 직접 조회로 폴백.
  private void applyRollMeasurements(QualityDto.ShipInspectRes res, String productLotNo,
      Map<String, RollWeightSnapshot> pwMap) {
    if (productLotNo == null || productLotNo.isEmpty()) {
      return;
    }
    RollWeightSnapshot pw = (pwMap != null) ? pwMap.get(productLotNo) : lookupRollWeightSnapshot(productLotNo);
    if (pw != null) {
      res.setRollWeight(pw.rollWeight());
      res.setRollBasis(pw.rollBasis());
    }
  }
}
