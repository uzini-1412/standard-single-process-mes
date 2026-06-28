package com.mes.domain.dashboard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 대시보드 응답 모델 모음.
 *
 * <p>각 위젯(공장현황·출하·생산추이·자재·설비신뢰성·중량편차·클레임·재고회전·KPI)이
 * 반환하는 read-only 응답 타입을 한 파일에 모아둔다. 모든 필드는 프론트 JSON 키 계약이므로
 * 식별자명·타입은 고정이고, 선언 순서/주석만 자유롭게 정리한다.
 */
public class DashboardDto {

  // ─────────────────────────────────────────────────────────
  // 1. 공장현황 모니터링 — 라인 카드
  // ─────────────────────────────────────────────────────────

  @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
  public static class ProcessStatusRes {
    private Long lineSq;
    private String lineName;
    private Long workOrderSq;
    private boolean hasWorkOrder;    // 최근 작업지시 매칭 여부 (false → "등록된 작업 없음")
    private String workStatus;       // RUN / STOP / ERROR / NO_WORK
    private String itemCode;
    private String itemName;
    private Double basisWeight;      // 품목 마스터 평량 (g/m²)
    private Double productionQty;
    private List<String> imageUrls;  // 품목 이미지 (최대 2장). 없으면 빈 리스트
  }

  // ─────────────────────────────────────────────────────────
  // 2. 출하 계획/실적/달성률 (월별)
  // ─────────────────────────────────────────────────────────

  @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
  public static class ShipmentMonthlyRes {
    private int month;
    private Double planQty;
    private Double actualQty;
    private Double achievementRate;
  }

  // ─────────────────────────────────────────────────────────
  // 3. 라인별 생산추이 + 생산계획 대비 실적
  // ─────────────────────────────────────────────────────────

  @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
  public static class LineTrendMonthlyRow {
    private int month;
    private Map<String, Double> values;
  }

  @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
  public static class LineTrendRes {
    private List<String> lines;
    private List<LineTrendMonthlyRow> rows;
    // 전체(라인 무관) 월별 고유 작업일수. index 0=1월 … 11=12월, 실적 없는 달은 0. 분모 후보.
    private List<Integer> workDays;
    private int totalWorkDays;                       // 해당 연도 전체 고유 작업일수
    // 라인별 월별 고유 작업일수. key=카드 키(파우더 통합 반영), value=길이 12 리스트.
    // 프론트는 가시 라인 중 MAX 를 분모로 써서 라인 필터에 반응한다.
    private Map<String, List<Integer>> workDaysByLine;
  }

  @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
  public static class PlanVsActualMonthly {
    private int month;
    private Double planQty;
    private Double actualQty;
    private Double achievementRate;
  }

  @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
  public static class PlanVsActualByLine {
    private String lineName;
    private Double planQty;
    private Double actualQty;
    private Double achievementRate;
  }

  @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
  public static class PlanVsActualRes {
    private List<PlanVsActualMonthly> monthly;
    private List<PlanVsActualByLine> byLine;
  }

  // ─────────────────────────────────────────────────────────
  // 4. 자재 월별 입고요청 / 가입고 / 재고
  // ─────────────────────────────────────────────────────────

  @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
  public static class MaterialMonthEntry {
    private int year;
    private int month;
    private Double requestQty;   // 입고요청량 (발주 in_req_date 기준)
    private Double inboundQty;   // 실입고량 (검사 합격 + 무검사 가입고. WAIT/REJECT 제외)
    private Double endStockQty;  // 월말 재고
  }

  @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
  public static class MaterialMonthlyRes {
    private List<MaterialMonthEntry> months;
    private MaterialMonthEntry average;
  }

  // ─────────────────────────────────────────────────────────
  // 5. 설비 신뢰성 (MTBF / MTTR)
  // ─────────────────────────────────────────────────────────

  @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
  public static class ReliabilityMonth {
    private int month;
    private int failureCount;
    private Double mttrHours;      // null = 계산 불가
  }

