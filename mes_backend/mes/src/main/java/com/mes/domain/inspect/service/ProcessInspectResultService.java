package com.mes.domain.inspect.service;

import com.mes.domain.inspect.dto.ProcessInspectProgressDto;
import com.mes.domain.inspect.dto.ProcessInspectResultDto;
import com.mes.domain.inspect.entity.InspectItem;
import com.mes.domain.inspect.entity.InspectStandard;
import com.mes.domain.inspect.entity.ProcessInspectResult;
import com.mes.domain.inspect.repository.InspectStandardRepository;
import com.mes.domain.inspect.repository.ProcessInspectResultRepository;
import com.mes.domain.item.entity.Item;
import com.mes.domain.item.repository.ItemRepository;
import com.mes.domain.production.entity.WorkOrder;
import com.mes.domain.production.repository.ProductionWorkOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProcessInspectResultService {

  private static final String PHASE_FIRST = "FIRST";
  private static final String PHASE_LAST = "LAST";

  private final ProcessInspectResultRepository resultRepository;
  private final ProductionWorkOrderRepository workOrderRepository;
  private final InspectStandardRepository inspectStandardRepository;
  private final ItemRepository itemRepository;

  /** 상단 진척현황 테이블. 작업지시별로 검사 단계/상태를 집계한다. */
  public List<ProcessInspectProgressDto.HeaderRes> getProgressList() {
    List<WorkOrder> workOrders = workOrderRepository.findAllByOrderByWorkOrderDateDesc();

    // 품목을 한 번에 적재 (N+1 회피)
    Map<Long, Item> itemMap = new LinkedHashMap<>();
    List<Long> itemIds = workOrders.stream().map(WorkOrder::getItemSq)
        .filter(Objects::nonNull).distinct().collect(Collectors.toList());
    itemRepository.findAllById(itemIds).forEach(it -> itemMap.put(it.getItemSq(), it));

    // 현재 화면에 뜨는 작업지시들의 검사결과만 묶어서 한 번에 조회
    List<Long> woIds = workOrders.stream().map(WorkOrder::getWorkOrderSq)
        .filter(Objects::nonNull).distinct().collect(Collectors.toList());
    Map<Long, List<ProcessInspectResult>> resultsByWo = woIds.isEmpty()
        ? Collections.emptyMap()
        : resultRepository.findByWorkOrderSqIn(woIds).stream()
            .filter(r -> r.getWorkOrderSq() != null)
            .collect(Collectors.groupingBy(ProcessInspectResult::getWorkOrderSq));

    List<ProcessInspectProgressDto.HeaderRes> headers = new ArrayList<>(workOrders.size());
    for (WorkOrder wo : workOrders) {
      List<ProcessInspectResult> rows =
          resultsByWo.getOrDefault(wo.getWorkOrderSq(), Collections.emptyList());

      String phase = resolvePhase(rows);

      ProcessInspectProgressDto.HeaderRes header = new ProcessInspectProgressDto.HeaderRes();
      header.setWorkOrderSq(wo.getWorkOrderSq());
      header.setInspectDate(latestInspectDate(rows));
      header.setLineName(wo.getLineName());
      Item item = wo.getItemSq() == null ? null : itemMap.get(wo.getItemSq());
      header.setItemCode(item != null ? item.getItemCode() : "");
      header.setItemName(item != null ? item.getItemName() : "");
      header.setInspectPhase(phase);
      header.setProgressStatus(statusLabel(phase));
      header.setProductionLotNo(wo.getProductionLotNo());
      header.setRemark(wo.getRemark());
      headers.add(header);
    }
    return headers;
  }

  private String latestInspectDate(List<ProcessInspectResult> rows) {
    return rows.stream()
        .map(ProcessInspectResult::getInspectDate)
        .filter(Objects::nonNull)
        .max(Comparator.naturalOrder())
        .map(LocalDate::toString)
        .orElse("");
  }

  private String resolvePhase(List<ProcessInspectResult> rows) {
    boolean last = false;
    boolean first = false;
    for (ProcessInspectResult r : rows) {
      if (PHASE_LAST.equals(r.getInspectPhase())) {
        last = true;
      } else if (PHASE_FIRST.equals(r.getInspectPhase())) {
        first = true;
      }
    }
    if (last) {
      return PHASE_LAST;
    }
    return first ? PHASE_FIRST : null;
  }

  private String statusLabel(String phase) {
    if (PHASE_LAST.equals(phase)) {
      return "완료";
    }
    if (PHASE_FIRST.equals(phase)) {
      return "초품";
    }
    return "대기";
  }

  /**
   * 하단 상세 테이블 (검사항목 + 초품/종품).
   * 저장된 결과가 있는 항목은 등록 당시 스냅샷을, 아직 저장 안 된 항목은 최신 기준서를 사용한다.
   */
  public List<ProcessInspectProgressDto.DetailRes> getDetail(Long workOrderSq) {
    WorkOrder wo = workOrderRepository.findById(workOrderSq)
        .orElseThrow(() -> new RuntimeException("작업지시를 찾을 수 없습니다."));

    // 먼저 이 작업지시의 자주검사 결과를 itemDtlSq 기준으로 매핑
    List<ProcessInspectResult> results = resultRepository.findByWorkOrderSq(workOrderSq);
    Map<Long, ProcessInspectResult> resultByItem = new LinkedHashMap<>();
    for (ProcessInspectResult r : results) {
      resultByItem.put(r.getItemDtlSq(), r);
    }

    List<InspectItem> latestItems = latestStandardItems(wo.getItemSq());

    if (latestItems.isEmpty() && results.isEmpty()) {
      return Collections.emptyList();
    }

    List<ProcessInspectProgressDto.DetailRes> out = new ArrayList<>();
    Set<Long> emitted = new HashSet<>();

    // 1) 최신 기준서 항목을 sortNo 순으로 먼저 출력
    latestItems.stream()
        .sorted(Comparator.comparingInt(i -> i.getSortNo() != null ? i.getSortNo() : 0))
        .forEach(item -> {
          ProcessInspectResult saved = resultByItem.get(item.getItemDtlSq());
          out.add(saved != null
              ? detailFromSaved(saved, item, wo.getProductionLotNo())
              : detailFromStandard(item, wo.getProductionLotNo()));
          emitted.add(item.getItemDtlSq());
        });

    // 2) 기준서에선 빠졌지만 저장 결과만 남은 항목은 스냅샷 그대로 뒤에 붙인다
    for (ProcessInspectResult r : results) {
      if (emitted.contains(r.getItemDtlSq())) {
        continue;
      }
      out.add(detailFromResultOnly(r, wo.getProductionLotNo()));
    }
    return out;
  }

  private List<InspectItem> latestStandardItems(Long itemSq) {
    List<InspectStandard> standards =
        inspectStandardRepository.findBySearchCondition("PROCESS", itemSq, null, true);
    if (standards.isEmpty()) {
      return Collections.emptyList();
    }
    InspectStandard latest = standards.stream()
        .max(Comparator.comparing(InspectStandard::getInspectStdSq))
        .orElse(standards.get(0));
    return latest.getInspectItems();
  }

  // 저장된 항목: 스냅샷 우선, null 이면 기준서 항목값으로 fallback
  private ProcessInspectProgressDto.DetailRes detailFromSaved(
      ProcessInspectResult r, InspectItem item, String lotNo) {
    ProcessInspectProgressDto.DetailRes d = new ProcessInspectProgressDto.DetailRes();
    d.setItemDtlSq(item.getItemDtlSq());
    d.setInspectItemName(orElse(r.getInspectItemName(), item.getInspectItemName()));
    d.setInspectCriteria(orElse(r.getInspectCriteria(), item.getInspectCriteria()));
    d.setInspectMethod(orElse(r.getInspectMethod(), item.getInspectMethod()));
    d.setInspectCycle(orElse(r.getInspectCycle(), item.getInspectCycle()));
    d.setBaseVal(orElse(r.getBaseVal(), item.getBaseVal()));
    d.setMaxVal(orElse(r.getMaxVal(), item.getMaxVal()));
    d.setMinVal(orElse(r.getMinVal(), item.getMinVal()));
    d.setFirstVal(r.getFirstVal());
    d.setLastVal(r.getLastVal());
    d.setLotNo(lotNo);
    return d;
  }

  // 미저장 항목: 최신 기준서값 그대로
  private ProcessInspectProgressDto.DetailRes detailFromStandard(InspectItem item, String lotNo) {
    ProcessInspectProgressDto.DetailRes d = new ProcessInspectProgressDto.DetailRes();
    d.setItemDtlSq(item.getItemDtlSq());
    d.setInspectItemName(item.getInspectItemName());
    d.setInspectCriteria(item.getInspectCriteria());
    d.setInspectMethod(item.getInspectMethod());
    d.setInspectCycle(item.getInspectCycle());
    d.setBaseVal(item.getBaseVal());
    d.setMaxVal(item.getMaxVal());
    d.setMinVal(item.getMinVal());
    d.setLotNo(lotNo);
    return d;
  }

  // 기준서에서 삭제된 항목: 저장 스냅샷만 노출
  private ProcessInspectProgressDto.DetailRes detailFromResultOnly(
      ProcessInspectResult r, String lotNo) {
    ProcessInspectProgressDto.DetailRes d = new ProcessInspectProgressDto.DetailRes();
    d.setItemDtlSq(r.getItemDtlSq());
    d.setInspectItemName(r.getInspectItemName());
    d.setInspectCriteria(r.getInspectCriteria());
    d.setInspectMethod(r.getInspectMethod());
    d.setInspectCycle(r.getInspectCycle());
    d.setBaseVal(r.getBaseVal());
    d.setMaxVal(r.getMaxVal());
    d.setMinVal(r.getMinVal());
    d.setFirstVal(r.getFirstVal());
    d.setLastVal(r.getLastVal());
    d.setLotNo(lotNo);
    return d;
  }

  private static String orElse(String primary, String fallback) {
    return primary != null ? primary : fallback;
  }

  public List<ProcessInspectResultDto.Res> getList(Long workOrderSq) {
    List<ProcessInspectResultDto.Res> list = new ArrayList<>();
    for (ProcessInspectResult r : resultRepository.findByWorkOrderSq(workOrderSq)) {
      list.add(ProcessInspectResultDto.Res.from(r));
    }
    return list;
  }

  @Transactional
  public void save(ProcessInspectResultDto.SaveReq req) {
    LocalDate inspectDate = req.getInspectDate() != null
        ? LocalDate.parse(req.getInspectDate())
        : LocalDate.now();

    // 저장 시점의 기준서 항목을 미리 매핑해 두고 스냅샷 박제에 쓴다.
    Map<Long, InspectItem> stdItemMap = loadStandardItemMap(req.getInspectStdSq());

    boolean firstPhase = PHASE_FIRST.equals(req.getInspectPhase());
    boolean lastPhase = PHASE_LAST.equals(req.getInspectPhase());

    for (ProcessInspectResultDto.ItemResult item : req.getItems()) {
      Optional<ProcessInspectResult> found =
          resultRepository.findByWorkOrderSqAndItemDtlSq(req.getWorkOrderSq(), item.getItemDtlSq());
      InspectItem stdItem = stdItemMap.get(item.getItemDtlSq());

      if (firstPhase) {
        if (found.isPresent()) {
          // 초품 재저장: firstVal 만 갱신하고 기존 스냅샷은 그대로 둔다.
          resultRepository.save(rebuildWithFirstVal(found.get(), inspectDate,
              req.getInspector(), item.getFirstVal()));
        } else {
          resultRepository.save(newFirstResult(req, item, inspectDate, stdItem));
        }
      } else if (lastPhase) {
        if (found.isPresent()) {
          ProcessInspectResult entity = found.get();
          entity.updateLastVal(item.getLastVal(), item.getPassFail());
          resultRepository.save(entity);
        } else {
          // 초품 없이 종품만 들어오는 비정상 케이스 — 종품 시점 스냅샷으로 신규 생성
          resultRepository.save(newLastResult(req, item, inspectDate, stdItem));
        }
      }
    }
  }

  private Map<Long, InspectItem> loadStandardItemMap(Long inspectStdSq) {
    if (inspectStdSq == null) {
      return Collections.emptyMap();
    }
    return inspectStandardRepository.findById(inspectStdSq)
        .map(s -> {
          Map<Long, InspectItem> map = new LinkedHashMap<>();
          for (InspectItem it : s.getInspectItems()) {
            map.putIfAbsent(it.getItemDtlSq(), it);
          }
          return map;
        })
        .orElseGet(Collections::emptyMap);
  }

  private ProcessInspectResult rebuildWithFirstVal(ProcessInspectResult base, LocalDate inspectDate,
                                                   String inspector, String firstVal) {
    return ProcessInspectResult.builder()
        .resultSq(base.getResultSq())
        .workOrderSq(base.getWorkOrderSq())
        .inspectStdSq(base.getInspectStdSq())
        .itemDtlSq(base.getItemDtlSq())
        .inspectDate(inspectDate)
        .inspector(inspector)
        .firstVal(firstVal)
        .lastVal(base.getLastVal())
        .passFail(base.getPassFail())
        .inspectPhase(PHASE_FIRST)
        .inspectItemName(base.getInspectItemName())
        .inspectCriteria(base.getInspectCriteria())
        .measureType(base.getMeasureType())
        .inspectMethod(base.getInspectMethod())
        .inspectCycle(base.getInspectCycle())
        .sampleCnt(base.getSampleCnt())
        .baseVal(base.getBaseVal())
        .maxVal(base.getMaxVal())
        .minVal(base.getMinVal())
        .build();
  }

  private ProcessInspectResult newFirstResult(ProcessInspectResultDto.SaveReq req,
                                              ProcessInspectResultDto.ItemResult item,
                                              LocalDate inspectDate, InspectItem stdItem) {
    return snapshotBuilder(req, item, inspectDate, stdItem)
        .firstVal(item.getFirstVal())
        .inspectPhase(PHASE_FIRST)
        .build();
  }

  private ProcessInspectResult newLastResult(ProcessInspectResultDto.SaveReq req,
                                             ProcessInspectResultDto.ItemResult item,
                                             LocalDate inspectDate, InspectItem stdItem) {
    return snapshotBuilder(req, item, inspectDate, stdItem)
        .lastVal(item.getLastVal())
        .passFail(item.getPassFail())
        .inspectPhase(PHASE_LAST)
        .build();
  }

  // 신규 결과 공통 골격 + 등록 시점 기준서 스냅샷 박제
  private ProcessInspectResult.ProcessInspectResultBuilder snapshotBuilder(
      ProcessInspectResultDto.SaveReq req, ProcessInspectResultDto.ItemResult item,
      LocalDate inspectDate, InspectItem stdItem) {
    return ProcessInspectResult.builder()
        .workOrderSq(req.getWorkOrderSq())
        .inspectStdSq(req.getInspectStdSq())
        .itemDtlSq(item.getItemDtlSq())
        .inspectDate(inspectDate)
        .inspector(req.getInspector())
        .inspectItemName(stdItem == null ? null : stdItem.getInspectItemName())
        .inspectCriteria(stdItem == null ? null : stdItem.getInspectCriteria())
        .measureType(stdItem == null ? null : stdItem.getMeasureType())
        .inspectMethod(stdItem == null ? null : stdItem.getInspectMethod())
        .inspectCycle(stdItem == null ? null : stdItem.getInspectCycle())
        .sampleCnt(stdItem == null ? null : stdItem.getSampleCnt())
        .baseVal(stdItem == null ? null : stdItem.getBaseVal())
        .maxVal(stdItem == null ? null : stdItem.getMaxVal())
        .minVal(stdItem == null ? null : stdItem.getMinVal());
  }
}
