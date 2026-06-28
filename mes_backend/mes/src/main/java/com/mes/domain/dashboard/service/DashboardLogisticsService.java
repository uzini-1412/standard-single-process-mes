package com.mes.domain.dashboard.service;

import com.mes.domain.dashboard.dto.DashboardDto;
import com.mes.global.support.EntityIndex;
import com.mes.domain.item.entity.Item;
import com.mes.domain.item.repository.ItemRepository;
import com.mes.domain.material.repository.MaterialInboundRepository;
import com.mes.domain.notice.entity.Notice;
import com.mes.domain.notice.repository.NoticeRepository;
import com.mes.domain.purchase.repository.PurchaseOrderDetailRepository;
import com.mes.domain.shipment.repository.ShipmentPlanRepository;
import com.mes.domain.shipment.repository.ShipmentResultRepository;
import com.mes.domain.stock.repository.ProductStockRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardLogisticsService {

  private final DashboardSupport support;
  private final ShipmentPlanRepository shipmentPlanRepository;
  private final ShipmentResultRepository shipmentResultRepository;
  private final ItemRepository itemRepository;
  private final PurchaseOrderDetailRepository purchaseOrderDetailRepository;
  private final MaterialInboundRepository materialInboundRepository;
  private final ProductStockRepository productStockRepository;
  private final NoticeRepository noticeRepository;
  private final Executor dashboardQueryExecutor;

  // 자재 후보 추출용 회계구분
  private static final List<String> MATERIAL_ACCOUNT_TYPES =
      List.of("매입(원재료)", "매입(부자재)");

  // 출하 월별 계획/실적/달성률 (1~12월)
  public List<DashboardDto.ShipmentMonthlyRes> getShipmentMonthly(int year) {
    return support.withRedisCache("dashboard:shipmentMonthly:" + year, DashboardSupport.TTL_AGGREGATE,
        () -> computeShipmentMonthly(year));
  }

  private List<DashboardDto.ShipmentMonthlyRes> computeShipmentMonthly(int year) {
    LocalDate from = LocalDate.of(year, 1, 1);
    LocalDate to = LocalDate.of(year, 12, 31);

    Double[] planByMonth = support.zeroMonthArray();
    Double[] actualByMonth = support.zeroMonthArray();

    // 계획/실적 집계는 서로 독립적이라 병렬로 조회한다(각 쿼리는 자체 read-only 트랜잭션).
    var planF = CompletableFuture.supplyAsync(
        () -> shipmentPlanRepository.sumPlanQtyGroupByMonth(from, to), dashboardQueryExecutor);
    var actualF = CompletableFuture.supplyAsync(
        () -> shipmentResultRepository.sumShippedQtyGroupByMonth(from, to), dashboardQueryExecutor);
    for (var p : planF.join()) {
      if (p.getMonth() == null) continue;
      planByMonth[p.getMonth()] = p.getQty() == null ? 0.0 : p.getQty().doubleValue();
    }
    for (var r : actualF.join()) {
      if (r.getMonth() == null) continue;
      actualByMonth[r.getMonth()] = r.getQty() == null ? 0.0 : r.getQty().doubleValue();
    }

    List<DashboardDto.ShipmentMonthlyRes> result = new ArrayList<>(12);
    for (int m = 1; m <= 12; m++) {
      result.add(DashboardDto.ShipmentMonthlyRes.builder()
          .month(m)
          .planQty(planByMonth[m])
          .actualQty(actualByMonth[m])
          .achievementRate(support.rate(actualByMonth[m], planByMonth[m]))
          .build());
    }
    return result;
  }

  /**
   * 자재관리현황 — 지정 (year, month) 기준 직전 monthsBack개월 + 평균.
   * 컬럼: 입고요청량(발주 in_req_date), 입고량(검사합격/무검사 가입고), 재고량(월말 시점 누적 재고).
   * 재고량은 자재재고현황과 동일하게 MaterialInbound 누적(±)으로 산출 — material_stock_history가 비어 있어도 동작.
   * 자재 한정: account_type IN (매입(원재료), 매입(부자재)).
   */
  public DashboardDto.MaterialMonthlyRes getMaterialMonthly(int year, int month, int monthsBack) {
    final int eff = Math.max(0, Math.min(11, monthsBack));
    return support.withRedisCache(
        "dashboard:materialMonthly:" + year + ":" + month + ":" + eff,
        DashboardSupport.TTL_AGGREGATE,
        () -> computeMaterialMonthly(year, month, eff));
  }

  private DashboardDto.MaterialMonthlyRes computeMaterialMonthly(int year, int month, int monthsBack) {
    if (monthsBack < 0) monthsBack = 0;
    if (monthsBack > 11) monthsBack = 11;

    // 자재 item_sq 목록
    List<Long> materialItemSqs = itemRepository.findItemSqsByAccountTypes(MATERIAL_ACCOUNT_TYPES);

    // 표시할 (year, month) 목록 — 가장 오래된 월부터 선택된 월까지 오름차순
    List<java.time.YearMonth> targetMonths = new ArrayList<>();
    java.time.YearMonth end = java.time.YearMonth.of(year, month);
    for (int i = monthsBack; i >= 0; i--) {
      targetMonths.add(end.minusMonths(i));
    }

    List<DashboardDto.MaterialMonthEntry> entries = new ArrayList<>();
    for (java.time.YearMonth ym : targetMonths) {
      LocalDate from = ym.atDay(1);
      LocalDate to = ym.atEndOfMonth();
      double request = materialItemSqs.isEmpty()
          ? 0.0
          : support.nzd(purchaseOrderDetailRepository.sumOrderQtyByInReqDate(from, to, materialItemSqs));
      double inbound = materialItemSqs.isEmpty()
          ? 0.0
          : support.nzd(materialInboundRepository.sumInboundQtyInRange(from, to, materialItemSqs));
      // 재고량: 해당 월말 시점까지 누적된 (검사합격/무검사) 자재 입고 - 차감(ADJUST) 합산.
      // material_stock_history 미수집 환경에서도 정확한 월말 시점 재고가 산출되도록 MaterialInbound 누적 사용.
      double stock = materialItemSqs.isEmpty()
          ? 0.0
          : support.nzd(materialInboundRepository.sumStockQtyAsOf(to, materialItemSqs));

      entries.add(DashboardDto.MaterialMonthEntry.builder()
          .year(ym.getYear())
          .month(ym.getMonthValue())
          .requestQty(request)
          .inboundQty(inbound)
          .endStockQty(stock)
          .build());
    }

    // 평균 (선택된 기간 내 산술평균)
    int n = entries.size();
    double avgRequest = 0.0;
    double avgInbound = 0.0;
    double avgStock = 0.0;
    if (n > 0) {
      for (var e : entries) {
        avgRequest += e.getRequestQty() == null ? 0.0 : e.getRequestQty();
        avgInbound += e.getInboundQty() == null ? 0.0 : e.getInboundQty();
        avgStock += e.getEndStockQty() == null ? 0.0 : e.getEndStockQty();
      }
      avgRequest = Math.round(avgRequest / n * 100.0) / 100.0;
      avgInbound = Math.round(avgInbound / n * 100.0) / 100.0;
      avgStock = Math.round(avgStock / n * 100.0) / 100.0;
    }

    return DashboardDto.MaterialMonthlyRes.builder()
        .months(entries)
        .average(DashboardDto.MaterialMonthEntry.builder()
            .year(0)
            .month(0)
            .requestQty(avgRequest)
            .inboundQty(avgInbound)
            .endStockQty(avgStock)
            .build())
        .build();
  }

  /**
   * 완제품 재고회전율 — 자재/재공품 회전율은 데이터 미비로 제외.
   * 회전수 = 기간 출하량 / 현재 재고  (history 없어 평균재고 대신 현재값 사용)
   * 슬로무빙 기준: 기간 내 출하 0 또는 마지막 출고일 30일 이상 경과 + 재고 > 0
   */
  public DashboardDto.InventoryTurnoverRes getInventoryTurnover(int year, int slowMovingDays) {
    final int eff = slowMovingDays <= 0 ? 30 : slowMovingDays;
    return support.withRedisCache("dashboard:inventoryTurnover:" + year + ":" + eff, DashboardSupport.TTL_AGGREGATE,
        () -> computeInventoryTurnover(year, eff));
  }

  private DashboardDto.InventoryTurnoverRes computeInventoryTurnover(int year, int slowMovingDays) {
    if (slowMovingDays <= 0) slowMovingDays = 30;
    LocalDate from = LocalDate.of(year, 1, 1);
    LocalDate to = LocalDate.of(year, 12, 31);
    LocalDate today = LocalDate.now();

    // 현재 재고 (품목별 + 마지막 출고일)
    var stockRows = productStockRepository.aggregateStockForTurnover();
    Map<Long, Double> stockByItem = new HashMap<>();
    Map<Long, LocalDate> lastOutByItem = new HashMap<>();
    for (var s : stockRows) {
      Long itemSq = s.getItemSq();
      if (itemSq == null) continue;
      stockByItem.put(itemSq, s.getStockM() == null ? 0.0 : s.getStockM().doubleValue());
      lastOutByItem.put(itemSq, s.getLastOut());
    }

    // 기간 내 출하 (품목별)
    var shipRows = shipmentResultRepository.aggregateShipForTurnover(from, to);
    Map<Long, Double> shipByItem = new HashMap<>();
    Map<Long, LocalDate> lastShipByItem = new HashMap<>();
    for (var s : shipRows) {
      shipByItem.put(s.getItemSq(), s.getShippedM() == null ? 0.0 : s.getShippedM().doubleValue());
      LocalDate ls = s.getLastShip();
      if (ls != null) lastShipByItem.put(s.getItemSq(), ls);
    }

    // 월별 출하량
    var monthly = shipmentResultRepository.sumShippedQtyGroupByMonth(from, to);
    Double[] monthlyShipped = new Double[13];
    for (int i = 0; i < 13; i++) monthlyShipped[i] = 0.0;
    for (var m : monthly) {
      if (m.getMonth() != null) {
        monthlyShipped[m.getMonth()] = m.getQty() == null ? 0.0 : m.getQty().doubleValue();
      }
    }
    List<DashboardDto.TurnoverMonth> monthlyShippedList = new ArrayList<>(12);
    for (int m = 1; m <= 12; m++) {
      monthlyShippedList.add(DashboardDto.TurnoverMonth.builder()
          .month(m).shippedQty(monthlyShipped[m]).build());
    }

    // 품목 정보 일괄 로드
    java.util.Set<Long> allItemSqs = new java.util.HashSet<>();
    allItemSqs.addAll(stockByItem.keySet());
    allItemSqs.addAll(shipByItem.keySet());
    Map<Long, Item> itemMap = EntityIndex.byId(
        new ArrayList<>(allItemSqs), itemRepository::findAllById, Item::getItemSq);

    // SKU별 회전율 계산
    List<DashboardDto.TurnoverBySku> bySku = new ArrayList<>();
    List<DashboardDto.TurnoverBySku> slowMoving = new ArrayList<>();
    double totalStock = 0.0;
    double totalShipped = 0.0;
    int totalSkuWithStock = 0;
    int slowCount = 0;

    for (Long itemSq : allItemSqs) {
      Item item = itemMap.get(itemSq);
      String code = item == null ? "item#" + itemSq : item.getItemCode();
      String name = item == null ? null : item.getItemName();
      double stock = stockByItem.getOrDefault(itemSq, 0.0);
      double shipped = shipByItem.getOrDefault(itemSq, 0.0);
      LocalDate lastOut = lastOutByItem.get(itemSq);
      LocalDate lastShip = lastShipByItem.get(itemSq);
      // 마지막 출고/출하 중 더 최근 값
      LocalDate lastMovement = pickLater(lastOut, lastShip);

      totalStock += stock;
      totalShipped += shipped;
      if (stock > 0) totalSkuWithStock += 1;

      Double turnover = null;
      Double daysOnHand = null;
      if (stock > 0) {
        turnover = shipped / stock;
        if (turnover > 0) daysOnHand = 365.0 / turnover;
      }

      // 슬로무빙: 재고 있는데 (출하 0 또는 lastMovement 가 slowMovingDays 이상 경과)
      String status = "정상";
      boolean isSlow = false;
      if (stock <= 0) {
        status = "무재고";
      } else if (shipped == 0) {
        status = "슬로무빙";
        isSlow = true;
      } else if (lastMovement == null) {
        status = "슬로무빙";
        isSlow = true;
      } else if (java.time.temporal.ChronoUnit.DAYS.between(lastMovement, today) >= slowMovingDays) {
        status = "슬로무빙";
        isSlow = true;
      }
      if (isSlow) slowCount += 1;

      DashboardDto.TurnoverBySku sku = DashboardDto.TurnoverBySku.builder()
          .itemCode(code)
          .itemName(name)
          .currentStockM(stock)
          .shippedQtyM(shipped)
          .turnover(turnover == null ? null : support.round2(turnover))
          .avgDaysOnHand(daysOnHand == null ? null : support.round1(daysOnHand))
          .lastOutDate(lastMovement == null ? null : lastMovement.toString())
          .status(status)
          .build();

      // 재고 보유 SKU만 노출
      if (stock > 0) {
        bySku.add(sku);
        if (isSlow) slowMoving.add(sku);
      }
    }

    // SKU 정렬: 회전율 내림차순 (null은 뒤로)
    bySku.sort((a, b) -> {
      Double av = a.getTurnover();
      Double bv = b.getTurnover();
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return Double.compare(bv, av);
    });
    // 슬로무빙 정렬: 마지막 출고일 오래된 순 (null은 가장 오래된 것으로)
    slowMoving.sort((a, b) -> {
      String ax = a.getLastOutDate();
      String bx = b.getLastOutDate();
      if (ax == null && bx == null) return 0;
      if (ax == null) return -1;
      if (bx == null) return 1;
      return ax.compareTo(bx);
    });

    Double overallTurnover = null;
    Double overallDays = null;
    if (totalStock > 0) {
      overallTurnover = totalShipped / totalStock;
      if (overallTurnover > 0) overallDays = 365.0 / overallTurnover;
    }
    int periodDays = (int) java.time.temporal.ChronoUnit.DAYS.between(from, to) + 1;

    return DashboardDto.InventoryTurnoverRes.builder()
        .asOf(today.toString())
        .periodDays(periodDays)
        .totalStockM(totalStock)
        .totalShippedM(totalShipped)
        .turnover(overallTurnover == null ? null : support.round2(overallTurnover))
        .avgDaysOnHand(overallDays == null ? null : support.round1(overallDays))
        .totalSkuCount(totalSkuWithStock)
        .slowMovingSkuCount(slowCount)
        .slowMovingDays(slowMovingDays)
        .monthlyShipped(monthlyShippedList)
        .bySku(bySku.stream().limit(30).collect(Collectors.toList()))
        .slowMoving(slowMoving.stream().limit(20).collect(Collectors.toList()))
        .build();
  }

  private LocalDate pickLater(LocalDate a, LocalDate b) {
    if (a == null) return b;
    if (b == null) return a;
    return a.isAfter(b) ? a : b;
  }

  // ============================================================
  // 공지사항 (대시보드 위젯) — 게시 상태(true)인 항목만 최신순
  // ============================================================
  public List<DashboardDto.NoticeRes> getActiveNotices() {
    return support.withRedisCache("dashboard:notices", DashboardSupport.TTL_AGGREGATE, this::computeActiveNotices);
  }

  private List<DashboardDto.NoticeRes> computeActiveNotices() {
    List<Notice> notices = noticeRepository.findByNoticeStatusTrueOrderByRegDtDescNoticeSqDesc();
    return notices.stream()
        .map(n -> DashboardDto.NoticeRes.builder()
            .noticeSq(n.getNoticeSq())
            .noticeTitle(n.getNoticeTitle())
            .noticeContent(n.getNoticeContent())
            .regDt(n.getRegDt())
            .build())
        .collect(Collectors.toList());
  }
}
