package com.mes.domain.production.service;

import com.mes.domain.item.repository.ItemRepository;
import com.mes.domain.production.dto.WorkOrderDto;
import com.mes.domain.production.entity.WorkOrder;
import com.mes.domain.production.entity.WorkOrderDetail;
import com.mes.domain.production.repository.ProductionWorkOrderDetailRepository;
import com.mes.domain.production.repository.ProductionWorkOrderRepository;
import com.mes.global.config.CacheConfig;
import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service("productionWorkOrderService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkOrderService {

  private static final DateTimeFormatter MONTH_KEY = DateTimeFormatter.ofPattern("yyyyMM");

  private final ProductionWorkOrderRepository workOrderRepo;
  private final ProductionWorkOrderDetailRepository workOrderDetailRepo;
  private final ItemRepository itemRepo;
  private final ProductionMaterialInputService materialInputService;

  // =============================== 조회 ===============================

  /**
   * 작업지시 목록을 페이지 단위로 반환한다.
   * 정렬 순서(workOrderDate DESC, workOrderSq DESC)는 Repository 의 ORDER BY 절이 결정한다.
   */
  public com.mes.global.response.PageResponse<WorkOrderDto.Res> getListPaged(WorkOrderDto.SearchReq req) {
    Integer reqPage = req.getPage();
    Integer reqSize = req.getSize();
    int page = (reqPage != null && reqPage >= 0) ? reqPage : 0;
    int size = (reqSize != null && reqSize > 0) ? reqSize : 50;

    var pageable = org.springframework.data.domain.PageRequest.of(page, size);

    org.springframework.data.domain.Page<WorkOrder> pageResult =
        workOrderRepo.findBySearchConditionPaged(
            req.getDateFrom(),
            req.getDateTo(),
            req.getLineSq(),
            blankToNull(req.getLineName()),
            blankToNull(req.getItemCode()),
            blankToNull(req.getItemName()),
            pageable);

    List<WorkOrder> workOrders = pageResult.getContent();
    List<WorkOrderDto.Res> content = workOrders.isEmpty() ? List.of() : buildResList(workOrders);
    return com.mes.global.response.PageResponse.of(content, page, size, pageResult.getTotalElements());
  }

  /**
   * 비페이징 작업지시 목록. 상세까지 fetch join 하여 N+1 을 피한다.
   * 시작일/종료일은 한쪽만 전달되어도 쿼리 내부의 IS NULL 조건으로 흡수된다.
   *
   * <p>결과는 Caffeine 캐시(TTL 60초)에 담긴다. 여러 운영자가 동일 라인을 30초 주기로 폴링하더라도
   * 백엔드 실제 부하는 1/N 수준으로 떨어진다. SearchReq 는 @Getter/@Setter 만 갖고 있어 hashCode 가
   * identity 기반이므로, 캐시 키는 SpEL 로 필드를 직접 이어 붙여 만든다.
   */
  @Cacheable(value = CacheConfig.WORK_ORDER_LIST,
      key = "T(java.util.Objects).toString(#req.dateFrom) + '|' + " +
            "T(java.util.Objects).toString(#req.dateTo) + '|' + " +
            "T(java.util.Objects).toString(#req.lineSq) + '|' + " +
            "T(java.util.Objects).toString(#req.lineName)")
  public List<WorkOrderDto.Res> getList(WorkOrderDto.SearchReq req) {
    List<WorkOrder> workOrders = workOrderRepo.findBySearchCondition(
        req.getDateFrom(), req.getDateTo(), req.getLineSq(), blankToNull(req.getLineName()));
    return workOrders.isEmpty() ? List.of() : buildResList(workOrders);
  }

  /**
   * 원소재 투입분석 상세 화면용 조회. 지정한 라인/날짜에 대해 지시일·시작일·종료일 중
   * 어느 하나라도 해당 날짜에 걸리는 LOT 을 모두 수집한다.
   */
  public List<WorkOrderDto.Res> getListByLineAndDateAcrossLifecycle(WorkOrderDto.LineDateSearchReq req) {
    boolean missingLine = req.getLineName() == null || req.getLineName().isEmpty();
    if (missingLine || req.getDate() == null) {
      return List.of();
    }
    LocalDate date = req.getDate();
    LocalDateTime dayStart = date.atStartOfDay();
    LocalDateTime dayEnd = date.plusDays(1).atStartOfDay();
    List<WorkOrder> workOrders = workOrderRepo.findByLineAndDateAcrossLifecycle(
        req.getLineName(), date, dayStart, dayEnd);
    return workOrders.isEmpty() ? List.of() : buildResList(workOrders);
  }

  // 페이징/비페이징 조회가 공통으로 사용하는 엔티티 → DTO 변환부.
  private List<WorkOrderDto.Res> buildResList(List<WorkOrder> workOrders) {
    Map<Long, com.mes.domain.item.entity.Item> itemById = loadItemMap(workOrders);
    return workOrders.stream()
        .map(wo -> toRes(wo, itemById))
        .collect(Collectors.toList());
  }

  // 마스터와 상세에서 참조하는 품목 PK 를 한 번에 모아 스펙까지 포함해 적재한다.
  private Map<Long, com.mes.domain.item.entity.Item> loadItemMap(List<WorkOrder> workOrders) {
    java.util.Set<Long> itemSqs = new java.util.HashSet<>();
    for (WorkOrder wo : workOrders) {
      Long masterItemSq = wo.getItemSq();
      if (masterItemSq != null) {
        itemSqs.add(masterItemSq);
      }
      for (WorkOrderDetail d : wo.getDetails()) {
        Long detailItemSq = d.getItemSq();
        if (detailItemSq != null) {
          itemSqs.add(detailItemSq);
        }
      }
    }
    if (itemSqs.isEmpty()) {
      return Map.of();
    }
    return itemRepo.findAllByIdWithSpecs(itemSqs).stream()
        .collect(Collectors.toMap(com.mes.domain.item.entity.Item::getItemSq, Function.identity()));
  }

  private WorkOrderDto.Res toRes(WorkOrder wo, Map<Long, com.mes.domain.item.entity.Item> itemById) {
    WorkOrderDto.Res res = new WorkOrderDto.Res();

    // --- 작업지시 마스터 본문 ---
    res.setWorkOrderSq(wo.getWorkOrderSq());
    res.setWorkOrderDate(wo.getWorkOrderDate());
    res.setLineSq(wo.getLineSq());
    res.setLineName(wo.getLineName());
    res.setPriority(wo.getPriority());
    res.setManageWeight(wo.getManageWeight());
    res.setPlcWeight(wo.getPlcWeight());
    res.setTargetQty(wo.getTargetQty());
    res.setProdSpeed(wo.getProdSpeed());
    res.setTotalWidth(wo.getTotalWidth());
    res.setTotalWeight(wo.getTotalWeight());
    res.setEffectiveWidth(wo.getEffectiveWidth());
    res.setEstimatedProductionTime(wo.getEstimatedProductionTime());
    res.setWorkStatus(wo.getWorkStatus());
    res.setLotNo(wo.getLotNo());
    res.setProductionLotNo(wo.getProductionLotNo());
    res.setRecipe(wo.getRecipe());
    res.setRemark(wo.getRemark());
    res.setWorkStartTime(wo.getWorkStartTime());
    res.setWorkEndTime(wo.getWorkEndTime());
    res.setRegDt(wo.getRegDt());

    // --- 품목 마스터 정보 병합 ---
    com.mes.domain.item.entity.Item item = itemById.get(wo.getItemSq());
    if (item != null) {
      res.setItemSq(item.getItemSq());
      res.setItemCode(item.getItemCode());
      res.setItemName(item.getItemName());
      res.setItemSpec(item.getSpec());
      res.setItemType(item.getItemType());
      res.setWidth(item.getEffectiveWidth());
      res.setLength(item.getEffectiveLength());
    }

    // 평량 폴백: 지시 평량이 비었거나 0 이면 품목 마스터 평량을 대신 채운다.
    Double woBasisWeight = wo.getBasisWeight();
    boolean needFallback = (woBasisWeight == null || woBasisWeight == 0.0)
        && item != null && item.getBasisWeight() != null;
    res.setBasisWeight(needFallback ? item.getBasisWeight() : woBasisWeight);

    // --- 상세(Grid) ---
    res.setDetails(wo.getDetails().stream()
        .map(d -> toDetailRes(d, itemById))
        .collect(Collectors.toList()));
    return res;
  }

  private WorkOrderDto.DetailRes toDetailRes(WorkOrderDetail d, Map<Long, com.mes.domain.item.entity.Item> itemById) {
    WorkOrderDto.DetailRes dRes = new WorkOrderDto.DetailRes();
    dRes.setWoDtlSq(d.getWoDtlSq());
    dRes.setLotNo(d.getLotNo());
    dRes.setItemSq(d.getItemSq());
    dRes.setWidth(d.getWidth());
    dRes.setLength(d.getLength());
    dRes.setEffectiveWidth(d.getEffectiveWidth());
    dRes.setOrderQty(d.getOrderQty());

    com.mes.domain.item.entity.Item dtlItem = itemById.get(d.getItemSq());
    if (dtlItem != null) {
      dRes.setItemCode(dtlItem.getItemCode());
      dRes.setItemName(dtlItem.getItemName());
    }
    return dRes;
  }

  // =============================== 저장 ===============================

  /**
   * 작업지시 저장. workOrderSq 유무로 신규 등록과 수정을 한 진입점에서 처리한다.
   */
  @Transactional
  @CacheEvict(value = CacheConfig.WORK_ORDER_LIST, allEntries = true)
  public void save(WorkOrderDto.SaveReq req) {
    boolean isNew = req.getWorkOrderSq() == null;

    WorkOrder workOrder;
    boolean lineChanged;
    if (isNew) {
      Long itemSq = resolveItemSq(req.getItemSq(), req.getItemCode());
      workOrder = createWorkOrder(req, itemSq);
      lineChanged = false;
    } else {
      workOrder = loadAndUpdateWorkOrder(req);
      // updateInfo 가 라인 값을 덮어쓰기 전에 변경 여부를 먼저 판정해 둔다.
      lineChanged = !Objects.equals(workOrder.getLineSq(), req.getLineSq())
          || !Objects.equals(workOrder.getLineName(), req.getLineName());
      applyMasterUpdate(workOrder, req);
      workOrder.getDetails().clear();
      workOrderRepo.flush();
    }

    rebuildDetails(workOrder, req, lineChanged);
    workOrderRepo.save(workOrder);
  }

  private WorkOrder createWorkOrder(WorkOrderDto.SaveReq req, Long itemSq) {
    double plcWeight = req.getPlcWeight() != null ? req.getPlcWeight() : 0.0;
    return WorkOrder.builder()
        .workOrderDate(req.getWorkOrderDate())
        .lineSq(req.getLineSq())
        .lineName(req.getLineName())
        .priority(req.getPriority())
        .itemSq(itemSq)
        .recipeSq(req.getRecipeSq())
        .targetQty(req.getTargetQty())
        .prodSpeed(req.getProdSpeed())
        .basisWeight(req.getBasisWeight())
        .manageWeight(req.getManageWeight())
        .plcWeight(plcWeight)
        .totalWidth(req.getTotalWidth())
        .totalWeight(req.getTotalWeight())
        .effectiveWidth(req.getEffectiveWidth())
        .estimatedProductionTime(req.getEstimatedProductionTime())
        .lotNo(req.getLotNo())
        .recipe(req.getRecipe())
        .workStatus("PENDING")
        .remark(req.getRemark())
        .useYn(true)
        .build();
  }

  private WorkOrder loadAndUpdateWorkOrder(WorkOrderDto.SaveReq req) {
    WorkOrder workOrder = workOrderRepo.findById(req.getWorkOrderSq())
        .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND));
    // PENDING(대기) 이외 상태로 진행된 지시는 수정 대상에서 제외한다.
    if (!"PENDING".equals(workOrder.getWorkStatus())) {
      throw new CustomException(ErrorCode.COMMON_BAD_REQUEST, "대기 상태인 지시만 수정 가능합니다.");
    }
    return workOrder;
  }

  // 일단 기존 lotNo 기준으로 마스터를 갱신한다. 라인이 변경된 경우엔 이후 상세 재생성 단계에서
  // 새 prefix 로 lotNo 를 다시 발급받는다.
  private void applyMasterUpdate(WorkOrder workOrder, WorkOrderDto.SaveReq req) {
    workOrder.updateInfo(req.getWorkOrderDate(), req.getLineSq(), req.getLineName(), req.getPriority(),
        req.getTargetQty(), req.getProdSpeed(), req.getBasisWeight(), req.getManageWeight(),
        req.getPlcWeight(),
        req.getTotalWidth(), req.getTotalWeight(), req.getEffectiveWidth(),
        req.getEstimatedProductionTime(), req.getLotNo(), req.getRecipe(),
        req.getRemark());
  }

  // 상세(Grid) 행을 다시 생성하면서 LOT 번호를 채번한다.
  private void rebuildDetails(WorkOrder workOrder, WorkOrderDto.SaveReq req, boolean lineChanged) {
    List<WorkOrderDto.DetailDto> details = req.getDetails();
    if (details == null || details.isEmpty()) {
      return;
    }

    // 예시 형태: P1-202605-, C1-202605-
    String prefix = buildLotPrefix(req.getLineName(), req.getLineSq(), req.getWorkOrderDate());
    long startSeq = workOrderDetailRepo.countByLotPrefix(prefix) + 1;
    AtomicLong seq = new AtomicLong(startSeq);

    // 컨벤션상 마스터 lotNo == 첫 상세 lotNo 이므로, 라인이 바뀐 수정 건은 마스터도 새 prefix 첫 슬롯으로 재발급한다.
    boolean reissueMaster = req.getWorkOrderSq() != null && lineChanged;
    if (reissueMaster) {
      workOrder.assignLotNo(prefix + String.format("%03d", seq.get()));
    }

    for (WorkOrderDto.DetailDto d : details) {
      WorkOrderDetail detail = WorkOrderDetail.builder()
          .itemSq(resolveDetailItemSq(d))
          .lotNo(nextDetailLotNo(d, prefix, seq, lineChanged))
          .orderQty(d.getOrderQty())
          .width(d.getWidth())
          .length(d.getLength())
          .effectiveWidth(d.getEffectiveWidth())
          .remark(d.getRemark())
          .build();
      workOrder.addDetail(detail);
    }
  }

  private Long resolveDetailItemSq(WorkOrderDto.DetailDto d) {
    Long detailItemSq = d.getItemSq();
    if (detailItemSq != null) {
      return detailItemSq;
    }
    String itemCode = d.getItemCode();
    if (itemCode != null && !itemCode.isBlank()) {
      detailItemSq = itemRepo.findByItemCode(itemCode)
          .map(com.mes.domain.item.entity.Item::getItemSq).orElse(null);
    }
    if (detailItemSq == null) {
      throw new CustomException(ErrorCode.COMMON_BAD_REQUEST,
          "상세 품목의 itemSq를 확인할 수 없습니다 (itemCode=" + d.getItemCode() + ")");
    }
    return detailItemSq;
  }

  // 라인이 변경된 경우엔 클라이언트가 보낸 lotNo 를 무시하고 항상 새 prefix 로 채번한다.
  private String nextDetailLotNo(WorkOrderDto.DetailDto d, String prefix, AtomicLong seq, boolean lineChanged) {
    String clientLot = d.getLotNo();
    boolean keepClientLot = !lineChanged
        && clientLot != null && !clientLot.isBlank()
        && clientLot.startsWith(prefix);
    if (!keepClientLot) {
      return prefix + String.format("%03d", seq.getAndIncrement());
    }

    String lotNo = clientLot;
    while (workOrderDetailRepo.existsByLotNo(lotNo)) {
      // 말미 일련번호를 분리해 중복이 해소될 때까지 1씩 키운다.
      int lastDash = lotNo.lastIndexOf('-');
      String lotPrefix = lotNo.substring(0, lastDash + 1);
      int tail = Integer.parseInt(lotNo.substring(lastDash + 1)) + 1;
      lotNo = lotPrefix + String.format("%02d", tail);
    }
    return lotNo;
  }

  // =============================== 상태 / 삭제 ===============================

  /**
   * 작업지시의 진행 상태를 갱신한다.
   */
  @Transactional
  @CacheEvict(value = CacheConfig.WORK_ORDER_LIST, allEntries = true)
  public void updateStatus(WorkOrderDto.StatusUpdateReq req) {
    WorkOrder workOrder = workOrderRepo.findById(req.getWorkOrderSq())
        .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND));

    String targetStatus = req.getWorkStatus();

    // PENDING 으로 되돌리는 것은 작업 취소를 뜻한다. 생산 LotNo 등을 비우고 바로 종료한다.
    if ("PENDING".equals(targetStatus)) {
      workOrder.resetToPending();
      return;
    }

    // IN_PROGRESS 로 처음 진입할 때 생산 Lot-No(PR-yyyyMM-seq)를 채번한다.
    if ("IN_PROGRESS".equals(targetStatus) && workOrder.getProductionLotNo() == null) {
      String prefix = "PR-" + LocalDate.now().format(MONTH_KEY) + "-";
      long count = workOrderRepo.countByProductionLotNoPrefix(prefix);
      workOrder.assignProductionLotNo(prefix + String.format("%03d", count + 1));
    }

    workOrder.updateStatus(targetStatus);

    // COMPLETED 전환 시 PLC raw 를 호기별로 합산해 자재를 자동 차감한다(멱등).
    // saveResult 경로와는 무관하지만, mes_op 가 어떤 경로로 들어오더라도 차감은 정확히 1회만 발생한다.
    if ("COMPLETED".equals(targetStatus)) {
      try {
        materialInputService.confirmPlcAutoConsume(req.getWorkOrderSq());
      } catch (Exception e) {
        // PLC 데이터 부재나 매핑 실패가 있어도 상태 전환 자체는 그대로 확정한다.
        // 단, 원인 추적이 가능하도록 경고 로그는 남긴다.
        log.warn("상태 전환(COMPLETED) 중 PLC 자동 차감 실패 (workOrderSq={}) — 전환은 그대로 확정: {}",
            req.getWorkOrderSq(), e.getMessage(), e);
      }
    }
  }

  /**
   * 전달된 PK 들에 해당하는 작업지시를 일괄 삭제한다.
   */
  @Transactional
  @CacheEvict(value = CacheConfig.WORK_ORDER_LIST, allEntries = true)
  public void delete(WorkOrderDto.DeleteReq req) {
    List<Long> ids = req.getWorkOrderIds();
    if (ids == null || ids.isEmpty()) {
      return;
    }
    workOrderRepo.deleteAllById(ids);
  }

  // =============================== 보조 ===============================

  // LOT prefix 조립: lineName 이 있으면 그대로 쓰고, 없으면 "P{lineSq}" 로 대체한다.
  private String buildLotPrefix(String lineName, Long lineSq, LocalDate workOrderDate) {
    boolean hasLineName = lineName != null && !lineName.isBlank();
    String linePart = hasLineName ? lineName : "P" + (lineSq != null ? lineSq : 0);
    return linePart + "-" + workOrderDate.format(MONTH_KEY) + "-";
  }

  private Long resolveItemSq(Long itemSq, String itemCode) {
    if (itemSq != null) {
      return itemSq;
    }
    if (itemCode == null) {
      return null;
    }
    return itemRepo.findByItemCode(itemCode)
        .map(com.mes.domain.item.entity.Item::getItemSq).orElse(null);
  }

  private static String blankToNull(String value) {
    return (value != null && !value.isEmpty()) ? value : null;
  }
}
