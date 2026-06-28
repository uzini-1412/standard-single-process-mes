package com.mes.domain.material.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mes.domain.bom.repository.BomLineRepository;
import com.mes.domain.item.entity.Item;
import com.mes.domain.item.repository.ItemRepository;
import com.mes.domain.material.dto.MaterialInputDto;
import com.mes.domain.material.entity.MaterialInput;
import com.mes.domain.material.entity.MaterialInputDetail;
import com.mes.domain.material.entity.PlcRawLog;
import com.mes.domain.material.repository.MaterialInputRepository;
import com.mes.domain.material.repository.PlcRawLogRepository;
import com.mes.domain.production.entity.WorkOrder;
import com.mes.domain.production.repository.ProductionWorkOrderRepository;
import com.mes.global.support.EntityIndex;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * 원소재 투입 도메인 서비스.
 * 외주 PLC가 호기별 토출량을 push 하면 raw 그대로 적재하고(매핑은 비동기적으로),
 * 조회 시점에 (라인+측정시각)을 그 시점의 작업지시·BOM과 엮어 자재별 월별 사용량으로 환산한다.
 */
@lombok.extern.slf4j.Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MaterialInputService {

  /** 디바이스 코드(P{n}F{m})를 라인/호기로 분리. 자리수가 늘어도 매칭되도록 \\d+ 사용. */
  private static final Pattern DEVICE_CODE = Pattern.compile("^(P\\d+)(F\\d+)$");
  private static final ZoneId KST = ZoneId.of("Asia/Seoul");

  // 후보 품목 분류용 계정구분 코드 (mes_item_tb.account_type)
  private static final String ACCOUNT_RAW = "매입(원재료)";
  private static final String ACCOUNT_SUB = "매입(부자재)";

  private final MaterialInputRepository inputRepo;
  private final ItemRepository itemRepo;
  private final BomLineRepository bomLineRepo;
  private final PlcRawLogRepository plcRawLogRepo;
  private final ProductionWorkOrderRepository workOrderRepo;
  private final ObjectMapper objectMapper = new ObjectMapper();

  // ======================================================================
  // PLC raw 수신
  // ======================================================================

  /**
   * 외주 PLC가 호기 열림마다 호출하는 인제스트. 가공 없이 mes_plc_raw_log_tb에 적재만 한다.
   * 자재/LOT 매핑은 조회 단계에서 따로 수행.
   */
  @Transactional
  public MaterialInputDto.PlcIngestRes ingestPlcRaw(MaterialInputDto.PlcIngestReq req) {
    LocalDateTime collectedDt = resolveCollectedDt(req);

    if (req.getDevices() == null || req.getDevices().isEmpty()) {
      return ingestResult(0, collectedDt);
    }

    String rawPayload = serializePayload(req);
    List<PlcRawLog> logs = new ArrayList<>(req.getDevices().size());
    for (MaterialInputDto.PlcDeviceValue d : req.getDevices()) {
      logs.add(buildRawLog(d, collectedDt, rawPayload));
    }
    plcRawLogRepo.saveAll(logs);
    return ingestResult(logs.size(), collectedDt);
  }

  private PlcRawLog buildRawLog(MaterialInputDto.PlcDeviceValue d,
      LocalDateTime collectedDt, String rawPayload) {
    String deviceCode = d.getDevice();
    String lineCode = null;
    String feederNo = null;
    if (deviceCode != null) {
      Matcher matcher = DEVICE_CODE.matcher(deviceCode.trim());
      if (matcher.matches()) {
        lineCode = matcher.group(1);
        feederNo = matcher.group(2);
      }
    }
    return PlcRawLog.builder()
        .collectedDt(collectedDt)
        .deviceCode(deviceCode)
        .lineCode(lineCode)
        .feederNo(feederNo)
        .value(d.getValue())
        .unit(d.getUnit())
        .rawPayload(rawPayload)
        .build();
  }

  private MaterialInputDto.PlcIngestRes ingestResult(int count, LocalDateTime collectedDt) {
    MaterialInputDto.PlcIngestRes res = new MaterialInputDto.PlcIngestRes();
    res.setReceivedCount(count);
    res.setDatetime(collectedDt);
    return res;
  }

  /** 측정시각 우선순위: sent(epoch sec, KST) → datetime(레거시) → null. */
  private LocalDateTime resolveCollectedDt(MaterialInputDto.PlcIngestReq req) {
    if (req.getSent() != null) {
      return LocalDateTime.ofInstant(Instant.ofEpochSecond(req.getSent()), KST);
    }
    return req.getDatetime();
  }

  private String serializePayload(MaterialInputDto.PlcIngestReq req) {
    try {
      return objectMapper.writeValueAsString(req);
    } catch (JsonProcessingException e) {
      log.warn("PLC payload 직렬화 실패 — null 저장: {}", e.getMessage());
      return null;
    }
  }

  // ======================================================================
  // PLC raw 조회 (원소재투입분석 화면)
  // ======================================================================

  /** 라인 + 기간으로 mes_plc_raw_log_tb를 직접 읽어 호기별 토출 이벤트를 최신순으로 반환. */
  public List<MaterialInputDto.PlcRawRes> getPlcRawList(MaterialInputDto.PlcRawSearchReq req) {
    if (req.getLineCode() == null || req.getDateFrom() == null || req.getDateTo() == null) {
      return List.of();
    }
    LocalDateTime from = req.getDateFrom().atStartOfDay();
    LocalDateTime to = req.getDateTo().atTime(LocalTime.MAX);
    return plcRawLogRepo
        .findByLineCodeAndCollectedDtBetweenOrderByCollectedDtDesc(req.getLineCode(), from, to)
        .stream()
        .map(this::toPlcRawRes)
        .collect(Collectors.toList());
  }

  private MaterialInputDto.PlcRawRes toPlcRawRes(PlcRawLog log) {
    MaterialInputDto.PlcRawRes res = new MaterialInputDto.PlcRawRes();
    res.setCollectedDt(log.getCollectedDt());
    res.setDeviceCode(log.getDeviceCode());
    res.setLineCode(log.getLineCode());
    res.setFeederNo(log.getFeederNo());
    res.setValue(log.getValue());
    res.setUnit(log.getUnit());
    return res;
  }

  // ======================================================================
  // 저장된 투입 실적 조회 (시뮬레이션 데이터)
  // ======================================================================

  /** mes_material_input_tb에 저장된 투입 실적과 그 하위 시간대별 상세를 함께 내려준다. */
  public List<MaterialInputDto.RawRes> getRawList(MaterialInputDto.RawSearchReq req) {
    return inputRepo.findRawDataList(req.getDateFrom(), req.getDateTo(), req.getLineSq(), req.getItemSq())
        .stream()
        .map(this::toRawRes)
        .collect(Collectors.toList());
  }

  private MaterialInputDto.RawRes toRawRes(MaterialInput m) {
    MaterialInputDto.RawRes res = new MaterialInputDto.RawRes();
    res.setInputSq(m.getInputSq());
    res.setWorkDate(m.getWorkDate());
    res.setLineSq(m.getLineSq());
    res.setItemSq(m.getItemSq());
    res.setFacilityName(m.getFacilityName());
    res.setTotalTargetWeight(m.getTotalTargetWeight());
    res.setTotalActualWeight(m.getTotalActualWeight());
    res.setRawDetails(m.getDetails().stream()
        .map(this::toRawDetailRes)
        .collect(Collectors.toList()));
    return res;
  }

  private MaterialInputDto.RawDetailRes toRawDetailRes(MaterialInputDetail d) {
    MaterialInputDto.RawDetailRes res = new MaterialInputDto.RawDetailRes();
    res.setWorkTimeRange(d.getWorkTimeRange());
    res.setMatAUsage(d.getMatAUsage());
    res.setMatBUsage(d.getMatBUsage());
    res.setMatCUsage(d.getMatCUsage());
    res.setMatDUsage(d.getMatDUsage());
    res.setRowTotalUsage(d.getRowTotalUsage());
    return res;
  }

  // ======================================================================
  // 투입량 분석 (기존 골격 보존)
  // ======================================================================

  public MaterialInputDto.AnalysisRes analyzeInput(MaterialInputDto.AnalysisReq req) {
    return new MaterialInputDto.AnalysisRes();
  }

  // ======================================================================
  // 원소재 투입 현황 (연도별 1~12월 매트릭스)
  // ======================================================================

  /**
   * 한 해(req.year)의 자재별 1~12월 투입량 표를 만든다.
   *
   * 큰 그림은 "측정값을 작업지시에 시간으로 붙이고, 그 작업지시 제품의 BOM에서 자재를 역추적"하는 것이다.
   * 단계별로 보면:
   *   - 윈도우(전월 1일 ~ 당월 말일)와 가동기간이 겹치는 작업지시만 후보로 남긴다.
   *   - 후보 제품들의 BOM을 모아 (호기키 "F{n}" → 자재 itemSq) 룩업 테이블을 구성한다.
   *   - 윈도우 범위의 PLC raw를 한 건씩 라인별 작업지시에 매칭하며 자재별 월 누적을 채운다.
   *   - 표의 행은 원자재 전부 + 이번 BOM에 실제 쓰인 부자재. 사용량이 0이어도 행은 남긴다.
   *     정렬 키는 두 그룹 각각 itemCode 오름차순.
   */
  public List<MaterialInputDto.StatusRes> getStatus(MaterialInputDto.StatusReq req) {
    int year = (req.getYear() != null) ? req.getYear() : LocalDate.now().getYear();

    LocalDate anchor = LocalDate.now();
    LocalDate windowStart = anchor.minusMonths(1).withDayOfMonth(1);
    LocalDate windowEnd = anchor.withDayOfMonth(anchor.lengthOfMonth());
    LocalDateTime tsFrom = windowStart.atStartOfDay();
    LocalDateTime tsTo = windowEnd.atTime(LocalTime.MAX);

    // 후보 작업지시 → 그 제품들의 itemSq 집합
    List<WorkOrder> activeWorkOrders = findActiveWorkOrders(windowStart, windowEnd, tsFrom, tsTo);
    Set<Long> productItemSqs = collectProductItemSqs(activeWorkOrders);

    // BOM 룩업과 라인 인덱스 — 둘 다 누적 단계에서 쓰인다
    List<BomLineRepository.PlcMapping> bomLines = productItemSqs.isEmpty()
        ? List.of()
        : bomLineRepo.findPlcMappingByProductItemSqs(productItemSqs);
    Map<Long, Map<String, Long>> feederLookup = buildFeederLookup(bomLines);
    Map<String, List<WorkOrder>> workOrdersByLine = indexWorkOrdersByLine(activeWorkOrders);

    // 윈도우 내 PLC raw를 굴려 자재별 월 누적
    List<PlcRawLog> plcLogs =
        plcRawLogRepo.findByCollectedDtBetweenOrderByCollectedDtAsc(tsFrom, tsTo);
    Map<Long, double[]> monthlyUsage =
        accumulateMonthlyUsage(plcLogs, workOrdersByLine, feederLookup, year);

    return buildStatusRows(bomLines, monthlyUsage, req.getItemCode());
  }

  private Set<Long> collectProductItemSqs(List<WorkOrder> workOrders) {
    Set<Long> sqs = new HashSet<>();
    for (WorkOrder w : workOrders) {
      if (w.getItemSq() != null) {
        sqs.add(w.getItemSq());
      }
    }
    return sqs;
  }

  /**
   * 매칭 윈도우와 활성기간이 겹치는 작업지시.
   * workOrderDate로 1차로 [windowStart-3개월 ~ windowEnd]를 컷한 뒤,
   * workStartTime ≤ tsTo AND (workEndTime IS NULL OR workEndTime ≥ tsFrom)로 2차 필터.
   */
  private List<WorkOrder> findActiveWorkOrders(
      LocalDate windowStart, LocalDate windowEnd, LocalDateTime tsFrom, LocalDateTime tsTo) {
    LocalDate woFrom = windowStart.minusMonths(3);
    return workOrderRepo.findBySearchCondition(woFrom, windowEnd, null, null).stream()
        .filter(w -> overlapsWindow(w, tsFrom, tsTo))
        .collect(Collectors.toList());
  }

  /** 라인/제품/시작시각이 모두 채워져 있고, [tsFrom, tsTo] 윈도우와 가동기간이 겹치는지. */
  private boolean overlapsWindow(WorkOrder w, LocalDateTime tsFrom, LocalDateTime tsTo) {
    if (w.getWorkStartTime() == null || w.getLineName() == null || w.getItemSq() == null) {
      return false;
    }
    if (w.getWorkStartTime().isAfter(tsTo)) {
      return false;
    }
    return w.getWorkEndTime() == null || !w.getWorkEndTime().isBefore(tsFrom);
  }

  /** 제품 itemSq → ("F{n}" → 자재 itemSq). BOM의 plcMachineNo "1호기" 등에서 숫자만 뽑아 호기 키로 쓴다. */
  private Map<Long, Map<String, Long>> buildFeederLookup(List<BomLineRepository.PlcMapping> bomLines) {
    Map<Long, Map<String, Long>> lookup = new HashMap<>();
    for (BomLineRepository.PlcMapping line : bomLines) {
      boolean incomplete = line.getPlcMachineNo() == null || line.getComponentItemSq() == null;
      if (incomplete) {
        continue;
      }
      String digit = line.getPlcMachineNo().replaceAll("\\D", "");
      if (!digit.isEmpty()) {
        lookup.computeIfAbsent(line.getProductItemSq(), k -> new HashMap<>())
            .put("F" + digit, line.getComponentItemSq());
      }
    }
    return lookup;
  }

  /** 라인명 → 작업지시 목록(시작시각 ASC). 시간 매칭 시 앞에서부터 첫 매칭을 쓰기 위함. */
  private Map<String, List<WorkOrder>> indexWorkOrdersByLine(List<WorkOrder> activeWorkOrders) {
    Map<String, List<WorkOrder>> byLine = activeWorkOrders.stream()
        .collect(Collectors.groupingBy(WorkOrder::getLineName));
    byLine.values().forEach(list -> list.sort(Comparator.comparing(WorkOrder::getWorkStartTime)));
    return byLine;
  }

  /**
   * PLC raw 한 건씩 라인의 작업지시에 시간으로 매칭하고, 매칭된 제품 BOM에서 자재를 찾아 그 해 월 누적에 더한다.
   * req.year와 다른 연도의 측정값은 매트릭스에 넣지 않는다.
   */
  private Map<Long, double[]> accumulateMonthlyUsage(
      List<PlcRawLog> plcLogs,
      Map<String, List<WorkOrder>> workOrdersByLine,
      Map<Long, Map<String, Long>> feederLookup,
      int year) {
    Map<Long, double[]> usage = new HashMap<>();
    LocalDateTime asOf = LocalDateTime.now();

    for (PlcRawLog log : plcLogs) {
      Long materialItemSq = resolveMaterial(log, workOrdersByLine, feederLookup, asOf);
      if (materialItemSq == null) {
        continue;
      }
      LocalDateTime measuredAt = log.getCollectedDt();
      if (measuredAt.getYear() == year) {
        usage.computeIfAbsent(materialItemSq, k -> new double[12])
            [measuredAt.getMonthValue() - 1] += log.getValue();
      }
    }
    return usage;
  }

  /**
   * 한 측정 로그를 작업지시·BOM에 엮어 최종 자재 itemSq를 풀어낸다.
   * 필수 필드 누락, 라인 미매칭, 시간 미매칭, BOM 미존재 중 하나라도 걸리면 null.
   */
  private Long resolveMaterial(
      PlcRawLog log,
      Map<String, List<WorkOrder>> workOrdersByLine,
      Map<Long, Map<String, Long>> feederLookup,
      LocalDateTime asOf) {
    boolean missingField = log.getLineCode() == null || log.getFeederNo() == null
        || log.getValue() == null || log.getCollectedDt() == null;
    if (missingField) {
      return null;
    }
    List<WorkOrder> candidates = workOrdersByLine.get(log.getLineCode());
    if (candidates == null) {
      return null;
    }
    WorkOrder matched = matchWorkOrder(candidates, log.getCollectedDt(), asOf);
    if (matched == null) {
      return null;
    }
    Map<String, Long> feederMap = feederLookup.get(matched.getItemSq());
    return feederMap == null ? null : feederMap.get(log.getFeederNo());
  }

  /** 측정시각 t가 [workStartTime, workEndTime(없으면 asOf)] 안에 드는 첫 작업지시. */
  private WorkOrder matchWorkOrder(List<WorkOrder> candidates, LocalDateTime t, LocalDateTime asOf) {
    return candidates.stream()
        .filter(w -> {
          LocalDateTime end = w.getWorkEndTime() != null ? w.getWorkEndTime() : asOf;
          return !t.isBefore(w.getWorkStartTime()) && !t.isAfter(end);
        })
        .findFirst()
        .orElse(null);
  }

  /** 후보 행 구성(원자재 전체 + 등장 부자재) + 정렬 + DTO 변환 + 품번 필터. */
  private List<MaterialInputDto.StatusRes> buildStatusRows(
      List<BomLineRepository.PlcMapping> bomLines,
      Map<Long, double[]> monthlyUsage,
      String itemCodeFilter) {
    Set<Long> rawItemSqs = new HashSet<>(itemRepo.findItemSqsByAccountTypes(List.of(ACCOUNT_RAW)));
    Set<Long> subItemSqs = new HashSet<>(itemRepo.findItemSqsByAccountTypes(List.of(ACCOUNT_SUB)));
    Set<Long> usedMaterialItemSqs = bomLines.stream()
        .map(BomLineRepository.PlcMapping::getComponentItemSq)
        .filter(Objects::nonNull)
        .collect(Collectors.toSet());

    Set<Long> candidateItemSqs = new HashSet<>(rawItemSqs);
    usedMaterialItemSqs.stream().filter(subItemSqs::contains).forEach(candidateItemSqs::add);
    if (candidateItemSqs.isEmpty()) {
      return List.of();
    }

    Map<Long, Item> itemMap = EntityIndex.byId(
        List.copyOf(candidateItemSqs), itemRepo::findAllById, Item::getItemSq);

    Comparator<Item> byCode =
        Comparator.comparing(Item::getItemCode, Comparator.nullsLast(Comparator.naturalOrder()));
    List<Item> rawRows = itemMap.values().stream()
        .filter(i -> rawItemSqs.contains(i.getItemSq()))
        .sorted(byCode)
        .collect(Collectors.toList());
    List<Item> subRows = itemMap.values().stream()
        .filter(i -> !rawItemSqs.contains(i.getItemSq()))
        .sorted(byCode)
        .collect(Collectors.toList());

    List<MaterialInputDto.StatusRes> rows = new ArrayList<>(rawRows.size() + subRows.size());
    for (Item item : rawRows) {
      rows.add(toStatusRes(item, monthlyUsage.get(item.getItemSq())));
    }
    for (Item item : subRows) {
      rows.add(toStatusRes(item, monthlyUsage.get(item.getItemSq())));
    }

    if (itemCodeFilter == null || itemCodeFilter.isBlank()) {
      return rows;
    }
    String needle = itemCodeFilter.trim().toLowerCase();
    return rows.stream()
        .filter(r -> r.getItemCode() != null && r.getItemCode().toLowerCase().contains(needle))
        .collect(Collectors.toList());
  }

  private MaterialInputDto.StatusRes toStatusRes(Item item, double[] months) {
    double[] m = months != null ? months : new double[12];
    MaterialInputDto.StatusRes res = new MaterialInputDto.StatusRes();
    res.setItemSq(item.getItemSq());
    res.setItemCode(item.getItemCode());
    res.setItemName(item.getItemName());
    res.setMon1(m[0]);
    res.setMon2(m[1]);
    res.setMon3(m[2]);
    res.setMon4(m[3]);
    res.setMon5(m[4]);
    res.setMon6(m[5]);
    res.setMon7(m[6]);
    res.setMon8(m[7]);
    res.setMon9(m[8]);
    res.setMon10(m[9]);
    res.setMon11(m[10]);
    res.setMon12(m[11]);

    double yearTotal = 0.0;
    for (double v : m) {
      yearTotal += v;
    }
    res.setTotalYear(yearTotal);
    return res;
  }

  // ======================================================================
  // 투입 실적 저장 (수동/테스트)
  // ======================================================================

  /** 동일 (작업일·라인·품목) 실적이 있으면 갈아엎고 다시 저장. 상세별 행 합계를 굴린다. */
  @Transactional
  public void saveData(MaterialInputDto.SaveReq req) {
    inputRepo.findByWorkDateAndLineSqAndItemSq(req.getWorkDate(), req.getLineSq(), req.getItemSq())
        .ifPresent(inputRepo::delete);

    MaterialInput input = MaterialInput.builder()
        .workDate(req.getWorkDate())
        .lineSq(req.getLineSq())
        .itemSq(req.getItemSq())
        .totalTargetWeight(req.getTotalTargetWeight())
        .build();

    if (req.getDetails() != null) {
      for (MaterialInputDto.DetailSaveDto d : req.getDetails()) {
        input.addDetail(buildDetail(d));
      }
    }
    inputRepo.save(input);
  }

  private MaterialInputDetail buildDetail(MaterialInputDto.DetailSaveDto d) {
    double rowTotal = nz(d.getMatA()) + nz(d.getMatB()) + nz(d.getMatC()) + nz(d.getMatD());
    return MaterialInputDetail.builder()
        .workTimeRange(d.getTimeRange())
        .matAUsage(d.getMatA())
        .matBUsage(d.getMatB())
        .matCUsage(d.getMatC())
        .matDUsage(d.getMatD())
        .rowTotalUsage(rowTotal)
        .build();
  }

  private static double nz(Double v) {
    return v != null ? v : 0.0;
  }
}
