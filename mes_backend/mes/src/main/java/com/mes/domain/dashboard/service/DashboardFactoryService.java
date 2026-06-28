package com.mes.domain.dashboard.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mes.domain.dashboard.dto.DashboardDto;
import com.mes.domain.item.entity.Item;
import com.mes.domain.item.repository.ItemRepository;
import com.mes.domain.production.entity.WorkOrder;
import com.mes.domain.production.entity.WorkResult;
import com.mes.domain.production.repository.ProductionWorkOrderRepository;
import com.mes.domain.production.repository.ProductionWorkResultRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardFactoryService {

  private final DashboardSupport support;
  private final ProductionWorkOrderRepository workOrderRepository;
  private final ProductionWorkResultRepository workResultRepository;
  private final ItemRepository itemRepository;
  private final Executor dashboardQueryExecutor;

  private static final ObjectMapper IMG_PATHS_MAPPER = new ObjectMapper();
  private static final TypeReference<List<String>> IMG_PATHS_TYPE = new TypeReference<>() {};

  // 공장현황 모니터링: 라인구분(공통정보) 마스터 기준 카드 + 최신 작업지시/실적 매칭.
  // "파우더" 키워드 포함 라인(예: 파우더, 외주파우더)은 한 카드로 합쳐서 표시.
  public List<DashboardDto.ProcessStatusRes> getProcessStatus() {
    return support.withRedisCache("dashboard:processStatus", DashboardSupport.TTL_REALTIME, this::computeProcessStatus);
  }

  private List<DashboardDto.ProcessStatusRes> computeProcessStatus() {
    List<String> masterLines = support.loadLineNames();

    LocalDate to = LocalDate.now();
    LocalDate from = to.minusDays(30);
    List<WorkOrder> workOrders = workOrderRepository.findBySearchCondition(from, to, null, null);

    // 라인명 → 현재 가장 대표성 있는 WorkOrder. 품목 교체로 라인 위에서 도는 작업이 바뀌면 즉시 반영되어야 함.
    // 우선순위: IN_PROGRESS > STOPPED(가동 중 중지) > 최신 workOrderDate/workOrderSq.
    // (workOrders 는 workOrderDate DESC, workOrderSq DESC 정렬이라 동률 비교는 자연 순서로 해결됨)
    Map<String, WorkOrder> latestByLine = new HashMap<>();
    for (WorkOrder wo : workOrders) {
      if (wo.getLineName() == null) continue;
      WorkOrder existing = latestByLine.get(wo.getLineName());
      if (existing == null || isBetterForCard(wo, existing)) {
        latestByLine.put(wo.getLineName(), wo);
      }
    }

    // 카드 키(파우더 통합 적용) → 매칭된 WorkOrder. 우선순위: IN_PROGRESS > 최신순.
    Map<String, WorkOrder> latestByCardKey = new LinkedHashMap<>();
    for (Map.Entry<String, WorkOrder> e : latestByLine.entrySet()) {
      String cardKey = support.toCardKey(e.getKey());
      WorkOrder candidate = e.getValue();
      WorkOrder existing = latestByCardKey.get(cardKey);
      if (existing == null || isBetterForCard(candidate, existing)) {
        latestByCardKey.put(cardKey, candidate);
      }
    }

    // 카드 순서: 공통정보 "라인구분" 마스터에 등록된 라인만 노출 (파우더는 처음 등장 위치에서 통합).
    // 마스터에 없는 라인(레거시/더미)은 의도적으로 표시하지 않음.
    List<String> cardOrder = new ArrayList<>();
    for (String line : masterLines) {
      String key = support.toCardKey(line);
      if (!cardOrder.contains(key)) {
        cardOrder.add(key);
      }
    }

    // Item / 생산수량 일괄 로드
    Set<Long> itemSqs = latestByCardKey.values().stream()
        .map(WorkOrder::getItemSq).filter(java.util.Objects::nonNull)
        .collect(Collectors.toSet());
    Map<Long, Item> itemMap = itemSqs.isEmpty() ? Map.of()
        : itemRepository.findAllByIdWithSpecs(itemSqs).stream()
            .collect(Collectors.toMap(Item::getItemSq, i -> i));

    Set<Long> workOrderSqs = latestByCardKey.values().stream()
        .map(WorkOrder::getWorkOrderSq).filter(java.util.Objects::nonNull)
        .collect(Collectors.toSet());
    Map<Long, Integer> goodSumByWo = workOrderSqs.isEmpty() ? Map.of()
        : workResultRepository.findByWorkOrderSqIn(workOrderSqs).stream()
            .collect(Collectors.groupingBy(
                WorkResult::getWorkOrderSq,
                Collectors.reducing(0,
                    r -> r.getTotalGoodQty() == null ? 0 : r.getTotalGoodQty(),
                    Integer::sum)));

    List<DashboardDto.ProcessStatusRes> list = new ArrayList<>();
    for (String cardKey : cardOrder) {
      WorkOrder wo = latestByCardKey.get(cardKey);
      if (wo == null) {
        // 최근 30일 안에 매칭된 작업지시가 전혀 없는 라인 = "등록된 작업 없음"
        list.add(DashboardDto.ProcessStatusRes.builder()
            .lineSq(null)
            .lineName(cardKey)
            .workOrderSq(null)
            .itemCode(null)
            .itemName(null)
            .basisWeight(null)
            .workStatus("NO_WORK")
            .productionQty(0.0)
            .imageUrls(List.of())
            .hasWorkOrder(false)
            .build());
        continue;
      }
      Item item = wo.getItemSq() == null ? null : itemMap.get(wo.getItemSq());
      int goodQtyInt = goodSumByWo.getOrDefault(wo.getWorkOrderSq(), 0);
      double goodQty = goodQtyInt;
      list.add(DashboardDto.ProcessStatusRes.builder()
          .lineSq(wo.getLineSq())
          .lineName(cardKey)
          .workOrderSq(wo.getWorkOrderSq())
          .itemCode(item == null ? null : item.getItemCode())
          .itemName(item == null ? null : item.getItemName())
          .basisWeight(item == null ? null : item.getBasisWeight())
          .workStatus(mapWorkStatus(wo.getWorkStatus()))
          .productionQty(goodQty)
          .imageUrls(extractImagePaths(item))
          .hasWorkOrder(true)
          .build());
    }
    return list;
  }

  // 품목 img_paths(JSON 문자열 배열)에서 비어있지 않은 경로/데이터 URL을 순서대로 추출.
  // 품목 등록 화면이 최대 2장까지만 받으므로 결과도 2장으로 컷.
  // 파싱 실패하거나 비어있으면 빈 리스트 → 프론트에서 "등록된 이미지 없음" 처리.
  private List<String> extractImagePaths(Item item) {
    if (item == null || item.getImgPaths() == null || item.getImgPaths().isEmpty()) return List.of();
    try {
      List<String> paths = IMG_PATHS_MAPPER.readValue(item.getImgPaths(), IMG_PATHS_TYPE);
      if (paths == null) return List.of();
      List<String> result = new ArrayList<>(2);
      for (String p : paths) {
        if (p != null && !p.isBlank()) {
          result.add(p);
          if (result.size() == 2) break;
        }
      }
      return result;
    } catch (Exception ignored) {
      return List.of();
    }
  }

  // 카드 후보 비교: 가동중>가동중지>그 외, 같으면 workOrderDate/workOrderSq 큰 쪽 우선.
  // IN_PROGRESS = 현재 라인에서 실제 돌고 있는 작업. STOPPED = 가동 중 일시 중지 (여전히 그 라인의 현재 작업).
  // READY/COMPLETED는 "라인 위에서 도는 작업"이라기보다 예약/종료이므로 위 두 상태가 있으면 그쪽을 우선.
  private boolean isBetterForCard(WorkOrder candidate, WorkOrder existing) {
    int candRank = activeRank(candidate.getWorkStatus());
    int existRank = activeRank(existing.getWorkStatus());
    if (candRank != existRank) return candRank > existRank;
    int dateCmp = support.nullSafeCompare(candidate.getWorkOrderDate(), existing.getWorkOrderDate());
    if (dateCmp != 0) return dateCmp > 0;
    return support.nullSafeCompare(candidate.getWorkOrderSq(), existing.getWorkOrderSq()) > 0;
  }

  private int activeRank(String workStatus) {
    if ("IN_PROGRESS".equals(workStatus)) return 2;
    if ("STOPPED".equals(workStatus)) return 1;
    return 0;
  }

  // RUN / STOP / ERROR / NO_WORK 로 매핑 (프론트 status pill 호환)
  // - IN_PROGRESS  → RUN  (가동중)
  // - STOPPED      → STOP (작업 중 일시중지 = 비가동)
  // - READY        → STOP (작업지시는 내려왔으나 시작 안 함 = 비가동)
  // - COMPLETED    → STOP (이미 끝남, 다음 지시 전까지 비가동)
  // - ERROR        → ERROR
  private String mapWorkStatus(String raw) {
    if (raw == null) return "STOP";
    return switch (raw) {
      case "IN_PROGRESS" -> "RUN";
      case "ERROR" -> "ERROR";
      default -> "STOP";
    };
  }

  // 라인별 월별 생산 추이 — 공통정보 "라인구분" 마스터 기준, 파우더 통합 적용.
  // work_result의 line_name이 마스터에 없으면 의도적으로 무시(레거시/더미 라인 차단).
  public DashboardDto.LineTrendRes getLineTrendMonthly(int year) {
    return support.withRedisCache("dashboard:lineTrend:" + year, DashboardSupport.TTL_AGGREGATE,
        () -> computeLineTrendMonthly(year));
  }

  private DashboardDto.LineTrendRes computeLineTrendMonthly(int year) {
    LocalDate from = LocalDate.of(year, 1, 1);
    LocalDate to = LocalDate.of(year, 12, 31);

    // 3개 집계 쿼리는 서로, 그리고 cardOrder(라인명 조회)와도 독립적이라
    // 먼저 병렬로 띄워 라인명 조회와 시간을 겹친다(각 쿼리는 자체 read-only 트랜잭션).
    var areaF = CompletableFuture.supplyAsync(
        () -> workResultRepository.sumGoodAreaGroupByLineAndMonth(from, to), dashboardQueryExecutor);
    var workDaysMonthF = CompletableFuture.supplyAsync(
        () -> workResultRepository.countDistinctWorkDateGroupByMonth(from, to), dashboardQueryExecutor);
    var workDaysLineF = CompletableFuture.supplyAsync(
        () -> workResultRepository.countDistinctWorkDateGroupByLineAndMonth(from, to), dashboardQueryExecutor);

    // 카드 순서 (공통정보 등록 순서, 파우더 1개로 통합)
    List<String> cardOrder = new ArrayList<>();
    for (String line : support.loadLineNames()) {
      String key = support.toCardKey(line);
      if (!cardOrder.contains(key)) cardOrder.add(key);
    }

    Map<Integer, Map<String, Double>> byMonth = new HashMap<>();
    for (int m = 1; m <= 12; m++) byMonth.put(m, new HashMap<>());

    // 생산량 = SUM((prod_width_mm / 1000) × prod_length_m) = m²
    for (var row : areaF.join()) {
      if (row.getMonth() == null || row.getLineName() == null) continue;
      String key = support.matchLineToCard(row.getLineName(), cardOrder);
      if (key == null) continue; // 마스터에 매칭 안 되는 레거시 라인은 스킵
      double qty = row.getQty() == null ? 0.0 : row.getQty().doubleValue();
      // 같은 카드 키로 매칭되는 여러 line_name(예: 파우더+외주파우더)은 합산
      byMonth.get(row.getMonth()).merge(key, qty, Double::sum);
    }

    List<DashboardDto.LineTrendMonthlyRow> rows = new ArrayList<>();
    for (int m = 1; m <= 12; m++) {
      Map<String, Double> values = new LinkedHashMap<>();
      Map<String, Double> r = byMonth.get(m);
      for (String key : cardOrder) {
        values.put(key, r.getOrDefault(key, 0.0));
      }
      rows.add(DashboardDto.LineTrendMonthlyRow.builder()
          .month(m)
          .values(values)
          .build());
    }

    // 월별 고유 작업일수 (생산일보 distinct workDate). 일평균 생산량 산출의 분모.
    int[] workDaysByMonth = new int[13]; // 1..12
    for (var row : workDaysMonthF.join()) {
      if (row.getMonth() == null || row.getQty() == null) continue;
      workDaysByMonth[row.getMonth()] = row.getQty().intValue();
    }
    List<Integer> workDays = new ArrayList<>(12);
    int totalWorkDays = 0;
    for (int m = 1; m <= 12; m++) {
      workDays.add(workDaysByMonth[m]);
      totalWorkDays += workDaysByMonth[m];
    }

    // 라인별 월별 고유 작업일수 — 카드 키로 정규화(파우더 통합).
    // 같은 카드 키로 매핑되는 여러 line_name (예: 파우더 + 외주파우더) 은 MAX 로 합산 — 같은 날짜 중복 카운트 방지.
    Map<String, int[]> workDaysByLineMap = new LinkedHashMap<>();
    for (String key : cardOrder) workDaysByLineMap.put(key, new int[13]);
    for (var row : workDaysLineF.join()) {
      if (row.getMonth() == null || row.getLineName() == null || row.getQty() == null) continue;
      String key = support.matchLineToCard(row.getLineName(), cardOrder);
      if (key == null) continue;
      int[] arr = workDaysByLineMap.get(key);
      if (arr == null) continue;
      int qty = row.getQty().intValue();
      if (qty > arr[row.getMonth()]) arr[row.getMonth()] = qty;
    }
    Map<String, List<Integer>> workDaysByLine = new LinkedHashMap<>();
    for (var e : workDaysByLineMap.entrySet()) {
      List<Integer> list = new ArrayList<>(12);
      for (int m = 1; m <= 12; m++) list.add(e.getValue()[m]);
      workDaysByLine.put(e.getKey(), list);
    }

    return DashboardDto.LineTrendRes.builder()
        .lines(cardOrder)
        .rows(rows)
        .workDays(workDays)
        .totalWorkDays(totalWorkDays)
        .workDaysByLine(workDaysByLine)
        .build();
  }

  // 생산계획 대비 실적 — 공통정보 "라인구분" 마스터 기준 + 파우더 통합 + 레거시 매칭.
  // 계획 = 작업지시(mes_fe 작업지시) 의 작업지시량 합계 (WorkOrder.targetQty, 단위 m).
  // 실적 = 생산일보(mes_fe 생산관리) 의 생산길이 합계 (WorkResultDetail.prodLength, 단위 m).
  // 마스터에 없는 라인 데이터는 의도적으로 노출 안 함.
  public DashboardDto.PlanVsActualRes getPlanVsActual(int year) {
    return support.withRedisCache("dashboard:planVsActual:" + year, DashboardSupport.TTL_AGGREGATE,
        () -> computePlanVsActual(year));
  }

  private DashboardDto.PlanVsActualRes computePlanVsActual(int year) {
    LocalDate from = LocalDate.of(year, 1, 1);
    LocalDate to = LocalDate.of(year, 12, 31);

    // 카드 순서 (LineTrend와 동일 룰)
    List<String> cardOrder = new ArrayList<>();
    for (String line : support.loadLineNames()) {
      String key = support.toCardKey(line);
      if (!cardOrder.contains(key)) cardOrder.add(key);
    }

    Double[] planByMonth = support.zeroMonthArray();
    Double[] actualByMonth = support.zeroMonthArray();
    Map<String, Double> planByLine = new LinkedHashMap<>();
    Map<String, Double> actualByLine = new LinkedHashMap<>();
    // 마스터 라인 순서 유지를 위해 미리 0 채워두기
    for (String line : cardOrder) {
      planByLine.put(line, 0.0);
      actualByLine.put(line, 0.0);
    }

    // 4개 집계 쿼리는 서로 독립적이라 병렬로 조회한다(각 쿼리는 자체 read-only 트랜잭션).
    var planMonthF = CompletableFuture.supplyAsync(
        () -> workOrderRepository.sumTargetQtyGroupByMonth(from, to), dashboardQueryExecutor);
    var actualMonthF = CompletableFuture.supplyAsync(
        () -> workResultRepository.sumProdLengthGroupByMonth(from, to), dashboardQueryExecutor);
    var planLineF = CompletableFuture.supplyAsync(
        () -> workOrderRepository.sumTargetQtyGroupByLine(from, to), dashboardQueryExecutor);
    var actualLineF = CompletableFuture.supplyAsync(
        () -> workResultRepository.sumProdLengthGroupByLine(from, to), dashboardQueryExecutor);

    // 월별 계획 = 작업지시.target_qty, 월별 실적 = work_result_dtl.prod_length (라인 무관 전체 합계)
    for (var p : planMonthF.join()) {
      if (p.getMonth() == null) continue;
      planByMonth[p.getMonth()] = p.getQty() == null ? 0.0 : p.getQty().doubleValue();
    }
    for (var r : actualMonthF.join()) {
      if (r.getMonth() == null) continue;
      actualByMonth[r.getMonth()] = r.getQty() == null ? 0.0 : r.getQty().doubleValue();
    }

    // 라인별 합계는 마스터 키로 정규화 + 파우더 통합
    for (var p : planLineF.join()) {
      String key = support.matchLineToCard(p.getLineName(), cardOrder);
      if (key == null) continue;
      double qty = p.getQty() == null ? 0.0 : p.getQty().doubleValue();
      planByLine.merge(key, qty, Double::sum);
    }
    for (var r : actualLineF.join()) {
      String key = support.matchLineToCard(r.getLineName(), cardOrder);
      if (key == null) continue;
      double qty = r.getQty() == null ? 0.0 : r.getQty().doubleValue();
      actualByLine.merge(key, qty, Double::sum);
    }

    List<DashboardDto.PlanVsActualMonthly> monthly = new ArrayList<>(12);
    for (int m = 1; m <= 12; m++) {
      monthly.add(DashboardDto.PlanVsActualMonthly.builder()
          .month(m)
          .planQty(planByMonth[m])
          .actualQty(actualByMonth[m])
          .achievementRate(support.rate(actualByMonth[m], planByMonth[m]))
          .build());
    }

    List<DashboardDto.PlanVsActualByLine> byLine = new ArrayList<>();
    for (String line : cardOrder) {
      Double plan = planByLine.getOrDefault(line, 0.0);
      Double actual = actualByLine.getOrDefault(line, 0.0);
      byLine.add(DashboardDto.PlanVsActualByLine.builder()
          .lineName(line)
          .planQty(plan)
          .actualQty(actual)
          .achievementRate(support.rate(actual, plan))
          .build());
    }
    return DashboardDto.PlanVsActualRes.builder()
        .monthly(monthly)
        .byLine(byLine)
        .build();
  }
}
