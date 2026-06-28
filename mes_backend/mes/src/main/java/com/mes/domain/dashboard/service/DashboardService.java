package com.mes.domain.dashboard.service;

import com.mes.domain.dashboard.dto.DashboardDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

  private final DashboardFactoryService factoryService;
  private final DashboardKpiService kpiService;
  private final DashboardLogisticsService logisticsService;
  private final DashboardQualityService qualityService;

  public List<DashboardDto.ProcessStatusRes> getProcessStatus() {
    return factoryService.getProcessStatus();
  }

  public List<DashboardDto.ShipmentMonthlyRes> getShipmentMonthly(int year) {
    return logisticsService.getShipmentMonthly(year);
  }

  public DashboardDto.LineTrendRes getLineTrendMonthly(int year) {
    return factoryService.getLineTrendMonthly(year);
  }

  public DashboardDto.PlanVsActualRes getPlanVsActual(int year) {
    return factoryService.getPlanVsActual(year);
  }

  public DashboardDto.MaterialMonthlyRes getMaterialMonthly(int year, int month, int monthsBack) {
    return logisticsService.getMaterialMonthly(year, month, monthsBack);
  }

  public DashboardDto.FacilityReliabilityRes getFacilityReliability(int year) {
    return qualityService.getFacilityReliability(year);
  }

  public DashboardDto.WeightDeviationRes getWeightDeviation(int year, Double threshold) {
    return qualityService.getWeightDeviation(year, threshold);
  }

  public DashboardDto.InventoryTurnoverRes getInventoryTurnover(int year, int slowMovingDays) {
    return logisticsService.getInventoryTurnover(year, slowMovingDays);
  }

  public DashboardDto.CustomerClaimRes getCustomerClaim(int year) {
    return qualityService.getCustomerClaim(year);
  }

  public List<DashboardDto.NoticeRes> getActiveNotices() {
    return logisticsService.getActiveNotices();
  }

  public DashboardDto.KpiRes getKpi(int year, Integer month, Double threshold) {
    return kpiService.getKpi(year, month, threshold);
  }
}
