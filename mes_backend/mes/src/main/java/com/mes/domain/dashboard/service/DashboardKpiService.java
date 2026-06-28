package com.mes.domain.dashboard.service;

import com.mes.domain.dashboard.dto.DashboardDto;
import com.mes.domain.production.repository.ProductionWorkResultRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardKpiService {

  private final DashboardSupport support;
  private final ProductionWorkResultRepository workResultRepository;

  /**
   * KPI — 시간당 생산량(kg/h) + 로스율(%). 작업지시 단위 집계.
   *   시간당 생산량 = SUM(roll_weight 실측) / SUM(가동시간)
   *   로스율(%)    = (관리롤중량 - 생산롤중량) / 관리롤중량 × 100
   *                = 1 - SUM(roll_weight) / SUM(관리롤중량) × 100
   * 관리롤중량 = pw.roll_production_weight 우선, 없으면 wo.manage_weight × pw.width × pw.length / 1e6.
   *
   * @param year      조회 연도
   * @param month     조회 월 (1~12). null/0 또는 범위 밖이면 연 전체.
   * @param threshold 로스율 이상치 기준(%) — 기본 3.0, ≥ 0
   */
  public DashboardDto.KpiRes getKpi(int year, Integer month, Double threshold) {
    final double thrEff = (threshold == null || threshold < 0) ? 3.0 : threshold;
    final String monthKey = (month == null || month < 1 || month > 12) ? "all" : String.valueOf(month);
    return support.withRedisCache("dashboard:kpi:" + year + ":" + monthKey + ":" + thrEff, DashboardSupport.TTL_AGGREGATE,
        () -> computeKpi(year, month, thrEff));
  }

  private DashboardDto.KpiRes computeKpi(int year, Integer month, Double threshold) {
    double thr = (threshold == null || threshold < 0) ? 3.0 : threshold;

    LocalDate from;
    LocalDate to;
    if (month != null && month >= 1 && month <= 12) {
      java.time.YearMonth ym = java.time.YearMonth.of(year, month);
      from = ym.atDay(1);
      to = ym.atEndOfMonth();
    } else {
      from = LocalDate.of(year, 1, 1);
      to = LocalDate.of(year, 12, 31);
    }
    int periodDays = (int) java.time.temporal.ChronoUnit.DAYS.between(from, to) + 1;

    List<String> cardOrder = new ArrayList<>();
    for (String line : support.loadLineNames()) {
      String key = support.toCardKey(line);
      if (!cardOrder.contains(key)) cardOrder.add(key);
    }

    // 생산일보(work_result) 기준: work_date 가 기간 안에 떨어진 것
    var rows = workResultRepository.findKpiRowsByWorkDate(from, to);
    // 진단 native query 는 운영 디버깅 끝나서 제거 (EXISTS subquery 6개 무거움).
    // 필요 시 ?debug=true 등으로 옵셔널화하면 됨.

    // 라인별 누적기 (totalProducedKg, totalManagedKg, totalHours, count, totalProducedM)
    Map<String, double[]> lineAcc = new LinkedHashMap<>();
    for (String line : cardOrder) lineAcc.put(line, new double[]{0.0, 0.0, 0.0, 0.0, 0.0});

    // 시계열 누적기: (timeKey, lineKey) → [producedKg, managedKg, hours, count, producedM]
    //   timeKey = "01"~"12" (연 모드, 월) 또는 "01"~"31" (월 모드, 일)
    boolean dailyMode = (month != null && month >= 1 && month <= 12);
    java.util.TreeMap<String, Map<String, double[]>> timeAcc = new java.util.TreeMap<>();

    double overallProduced = 0.0;
    double overallProducedM = 0.0;
    double overallManaged = 0.0;
    double overallHours = 0.0;
    int totalCount = 0;
    int outlierCount = 0;
    // 진단 카운트 — 왜 비어/적게 보이는지 화면에 안내하기 위함
    int skippedNoWeight = 0;
    int skippedNoTime = 0;
    int skippedUnknownLine = 0;

    for (var r : rows) {
      String lineKey = support.matchLineToCard(r.getLineName(), cardOrder);
      if (lineKey == null) { skippedUnknownLine++; continue; }

      double produced = r.getProducedKg() == null ? 0.0 : r.getProducedKg();
      double producedM = r.getProducedM() == null ? 0.0 : r.getProducedM();
      double managed = r.getManagedKg() == null ? 0.0 : r.getManagedKg();
      if (produced <= 0) { skippedNoWeight++; continue; }
      if (r.getStartTime() == null || r.getEndTime() == null) { skippedNoTime++; continue; }

      double hours = java.time.Duration.between(r.getStartTime(), r.getEndTime()).toMillis() / 3_600_000.0;
      if (hours <= 0) { skippedNoTime++; continue; }

      double hourlyOutput = produced / hours;
      // 로스율 — 관리중량이 0이면 산출 불가 (skip)
      Double lossRate = managed > 0 ? (1.0 - produced / managed) * 100.0 : null;
      boolean outlier = lossRate != null && lossRate > thr;

      double[] acc = lineAcc.get(lineKey);
      acc[0] += produced;
      acc[1] += managed;
      acc[2] += hours;
      acc[3] += 1;
      acc[4] += producedM;

      // 시계열 누적
      if (r.getWorkDate() != null) {
        String timeKey = String.format("%02d",
            dailyMode ? r.getWorkDate().getDayOfMonth() : r.getWorkDate().getMonthValue());
        var lineMap = timeAcc.computeIfAbsent(timeKey, k -> new java.util.LinkedHashMap<>());
        double[] tAcc = lineMap.computeIfAbsent(lineKey, k -> new double[]{0.0, 0.0, 0.0, 0.0, 0.0});
        tAcc[0] += produced;
        tAcc[1] += managed;
        tAcc[2] += hours;
        tAcc[3] += 1;
        tAcc[4] += producedM;
      }

      overallProduced += produced;
      overallProducedM += producedM;
      overallManaged += managed;
      overallHours += hours;
      totalCount += 1;
      if (outlier) outlierCount += 1;

      // recentOrders 상세는 FE 표 제거로 더 이상 응답에 안 담음.
      //   대상 row 4624 모두를 KpiWorkOrder 로 변환하던 작업을 생략 — 응답 크기/자바 변환 시간 절약.
    }

    List<DashboardDto.KpiByLine> byLine = new ArrayList<>();
    for (String line : cardOrder) {
      double[] acc = lineAcc.get(line);
      int count = (int) acc[3];
      Double hourly = acc[2] > 0 ? support.round2(acc[0] / acc[2]) : null;
      Double hourlyM = (acc[2] > 0 && acc[4] > 0) ? support.round2(acc[4] / acc[2]) : null;
      Double loss = acc[1] > 0 ? support.round2((1.0 - acc[0] / acc[1]) * 100.0) : null;
      byLine.add(DashboardDto.KpiByLine.builder()
          .lineName(line)
          .workOrderCount(count)
          .totalProducedKg(support.round2(acc[0]))
          .totalProducedM(support.round2(acc[4]))
          .totalManagedKg(support.round2(acc[1]))
          .totalHours(support.round2(acc[2]))
          .hourlyOutputKg(hourly)
          .hourlyOutputM(hourlyM)
          .lossRate(loss)
          .build());
    }

    Double overallHourly = overallHours > 0 ? support.round2(overallProduced / overallHours) : null;
    Double overallHourlyM = (overallHours > 0 && overallProducedM > 0) ? support.round2(overallProducedM / overallHours) : null;
    Double overallLoss = overallManaged > 0 ? support.round2((1.0 - overallProduced / overallManaged) * 100.0) : null;

    return DashboardDto.KpiRes.builder()
        .periodFrom(from.toString())
        .periodTo(to.toString())
        .periodDays(periodDays)
        .lossThreshold(support.round2(thr))
        .totalWorkOrders(totalCount)
        .outlierCount(outlierCount)
        .overallHourlyOutputKg(overallHourly)
        .overallHourlyOutputM(overallHourlyM)
        .overallLossRate(overallLoss)
        .lines(cardOrder)
        .byLine(byLine)
        .recentOrders(java.util.List.of())     // FE 표 제거로 안 채움
        .totalWorkResults(rows.size())
        .skippedNoWeight(skippedNoWeight)
        .skippedNoTime(skippedNoTime)
        .skippedUnknownLine(skippedUnknownLine)
        .timeSeries(DashboardDto.KpiTimeSeries.builder()
            .granularity(dailyMode ? "day" : "month")
            .points(timeAcc.entrySet().stream().map(e -> {
              Map<String, DashboardDto.KpiTimeLineValue> byLineMap = new LinkedHashMap<>();
              for (String line : cardOrder) {
                double[] acc = e.getValue().get(line);
                if (acc == null) {
                  byLineMap.put(line, DashboardDto.KpiTimeLineValue.builder()
                      .workOrderCount(0).hourlyOutputKg(null).hourlyOutputM(null).lossRate(null).build());
                } else {
                  Double hourly = acc[2] > 0 ? support.round2(acc[0] / acc[2]) : null;
                  Double hourlyM = (acc[2] > 0 && acc[4] > 0) ? support.round2(acc[4] / acc[2]) : null;
                  Double loss = acc[1] > 0 ? support.round2((1.0 - acc[0] / acc[1]) * 100.0) : null;
                  byLineMap.put(line, DashboardDto.KpiTimeLineValue.builder()
                      .workOrderCount((int) acc[3])
                      .hourlyOutputKg(hourly)
                      .hourlyOutputM(hourlyM)
                      .lossRate(loss)
                      .build());
                }
              }
              return DashboardDto.KpiTimePoint.builder()
                  .label(e.getKey())
                  .byLine(byLineMap)
                  .build();
            }).collect(Collectors.toList()))
            .build())
        .dbgInRange(rows.size())
        .dbgHasWorkOrderSq(0)
        .dbgHasDtl(0)
        .dbgDtlHasWeight(0)
        .dbgDtlHasDims(0)
        .dbgHasPwr(0)
        .build();
  }
}
