package com.mes.domain.production.service;

import com.mes.domain.production.dto.DowntimeDto;
import com.mes.domain.production.entity.Downtime;
import com.mes.domain.production.entity.WorkOrder;
import com.mes.domain.production.entity.WorkResult;
import com.mes.domain.production.repository.DowntimeRepository;
import com.mes.domain.production.repository.ProductionWorkOrderRepository;
import com.mes.domain.production.repository.ProductionWorkResultRepository;
import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;
import com.mes.global.support.EntityIndex;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DowntimeService {

  private final DowntimeRepository downtimeRepo;
  private final ProductionWorkOrderRepository workOrderRepo;
  private final ProductionWorkResultRepository workResultRepo;

  /**
   * 비가동 등록과 수정(사유 추가 또는 종료 처리)을 하나의 진입점에서 처리한다.
   *
   * <p>작업자앱은 유형을 고르는 즉시 신규 행을 만들어 PK 를 확보해 두고, 이후 사유를 입력할 때
   * 동일 PK 로 다시 호출하여 같은 행을 갱신한다. 반환값은 저장/갱신된 Downtime 의 PK 다.
   */
  @Transactional
  public Long save(DowntimeDto.SaveReq req) {
    boolean isUpdate = req.getDowntimeSq() != null;
    return isUpdate ? updateExisting(req) : createNew(req);
  }

  // [신규] 비가동 시작 행 생성. 유형만 고른 단계라도 startDt + downtimeCode 만으로 만들어진다.
  // 동일 엔드포인트가 수정 요청(downtimeSq + 일부 필드)도 수용하므로 DTO 에 @NotNull 을 걸지 않고,
  // 신규 분기 안에서만 필수 항목을 직접 검증한다.
  private Long createNew(DowntimeDto.SaveReq req) {
    requireNotNull(req.getWorkOrderSq(), "작업지시는 필수 입력값입니다.");
    requireNotNull(req.getWorkDate(), "작업일자는 필수 입력값입니다.");
    requireNotNull(req.getLineSq(), "라인은 필수 입력값입니다.");
    requireNotNull(req.getStartDt(), "시작일시는 필수 입력값입니다.");

    Downtime downtime = Downtime.builder()
        .workOrderSq(req.getWorkOrderSq())
        .workDate(req.getWorkDate())
        .lineSq(req.getLineSq())
        .startDt(req.getStartDt())
        .endDt(req.getEndDt())
        .downtimeCode(req.getDowntimeCode())
        .faultEquipment(req.getFaultEquipment())
        .actionContent(req.getActionContent())
        .actionResponsible(req.getActionResponsible())
        .remark(req.getRemark())
        .build();

    if (req.getEndDt() != null) {
      downtime.endDowntime(req.getEndDt(), req.getRemark());
    }

    Downtime saved = downtimeRepo.save(downtime);
    return saved.getDowntimeSq();
  }

  // [수정] 기존 비가동 행에 사유 필드를 채워 넣거나 종료 시각을 기록한다.
  private Long updateExisting(DowntimeDto.SaveReq req) {
    Downtime downtime = downtimeRepo.findById(req.getDowntimeSq())
        .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND));

    downtime.updateDetails(
        req.getFaultEquipment(),
        req.getActionContent(),
        req.getActionResponsible(),
        req.getRemark());

    if (req.getEndDt() != null) {
      downtime.endDowntime(req.getEndDt(), req.getRemark());
    }
    return downtime.getDowntimeSq();
  }

  private void requireNotNull(Object value, String message) {
    if (value == null) {
      throw new CustomException(ErrorCode.COMMON_INVALID_PARAMETER, message);
    }
  }

  /**
   * 비가동 목록을 조회한다.
   *
   * <p>실제 비가동 행은 그대로 반환하고, 비가동 기록이 없는 진행중/완료 작업에 대해서는
   * downtimeMin=0 인 합성 행을 추가로 붙인다. 합성 판단 기준을 WorkResult 가 아니라
   * WorkOrder.workStartTime != null 로 두어야, 작업완료 이전(WorkResult 미생성)의 진행중 작업도
   * 화면에 노출된다.
   */
  public List<DowntimeDto.Res> getList(DowntimeDto.SearchReq req) {
    Long filterWoSq = req.getWorkOrderSq();
    boolean singleWorkOrder = filterWoSq != null;

    List<Downtime> rows = singleWorkOrder
        ? downtimeRepo.findByWorkOrderSq(filterWoSq)
        : downtimeRepo.findAll();

    Set<Long> referencedWoSqs = rows.stream()
        .map(Downtime::getWorkOrderSq)
        .filter(Objects::nonNull)
        .collect(Collectors.toSet());

    Map<Long, WorkOrder> woMap = loadWorkOrders(referencedWoSqs);
    Map<Long, WorkResult> wrMap = loadWorkResults(referencedWoSqs);

    LocalDateTime now = LocalDateTime.now();
    List<DowntimeDto.Res> result = rows.stream()
        .map(d -> mapDowntime(d, woMap, wrMap, now))
        .collect(Collectors.toList());

    // 작업지시를 지정한 단건 조회에서는 합성 행을 붙이지 않는다.
    if (!singleWorkOrder) {
      appendSyntheticRows(result, referencedWoSqs);
    }
    return result;
  }

  private Map<Long, WorkOrder> loadWorkOrders(Set<Long> woSqs) {
    return EntityIndex.byId(List.copyOf(woSqs), workOrderRepo::findAllById, WorkOrder::getWorkOrderSq);
  }

  private Map<Long, WorkResult> loadWorkResults(Set<Long> woSqs) {
    if (woSqs.isEmpty()) {
      return Map.of();
    }
    // 같은 작업지시에 여러 WorkResult 가 있으면 먼저 만난 행을 유지한다.
    return workResultRepo.findByWorkOrderSqIn(woSqs).stream()
        .filter(r -> r.getWorkOrderSq() != null)
        .collect(Collectors.toMap(WorkResult::getWorkOrderSq, Function.identity(), (first, dup) -> first));
  }

  private DowntimeDto.Res mapDowntime(Downtime d, Map<Long, WorkOrder> woMap,
                                      Map<Long, WorkResult> wrMap, LocalDateTime now) {
    DowntimeDto.Res res = new DowntimeDto.Res();
    res.setDowntimeSq(d.getDowntimeSq());
    res.setWorkOrderSq(d.getWorkOrderSq());
    res.setWorkDate(d.getWorkDate());
    res.setLineSq(d.getLineSq());
    res.setStartDt(d.getStartDt());
    res.setEndDt(d.getEndDt());
    res.setDowntimeMin(resolveOngoingMinutes(d, now));
    res.setDowntimeCode(d.getDowntimeCode());
    res.setFaultEquipment(d.getFaultEquipment());
    res.setActionContent(d.getActionContent());
    res.setActionResponsible(d.getActionResponsible());
    res.setRemark(d.getRemark());

    Long woSq = d.getWorkOrderSq();
    if (woSq != null) {
      enrichTimes(res, woMap.get(woSq), wrMap.get(woSq));
    }
    return res;
  }

  // 종료(endDt)가 기록되지 않은 비가동은 downtime_min 이 0/null 인 채로 남는다.
  // 화면의 누적 비가동시간이 0 으로 보이지 않도록, 응답 단계에서 startDt~현재 구간으로 환산해 채운다.
  private Integer resolveOngoingMinutes(Downtime d, LocalDateTime now) {
    Integer dm = d.getDowntimeMin();
    boolean unfinished = (dm == null || dm == 0) && d.getStartDt() != null && d.getEndDt() == null;
    if (!unfinished) {
      return dm;
    }
    long mins = ChronoUnit.MINUTES.between(d.getStartDt(), now);
    return (int) Math.max(0, mins);
  }

  // 라인명과 시작/종료 시각을 보강한다. WorkResult 값은 WorkOrder 쪽 시각이 비어 있을 때만 fallback 으로 쓴다.
  private void enrichTimes(DowntimeDto.Res res, WorkOrder wo, WorkResult wr) {
    if (wo != null) {
      res.setLineName(wo.getLineName());
      if (wo.getWorkStartTime() != null) {
        res.setWorkStartTime(wo.getWorkStartTime());
      }
      if (wo.getWorkEndTime() != null) {
        res.setWorkEndTime(wo.getWorkEndTime());
      }
    }
    if (wr == null) {
      return;
    }
    if (res.getWorkStartTime() == null && wr.getStartTime() != null) {
      res.setWorkStartTime(wr.getStartTime());
    }
    if (res.getWorkEndTime() == null && wr.getEndTime() != null) {
      res.setWorkEndTime(wr.getEndTime());
    }
  }

  // 비가동 기록이 없는 진행중/완료 작업에 대해 downtimeMin=0 인 합성 행을 만들어 붙인다.
  // 진행중 작업은 workEndTime 이 null 인 상태로 전달되며, 프론트가 "현재 시각" 기준으로 가동시간을 산출한다.
  private void appendSyntheticRows(List<DowntimeDto.Res> result, Set<Long> alreadyCovered) {
    List<WorkOrder> activeWorkOrders = workOrderRepo.findAll().stream()
        .filter(w -> w.getWorkStartTime() != null)
        .filter(w -> !alreadyCovered.contains(w.getWorkOrderSq()))
        .collect(Collectors.toList());
    if (activeWorkOrders.isEmpty()) {
      return;
    }

    Set<Long> activeSqs = activeWorkOrders.stream()
        .map(WorkOrder::getWorkOrderSq).collect(Collectors.toSet());
    Map<Long, WorkResult> wrMap = loadWorkResults(activeSqs);

    for (WorkOrder wo : activeWorkOrders) {
      WorkResult wr = wrMap.get(wo.getWorkOrderSq());

      DowntimeDto.Res res = new DowntimeDto.Res();
      res.setDowntimeSq(null);
      res.setWorkOrderSq(wo.getWorkOrderSq());
      res.setLineSq(wo.getLineSq());
      res.setLineName(wo.getLineName());
      res.setDowntimeMin(0);
      res.setWorkStartTime(wo.getWorkStartTime());
      res.setWorkEndTime(wo.getWorkEndTime());

      // 일자는 실제 작업일(work_result.workDate)을 우선하고, 없으면 작업지시일(workOrderDate)로 대체한다.
      // mes-op 의 작업완료는 workDate=오늘 로 저장하므로 가동/비가동 화면의 일자도 오늘과 일치한다.
      boolean hasResultDate = wr != null && wr.getWorkDate() != null;
      res.setWorkDate(hasResultDate ? wr.getWorkDate() : wo.getWorkOrderDate());

      if (wr != null && res.getLineName() == null) {
        res.setLineName(wr.getLineName());
      }
      result.add(res);
    }
  }
}
