package com.mes.domain.dashboard.controller;

import com.mes.domain.dashboard.dto.DashboardDto;
import com.mes.domain.dashboard.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Year;
import java.time.YearMonth;
import java.util.List;

/**
 * 통합 대시보드 위젯용 읽기 전용 집계 엔드포인트 모음.
 * 각 핸들러는 위젯 1개에 대응하며, 연도 파라미터가 비면 현재 연도로 보정해 서비스에 위임한다.
 */
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "통합 대시보드 API")
public class DashboardController {

  private final DashboardService dashboardService;

  // 연도 파라미터 기본값 보정: 비어 있으면 올해를 사용한다.
  private int yearOrCurrent(Integer year) {
    return year != null ? year : Year.now().getValue();
  }

  @Operation(summary = "공장현황 모니터링", description = "라인별 최신 작업지시/상태/생산수량 카드")
  @GetMapping("/process/status")
  public List<DashboardDto.ProcessStatusRes> processStatus() {
    return dashboardService.getProcessStatus();
  }

  @Operation(summary = "월별 출하 계획/실적/달성률", description = "지정 연도의 1~12월 합계")
  @GetMapping("/shipment/monthly")
  public List<DashboardDto.ShipmentMonthlyRes> shipmentMonthly(
      @RequestParam(required = false) Integer year) {
    return dashboardService.getShipmentMonthly(yearOrCurrent(year));
  }

  @Operation(summary = "라인별 월별 생산추이", description = "라인 단위로 본 월별 양품 생산수량")
  @GetMapping("/line-trend/monthly")
  public DashboardDto.LineTrendRes lineTrendMonthly(
      @RequestParam(required = false) Integer year) {
    return dashboardService.getLineTrendMonthly(yearOrCurrent(year));
  }

  @Operation(summary = "생산계획 대비 실적", description = "월별·라인별 계획/실적/달성률 비교")
  @GetMapping("/production/plan-vs-actual")
  public DashboardDto.PlanVsActualRes planVsActual(
      @RequestParam(required = false) Integer year) {
    return dashboardService.getPlanVsActual(yearOrCurrent(year));
  }

  @Operation(summary = "자재 월별 입고요청/가입고/재고",
      description = "기준 (year, month) 으로부터 직전 monthsBack개월치 + 평균. monthsBack 기본 2")
  @GetMapping("/material/monthly")
  public DashboardDto.MaterialMonthlyRes materialMonthly(
      @RequestParam(required = false) Integer year,
      @RequestParam(required = false) Integer month,
      @RequestParam(required = false, defaultValue = "2") Integer monthsBack) {
    YearMonth current = YearMonth.now();
    int targetYear = year != null ? year : current.getYear();
    int targetMonth = month != null ? month : current.getMonthValue();
    return dashboardService.getMaterialMonthly(targetYear, targetMonth, monthsBack);
  }

  @Operation(summary = "설비 신뢰성 (MTBF/MTTR)",
      description = "고장 이력 기반 통계. action_date 미수집이면 MTTR 은 null 로 내려간다.")
  @GetMapping("/facility/reliability")
  public DashboardDto.FacilityReliabilityRes facilityReliability(
      @RequestParam(required = false) Integer year) {
    return dashboardService.getFacilityReliability(yearOrCurrent(year));
  }

  @Operation(summary = "중량 편차율",
      description = "라인×월 평균 편차율(부호 유지) + 제품/라인별 절대 편차율 + 준수율. "
          + "threshold 생략 시 서비스 기본값(1.5%) 사용.")
  @GetMapping("/weight-deviation")
  public DashboardDto.WeightDeviationRes weightDeviation(
      @RequestParam(required = false) Integer year,
      @RequestParam(required = false) Double threshold) {
    return dashboardService.getWeightDeviation(yearOrCurrent(year), threshold);
  }

  @Operation(summary = "완제품 재고회전율",
      description = "기간 출하량 / 현재 재고 기준. 자재·재공품은 데이터 미비로 제외.")
  @GetMapping("/inventory/turnover")
  public DashboardDto.InventoryTurnoverRes inventoryTurnover(
      @RequestParam(required = false) Integer year,
      @RequestParam(required = false, defaultValue = "30") Integer slowMovingDays) {
    return dashboardService.getInventoryTurnover(yearOrCurrent(year), slowMovingDays);
  }

  @Operation(summary = "고객 클레임", description = "부적합 중 occurType='CUSTOMER' 건의 연간 집계")
  @GetMapping("/quality/customer-claim")
  public DashboardDto.CustomerClaimRes customerClaim(
      @RequestParam(required = false) Integer year) {
    return dashboardService.getCustomerClaim(yearOrCurrent(year));
  }

  @Operation(summary = "공지사항 목록", description = "게시 상태 공지를 등록일 내림차순으로 반환")
  @GetMapping("/notice/list")
  public List<DashboardDto.NoticeRes> notices() {
    return dashboardService.getActiveNotices();
  }

  @Operation(summary = "KPI (시간당 생산량 + 로스율)",
      description = "작업지시 단위 집계. year 필수, month(1~12) 지정 시 해당 월만, 미지정/0 이면 연 전체. "
          + "threshold 생략 시 기본 3.0%.")
  @GetMapping("/kpi")
  public DashboardDto.KpiRes kpi(
      @RequestParam(required = false) Integer year,
      @RequestParam(required = false) Integer month,
      @RequestParam(required = false) Double threshold) {
    return dashboardService.getKpi(yearOrCurrent(year), month, threshold);
  }
}