  @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
  public static class ReliabilityCount {
    private String label;
    private int count;
  }

  @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
  public static class ReliabilityIncident {
    private Long historySq;
    private String occurDate;
    private String facilityName;
    private String lineName;
    private String actionType;
    private String occurContent;
    private String actionContent;
    private String actionDate;
    private Double durationHours; // null = 계산 불가
  }

  @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
  public static class FacilityReliabilityRes {
    private int totalFailures;
    private int totalFacilities;
    private Double avgMttrHours;       // null = 계산 불가
    private String topActionType;
    private Boolean hasMttrData;       // action_date 수집 여부
    private List<ReliabilityMonth> monthly;       // 12개월
    private List<ReliabilityCount> byActionType;  // 액션 유형 분포
    private List<ReliabilityCount> byFacility;    // 설비별 발생 건수
    private List<ReliabilityCount> byLine;        // 라인별 발생 건수
    private List<ReliabilityIncident> recent;     // 최근 N건
  }

  // ─────────────────────────────────────────────────────────
  // 6. 중량 편차율
  // ─────────────────────────────────────────────────────────

  @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
  public static class WeightDeviationLineMonth {
    // 라인×월 평균 |편차율|(%) — 추이 차트 한 점
    private int month;
    private Map<String, Double> rates;   // 라인 → 월 평균 |편차율|(%). 데이터 없으면 0
  }

  @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
  public static class WeightDeviationByProduct {
    // 제품별 평균 |편차율|(%) — 막대 그래프
    private String itemCode;
    private String itemName;
    private int rollCount;
    private Double avgDeviationRate;     // 평균 |편차율|(%) — 막대 길이
    private Double maxDeviationRate;     // 제품 내 최대 |편차율|(%)
    private int exceededCount;           // 허용 편차 초과 롤 수
  }

  @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
  public static class WeightDeviationJudgement {
    // 생산일보 판정 현황 행 (추가 순)
    private Long resultDtlSq;            // 정렬·식별
    private String workDate;             // YYYY-MM-DD
    private String lineName;
    private String itemCode;
    private String itemName;
    private String lotNo;
    private Integer rollNo;
    private Double basisWeight;          // 기준 평량 (g/m²)
    private Double realBasisWeight;      // 실측 평량 (g/m²)
    private Double deviationRate;        // 편차율(%) — 부호 유지 ((real-basis)/basis × 100)
    private String judgement;            // "양호" | "주의"
  }

  @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
  public static class WeightDeviationRes {
    // KPI 카드 (상단 4종)
    private int totalRolls;              // 전체 LOT 수
    private Double allowedThreshold;     // 적용 허용 편차(%) — 기본 1.5
    private Double avgDeviationRate;     // 전체 평균 |편차율|(%)
    private String maxDeviationLineName; // 최대 편차 라인명
    private Double maxDeviationLineRate; // 그 라인 평균 |편차율|(%)
    private int recentRollsWindow;       // 30
    private int recentRollsExceeded;     // 최근 N롤 중 임계 초과 수
    private Double complianceRate;       // 표준 준수율(%) = 임계 이내 비율
    // 차트/표
    private String unit;                 // "%"
    private List<String> lines;          // 라인 목록 (마스터 순서)
    private List<WeightDeviationLineMonth> monthlyDeviationByLine; // 라인별 월별 |편차율| 추이
    private List<WeightDeviationByProduct> byProductDeviation;     // 제품별 평균 |편차율|
    private List<WeightDeviationJudgement> recentJudgements;       // 추가 순 판정 현황
  }

  // ─────────────────────────────────────────────────────────
  // 7. 고객 클레임 (품질 부적합 occurType=CUSTOMER)
  // ─────────────────────────────────────────────────────────

  @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
  public static class ClaimMonthCount {
    private int month;
    private int count;
  }

  @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
  public static class ClaimCountItem {
    private String label;
    private int count;
  }

