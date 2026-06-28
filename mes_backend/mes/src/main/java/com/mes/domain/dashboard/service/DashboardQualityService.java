package com.mes.domain.dashboard.service;

import com.mes.domain.dashboard.dto.DashboardDto;
import com.mes.global.support.EntityIndex;
import com.mes.domain.facility.entity.Facility;
import com.mes.domain.facility.entity.FacilityHistory;
import com.mes.domain.facility.repository.FacilityHistoryRepository;
import com.mes.domain.facility.repository.FacilityRepository;
import com.mes.domain.item.entity.Item;
import com.mes.domain.item.repository.ItemRepository;
import com.mes.domain.production.repository.ProductionWorkResultDetailRepository;
import com.mes.domain.quality.entity.Ncr;
import com.mes.domain.quality.entity.NcrActionStatus;
import com.mes.domain.quality.repository.NcrRepository;
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
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardQualityService {

  private final DashboardSupport support;
  private final ProductionWorkResultDetailRepository workResultDetailRepository;
  private final FacilityHistoryRepository facilityHistoryRepository;
  private final FacilityRepository facilityRepository;
  private final NcrRepository ncrRepository;
  private final ItemRepository itemRepository;

  /**
   * 설비 신뢰성 — 지정 연도 이력 기반 통계.
   * 현재 운영 데이터 한계: action_date/action_time이 비어있어 정확한 MTTR/MTBF는 산출 불가.
   * 계산 가능한 부분만 채우고 나머지는 null/플래그로 노출.
   */
  public DashboardDto.FacilityReliabilityRes getFacilityReliability(int year) {
    return support.withRedisCache("dashboard:facilityReliability:" + year, DashboardSupport.TTL_AGGREGATE,
        () -> computeFacilityReliability(year));
  }

  private DashboardDto.FacilityReliabilityRes computeFacilityReliability(int year) {
    LocalDate from = LocalDate.of(year, 1, 1);
    LocalDate to = LocalDate.of(year, 12, 31);

    List<FacilityHistory> histories = facilityHistoryRepository.findInPeriod(from, to);
    int totalFailures = histories.size();
    int totalFacilities = (int) facilityRepository.count();

    // 설비 정보 일괄 로드 (라인명 매핑용)
    java.util.Set<Long> facilitySqs = histories.stream()
        .map(FacilityHistory::getFacilitySq)
        .filter(java.util.Objects::nonNull)
        .collect(Collectors.toSet());
    Map<Long, Facility> facilityMap = EntityIndex.byId(
        new ArrayList<>(facilitySqs), facilityRepository::findAllById, Facility::getFacilitySq);

    // 월별 고장건수 / MTTR (occur→action 일수 평균)
    int[] failureByMonth = new int[13];
    long[] durationDaysByMonth = new long[13];
    int[] mttrCountByMonth = new int[13];

    Map<String, Integer> byActionType = new LinkedHashMap<>();
    Map<String, Integer> byFacility = new LinkedHashMap<>();
    Map<String, Integer> byLine = new LinkedHashMap<>();
    long totalDurationDays = 0;
    int mttrCount = 0;

    for (FacilityHistory h : histories) {
      LocalDate occ = h.getOccurDate();
      if (occ == null) continue;
      int m = occ.getMonthValue();
      failureByMonth[m] += 1;

      if (h.getActionDate() != null) {
        long days = java.time.temporal.ChronoUnit.DAYS.between(occ, h.getActionDate());
        if (days < 0) days = 0;
        durationDaysByMonth[m] += days;
        mttrCountByMonth[m] += 1;
        totalDurationDays += days;
        mttrCount += 1;
      }

      String at = h.getActionType() == null || h.getActionType().isBlank() ? "미분류" : h.getActionType();
      byActionType.merge(at, 1, Integer::sum);

      Facility f = h.getFacilitySq() == null ? null : facilityMap.get(h.getFacilitySq());
      String facilityName = f == null ? "설비#" + h.getFacilitySq() : f.getFacilityName();
      byFacility.merge(facilityName, 1, Integer::sum);
      String lineName = f == null || f.getLineNm() == null || f.getLineNm().isBlank() ? "미지정" : f.getLineNm();
      byLine.merge(lineName, 1, Integer::sum);
    }

    List<DashboardDto.ReliabilityMonth> monthly = new ArrayList<>(12);
    for (int m = 1; m <= 12; m++) {
      Double mttr = null;
      if (mttrCountByMonth[m] > 0) {
        // 일수 → 시간 변환 (24h)
        mttr = (durationDaysByMonth[m] * 24.0) / mttrCountByMonth[m];
      }
      monthly.add(DashboardDto.ReliabilityMonth.builder()
          .month(m)
          .failureCount(failureByMonth[m])
          .mttrHours(mttr)
          .build());
    }

    Double avgMttr = mttrCount > 0 ? (totalDurationDays * 24.0) / mttrCount : null;
    String topActionType = byActionType.entrySet().stream()
        .max(Map.Entry.comparingByValue())
        .map(Map.Entry::getKey)
        .orElse(null);

    // 최근 N건 incident (DESC 정렬되어 있음)
    int limit = Math.min(10, histories.size());
    List<DashboardDto.ReliabilityIncident> recent = new ArrayList<>(limit);
    for (int i = 0; i < limit; i++) {
      FacilityHistory h = histories.get(i);
      Facility f = h.getFacilitySq() == null ? null : facilityMap.get(h.getFacilitySq());
      Double duration = null;
      if (h.getOccurDate() != null && h.getActionDate() != null) {
        long days = java.time.temporal.ChronoUnit.DAYS.between(h.getOccurDate(), h.getActionDate());
        duration = Math.max(0, days) * 24.0;
      }
      recent.add(DashboardDto.ReliabilityIncident.builder()
          .historySq(h.getHistorySq())
          .occurDate(h.getOccurDate() == null ? null : h.getOccurDate().toString())
          .facilityName(f == null ? null : f.getFacilityName())
          .lineName(f == null ? null : f.getLineNm())
          .actionType(h.getActionType())
          .occurContent(h.getOccurContent())
          .actionContent(h.getActionContent())
          .actionDate(h.getActionDate() == null ? null : h.getActionDate().toString())
          .durationHours(duration)
          .build());
    }

    return DashboardDto.FacilityReliabilityRes.builder()
        .totalFailures(totalFailures)
        .totalFacilities(totalFacilities)
        .avgMttrHours(avgMttr)
        .topActionType(topActionType)
        .hasMttrData(mttrCount > 0)
        .monthly(monthly)
        .byActionType(toCountList(byActionType))
        .byFacility(toCountList(byFacility))
        .byLine(toCountList(byLine))
        .recent(recent)
        .build();
  }

  /**
   * 중량 편차율 — 생산일보 LOT 실측 평량(real_basis_weight) vs 품목 마스터 평량(basis_weight) 비교.
   *   편차율(%) = (real - basis) / basis × 100
   * KPI는 |편차율| 기준, 판정 표 행은 부호 유지.
   *
   * @param year      조회 연도
   * @param threshold 허용 편차 임계값(%) — null 또는 ≤ 0 이면 기본 1.5
   */
  public DashboardDto.WeightDeviationRes getWeightDeviation(int year, Double threshold) {
    final double thr = (threshold == null || threshold <= 0) ? 1.5 : threshold;
    return support.withRedisCache("dashboard:weightDeviation:" + year + ":" + thr, DashboardSupport.TTL_AGGREGATE,
        () -> computeWeightDeviation(year, thr));
  }

  private DashboardDto.WeightDeviationRes computeWeightDeviation(int year, double thr) {
    final int RECENT_WINDOW = 30;
    final int MAX_JUDGEMENT_ROWS = 200;

    LocalDate from = LocalDate.of(year, 1, 1);
    LocalDate to = LocalDate.of(year, 12, 31);

    List<String> cardOrder = new ArrayList<>();
    for (String line : support.loadLineNames()) {
      String key = support.toCardKey(line);
      if (!cardOrder.contains(key)) cardOrder.add(key);
    }

    var rows = workResultDetailRepository.findWeightDeviationRows(from, to);

    Map<Integer, Map<String, Accumulator>> lineMonth = new HashMap<>();
    for (int m = 1; m <= 12; m++) lineMonth.put(m, new HashMap<>());
    Map<String, Accumulator> byLineAcc = new LinkedHashMap<>();
    for (String line : cardOrder) byLineAcc.put(line, new Accumulator());
    Map<String, Accumulator> byProductAcc = new LinkedHashMap<>();
    Map<String, Integer> byProductExceeded = new HashMap<>();
    Map<String, String> productNameMap = new HashMap<>();

    Accumulator overall = new Accumulator();
    int exceededTotal = 0;
    List<JudgementStage> stage = new ArrayList<>();

    for (var r : rows) {
      Double basisD = r.getBasisWeight();
      if (basisD == null || basisD <= 0) continue;
      Double realBd = r.getRealBasisWeight();
      if (realBd == null) continue;
      Integer month = r.getMonth();
      if (month == null) continue;
      String lineKey = support.matchLineToCard(r.getLineName(), cardOrder);
      if (lineKey == null) continue;

      double basis = basisD;
      double real = realBd;
      double signedRate = (real - basis) / basis * 100.0;
      double absRate = Math.abs(signedRate);
      boolean exceeded = absRate > thr;

      overall.add(absRate);
      if (exceeded) exceededTotal++;
      lineMonth.get(month).computeIfAbsent(lineKey, k -> new Accumulator()).add(absRate);
      byLineAcc.get(lineKey).add(absRate);

      String code = r.getItemCode() == null ? "(미지정)" : r.getItemCode();
      byProductAcc.computeIfAbsent(code, k -> new Accumulator()).add(absRate);
      if (exceeded) byProductExceeded.merge(code, 1, Integer::sum);
      productNameMap.putIfAbsent(code, r.getItemName());

      JudgementStage j = new JudgementStage();
      j.resultDtlSq = r.getResultDtlSq();
      j.workDate = r.getWorkDate();
      j.lineName = lineKey;
      j.itemCode = code;
      j.itemName = r.getItemName();
      j.lotNo = r.getLotNo();
      j.rollNo = r.getRollNo();
      j.basisWeight = basis;
      j.realBasisWeight = real;
      j.deviationRate = signedRate;
      j.absDeviationRate = absRate;
      j.judgement = exceeded ? "주의" : "양호";
      stage.add(j);
    }

    // 라인별 월별 |편차율| 평균 (차트)
    List<DashboardDto.WeightDeviationLineMonth> monthly = new ArrayList<>(12);
    for (int m = 1; m <= 12; m++) {
      Map<String, Double> rates = new LinkedHashMap<>();
      var monthMap = lineMonth.get(m);
      for (String line : cardOrder) {
        Accumulator acc = monthMap.get(line);
        rates.put(line, acc == null || acc.count == 0 ? 0.0 : support.round2(acc.mean()));
      }
      monthly.add(DashboardDto.WeightDeviationLineMonth.builder()
          .month(m).rates(rates).build());
    }

    // 최대 편차 라인 — |편차율| 평균이 가장 큰 라인
    String maxLineName = null;
    double maxLineRate = -1.0;
    for (var e : byLineAcc.entrySet()) {
      Accumulator a = e.getValue();
      if (a.count == 0) continue;
      double mean = a.mean();
      if (mean > maxLineRate) {
        maxLineRate = mean;
        maxLineName = e.getKey();
      }
    }

    // 제품별 (평균 |편차율| 큰 순)
    List<DashboardDto.WeightDeviationByProduct> byProduct = byProductAcc.entrySet().stream()
        .map(e -> {
          Accumulator a = e.getValue();
          return DashboardDto.WeightDeviationByProduct.builder()
              .itemCode(e.getKey())
              .itemName(productNameMap.get(e.getKey()))
              .rollCount(a.count)
              .avgDeviationRate(support.round2(a.mean()))
              .maxDeviationRate(support.round2(a.max))
              .exceededCount(byProductExceeded.getOrDefault(e.getKey(), 0))
              .build();
        })
        .sorted((a, b) -> Double.compare(b.getAvgDeviationRate(), a.getAvgDeviationRate()))
        .collect(Collectors.toList());

    // 판정 행: 생산일보 추가 순 — workDate DESC, resultDtlSq DESC (최신 우선)
    stage.sort((a, b) -> {
      int dateCmp = support.nullSafeCompare(b.workDate, a.workDate);
      if (dateCmp != 0) return dateCmp;
      long sa = a.resultDtlSq == null ? Long.MIN_VALUE : a.resultDtlSq;
      long sb = b.resultDtlSq == null ? Long.MIN_VALUE : b.resultDtlSq;
      return Long.compare(sb, sa);
    });

    int recentExceeded = 0;
    int recentTaken = Math.min(RECENT_WINDOW, stage.size());
    for (int i = 0; i < recentTaken; i++) {
      if (stage.get(i).absDeviationRate > thr) recentExceeded++;
    }

    double complianceRate = overall.count == 0
        ? 0.0
        : (100.0 * (overall.count - exceededTotal) / overall.count);

    List<DashboardDto.WeightDeviationJudgement> recentJudgements = stage.stream()
        .limit(MAX_JUDGEMENT_ROWS)
        .map(j -> DashboardDto.WeightDeviationJudgement.builder()
            .resultDtlSq(j.resultDtlSq)
            .workDate(j.workDate == null ? null : j.workDate.toString())
            .lineName(j.lineName)
            .itemCode(j.itemCode)
            .itemName(j.itemName)
            .lotNo(j.lotNo)
            .rollNo(j.rollNo)
            .basisWeight(support.round2(j.basisWeight))
            .realBasisWeight(support.round2(j.realBasisWeight))
            .deviationRate(support.round2(j.deviationRate))
            .judgement(j.judgement)
            .build())
        .collect(Collectors.toList());

    return DashboardDto.WeightDeviationRes.builder()
        .totalRolls(overall.count)
        .allowedThreshold(support.round2(thr))
        .avgDeviationRate(overall.count == 0 ? null : support.round2(overall.mean()))
        .maxDeviationLineName(maxLineName)
        .maxDeviationLineRate(maxLineName == null ? null : support.round2(maxLineRate))
        .recentRollsWindow(RECENT_WINDOW)
        .recentRollsExceeded(recentExceeded)
        .complianceRate(overall.count == 0 ? null : support.round2(complianceRate))
        .unit("%")
        .lines(cardOrder)
        .monthlyDeviationByLine(monthly)
        .byProductDeviation(byProduct)
        .recentJudgements(recentJudgements)
        .build();
  }

  private List<DashboardDto.ReliabilityCount> toCountList(Map<String, Integer> map) {
    return map.entrySet().stream()
        .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
        .map(e -> DashboardDto.ReliabilityCount.builder()
            .label(e.getKey())
            .count(e.getValue())
            .build())
        .collect(Collectors.toList());
  }

  // 고객 클레임 — 품질관리 부적합 중 occurType='CUSTOMER' 만 집계.
  // 데이터가 없으면 모든 카운트 0으로 정상 응답 (빈 차트/표는 프론트에서 처리).
  public DashboardDto.CustomerClaimRes getCustomerClaim(int year) {
    return support.withRedisCache("dashboard:customerClaim:" + year, DashboardSupport.TTL_AGGREGATE,
        () -> computeCustomerClaim(year));
  }

  private DashboardDto.CustomerClaimRes computeCustomerClaim(int year) {
    LocalDate from = LocalDate.of(year, 1, 1);
    LocalDate to = LocalDate.of(year, 12, 31);
    List<Ncr> ncrs = ncrRepository.findBySearchCondition(from, to, "CUSTOMER");

    int[] monthCount = new int[13]; // index 1..12
    int doneCount = 0;
    int waitCount = 0;
    Map<String, Integer> byDefectType = new LinkedHashMap<>();
    Map<String, Integer> byCustomer = new LinkedHashMap<>();

    for (Ncr n : ncrs) {
      if (n.getOccurDate() != null) {
        int mo = n.getOccurDate().getMonthValue();
        if (mo >= 1 && mo <= 12) monthCount[mo]++;
      }
      if (n.getActionStatus() == NcrActionStatus.DONE) doneCount++;
      else waitCount++;

      String dt = (n.getDefectType() == null || n.getDefectType().isBlank()) ? "미분류" : n.getDefectType();
      byDefectType.merge(dt, 1, Integer::sum);

      String cust = (n.getOccurPlace() == null || n.getOccurPlace().isBlank()) ? "미지정" : n.getOccurPlace();
      byCustomer.merge(cust, 1, Integer::sum);
    }

    int total = ncrs.size();
    int currentMonth = LocalDate.now().getMonthValue();
    int curCount = (currentMonth >= 1 && currentMonth <= 12) ? monthCount[currentMonth] : 0;
    int prevCount = (currentMonth >= 2) ? monthCount[currentMonth - 1] : 0;

    // Top 유형/고객
    String topDefect = byDefectType.entrySet().stream()
        .max(Map.Entry.comparingByValue())
        .map(Map.Entry::getKey).orElse("-");
    int topDefectCount = byDefectType.getOrDefault(topDefect, 0);
    String topCustomer = byCustomer.entrySet().stream()
        .max(Map.Entry.comparingByValue())
        .map(Map.Entry::getKey).orElse("-");
    int topCustomerCount = byCustomer.getOrDefault(topCustomer, 0);

    // 월별 시리즈
    List<DashboardDto.ClaimMonthCount> monthly = new ArrayList<>(12);
    for (int m = 1; m <= 12; m++) {
      monthly.add(DashboardDto.ClaimMonthCount.builder()
          .month(m)
          .count(monthCount[m])
          .build());
    }

    // 부적합유형/고객 Top N (정렬 후 빌더)
    List<DashboardDto.ClaimCountItem> defectList = toClaimCountList(byDefectType, 8);
    List<DashboardDto.ClaimCountItem> customerList = toClaimCountList(byCustomer, 8);

    // 조치상태
    List<DashboardDto.ClaimCountItem> statusList = new ArrayList<>();
    statusList.add(DashboardDto.ClaimCountItem.builder().label("조치완료").count(doneCount).build());
    statusList.add(DashboardDto.ClaimCountItem.builder().label("미조치").count(waitCount).build());

    // 최근 항목 — repo 가 occurDate DESC, ncrSq DESC 정렬해 줌
    int recentLimit = 10;
    List<Ncr> recentList = ncrs.size() <= recentLimit ? ncrs : ncrs.subList(0, recentLimit);
    Set<Long> itemSqs = recentList.stream()
        .map(Ncr::getItemSq).filter(java.util.Objects::nonNull)
        .collect(Collectors.toSet());
    Map<Long, Item> itemMap = EntityIndex.byId(
        new ArrayList<>(itemSqs), itemRepository::findAllById, Item::getItemSq);

    List<DashboardDto.ClaimRecentItem> recent = new ArrayList<>(recentList.size());
    for (Ncr n : recentList) {
      Item item = n.getItemSq() == null ? null : itemMap.get(n.getItemSq());
      recent.add(DashboardDto.ClaimRecentItem.builder()
          .ncrSq(n.getNcrSq())
          .occurDate(n.getOccurDate() == null ? null : n.getOccurDate().toString())
          .occurPlace(n.getOccurPlace())
          .itemCode(item == null ? null : item.getItemCode())
          .itemName(item == null ? null : item.getItemName())
          .lotNo(n.getLotNo())
          .defectType(n.getDefectType())
          .actionStatus(n.getActionStatus() == null ? null : n.getActionStatus().name())
          .actionStatusLabel(n.getActionStatus() == NcrActionStatus.DONE ? "조치완료" : "미조치")
          .build());
    }

    return DashboardDto.CustomerClaimRes.builder()
        .totalCount(total)
        .currentMonthCount(curCount)
        .prevMonthCount(prevCount)
        .doneCount(doneCount)
        .waitCount(waitCount)
        .topDefectType(topDefect)
        .topDefectCount(topDefectCount)
        .topCustomer(topCustomer)
        .topCustomerCount(topCustomerCount)
        .monthly(monthly)
        .byDefectType(defectList)
        .byCustomer(customerList)
        .byStatus(statusList)
        .recent(recent)
        .build();
  }

  private List<DashboardDto.ClaimCountItem> toClaimCountList(Map<String, Integer> map, int limit) {
    return map.entrySet().stream()
        .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
        .limit(limit)
        .map(e -> DashboardDto.ClaimCountItem.builder()
            .label(e.getKey())
            .count(e.getValue())
            .build())
        .collect(Collectors.toList());
  }
}