  @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
  public static class ClaimRecentItem {
    private Long ncrSq;
    private String occurDate;         // YYYY-MM-DD
    private String occurPlace;        // 거래처/고객
    private String itemCode;
    private String itemName;
    private String lotNo;
    private String defectType;
    private String actionStatus;      // WAIT / DONE
    private String actionStatusLabel; // 미조치 / 조치완료
  }

  @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
  public static class CustomerClaimRes {
    private int totalCount;          // 연간 누적
    private int currentMonthCount;   // 당월 발생
    private int prevMonthCount;      // 전월 발생 (delta 표시)
    private int doneCount;           // 조치완료
    private int waitCount;           // 미조치
    private String topDefectType;    // 최다 부적합유형
    private int topDefectCount;
    private String topCustomer;      // 최다 발생 고객
    private int topCustomerCount;
    private List<ClaimMonthCount> monthly;        // 1~12월
    private List<ClaimCountItem> byDefectType;    // 부적합유형 Top N
    private List<ClaimCountItem> byCustomer;      // 고객사 Top N
    private List<ClaimCountItem> byStatus;        // 조치상태별
    private List<ClaimRecentItem> recent;         // 최근 N건
  }

  // ─────────────────────────────────────────────────────────
  // 8. 완제품 재고 회전율
  // ─────────────────────────────────────────────────────────

  @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
  public static class TurnoverMonth {
    private int month;
    private Double shippedQty;       // m
  }

  @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
  public static class TurnoverBySku {
    private String itemCode;
    private String itemName;
    private Double currentStockM;     // 현재 재고 (m)
    private Double shippedQtyM;       // 기간 출하량 (m)
    private Double turnover;           // 회전수 (출하 ÷ 재고)
    private Double avgDaysOnHand;      // 평균 재고일수 (365 / 회전수)
    private String lastOutDate;        // 마지막 출하/출고일
    private String status;             // 정상 / 슬로무빙 / 무재고
  }

  @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
  public static class InventoryTurnoverRes {
    private String asOf;                  // 재고 조회 시점
    private int periodDays;               // 출하 집계 기간(일)
    private Double totalStockM;           // 전체 현재 재고
    private Double totalShippedM;         // 기간 출하량
    private Double turnover;              // 전체 회전수
    private Double avgDaysOnHand;         // 365 ÷ 회전수
    private int totalSkuCount;            // 재고 보유 SKU 수
    private int slowMovingSkuCount;       // 슬로무빙 SKU 수 (>= slowMovingDays 또는 출하 0)
    private int slowMovingDays;           // 슬로무빙 기준 일수 (기본 30)
    private List<TurnoverMonth> monthlyShipped;   // 월별 출하량
    private List<TurnoverBySku> bySku;             // SKU별 (Top N)
    private List<TurnoverBySku> slowMoving;        // 슬로무빙 SKU (재고 보유 + 출하 미발생)
  }

  // ─────────────────────────────────────────────────────────
  // 9. 공지사항
  // ─────────────────────────────────────────────────────────

  @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
  public static class NoticeRes {
    private Long noticeSq;
    private String noticeTitle;
    private String noticeContent;
    private LocalDate regDt;
  }

  // ─────────────────────────────────────────────────────────
  // 10. KPI — 시간당 생산량 + 로스율
  //   작업지시 단위 집계. work_start_time ~ work_end_time 으로 가동시간 산출.
  //   로스율 = 1 - SUM(실측 roll_weight) / SUM(관리롤중량).
  //   관리롤중량 = pw.roll_production_weight 우선, 없으면 wo.manage_weight × pw.width × pw.length / 1e6.
  // ─────────────────────────────────────────────────────────

  @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
  public static class KpiTimeLineValue {
    // 라인×시점 1점 (시간당·로스율)
    private int workOrderCount;          // 해당 시점·라인의 생산일보 수
    private Double hourlyOutputKg;       // null = 가동시간 0
    private Double hourlyOutputM;        // null = 가동시간 0 또는 생산길이 0
    private Double lossRate;             // null = 관리중량 0. 음수 가능(실측 > 관리)
  }

  @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
  public static class KpiTimePoint {
    // 시계열 한 점 (한 월 또는 한 일)
    private String label;                // 연 모드 "01"~"12", 월 모드 "01"~"31" (데이터 있는 날만)
    private Map<String, KpiTimeLineValue> byLine;
  }

  @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
  public static class KpiTimeSeries {
    // 차트 입력 — 라인 토글은 FE 에서 필터
    private String granularity;          // "month"(연 모드) | "day"(월 모드)
    private List<KpiTimePoint> points;   // 데이터 있는 시점만, 시간 오름차순
  }

  @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
  public static class KpiByLine {
    private String lineName;
    private int workOrderCount;
    private Double totalProducedKg;     // 라인 합산 실측 생산중량
    private Double totalProducedM;      // 라인 합산 생산 길이(m)
    private Double totalManagedKg;      // 라인 합산 관리롤중량 (= 투입중량)
    private Double totalHours;          // 라인 합산 가동시간
    private Double hourlyOutputKg;      // totalProducedKg / totalHours
    private Double hourlyOutputM;       // totalProducedM  / totalHours
    private Double lossRate;            // (managed - produced) / managed × 100 (%)
  }

  @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
  public static class KpiWorkOrder {
    private Long resultSq;              // 생산일보 1행 식별자
    private Long workOrderSq;           // nullable — 시드데이터는 작업지시 없음
    private String workDate;            // YYYY-MM-DD (생산일보 work_date)
    private String lineName;            // 마스터 카드 키로 정규화된 라인명
    private String itemCode;
    private String itemName;
    private Double producedKg;
    private Double managedKg;
    private Double durationHours;
    private Double hourlyOutputKg;
    private Double lossRate;            // (%)
    private Boolean lossOutlier;        // lossRate > threshold
  }

  @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
  public static class KpiRes {
    private String periodFrom;          // YYYY-MM-DD
    private String periodTo;            // YYYY-MM-DD
    private int periodDays;             // 조회 기간(일)
    private Double lossThreshold;       // 적용 이상치 기준(%)
    private int totalWorkOrders;        // 집계 대상 생산일보 수 (필드명 유지)
    private int outlierCount;           // 이상치 초과 생산일보 수
    private Double overallHourlyOutputKg; // 전체 평균 시간당 생산량 (kg/h)
    private Double overallHourlyOutputM;  // 전체 평균 시간당 생산량 (m/h)
    private Double overallLossRate;     // 전체 평균 로스율 (%)
    private List<String> lines;         // 마스터 카드 순서
    private List<KpiByLine> byLine;     // 라인별 합산
    private List<KpiWorkOrder> recentOrders; // 생산일보 단위 상세 (최신순)
    // 진단 — 집계 0건/부족 사유 안내
    private int totalWorkResults;       // 기간 안 work_result 총 행 수 (필터 전)
    private int skippedNoWeight;        // 제품중량(roll_weight) 미입력으로 제외
    private int skippedNoTime;          // 시작/종료시간 없어 제외
    private int skippedUnknownLine;     // 라인이 마스터에 없어 제외
    // 디버그 카운트 (SQL 단계별)
    private int dbgInRange;             // 기간 안 work_result 총 (필터 전)
    private int dbgHasWorkOrderSq;      // 그 중 work_order_sq 채워진 수
    private int dbgHasDtl;              // 그 중 work_result_dtl 1행 이상
    private int dbgDtlHasWeight;        // 그 중 dtl gross/net_weight > 0
    private int dbgDtlHasDims;          // 그 중 dtl prod_width/length 둘 다 존재
    private int dbgHasPwr;              // 그 중 PWR(roll_weight > 0) 매칭
    // 시계열 (차트)
    private KpiTimeSeries timeSeries;
  }
}
