package com.mes.domain.shipment.service;

import com.mes.domain.item.entity.Item;
import com.mes.domain.item.repository.ItemRepository;
import com.mes.domain.quality.entity.ShipmentInspect;
import com.mes.domain.quality.repository.ShipmentInspectRepository;
import com.mes.domain.shipment.dto.ShipmentDto;
import com.mes.domain.shipment.entity.ShipmentOrder;
import com.mes.domain.shipment.entity.ShipmentOrderDetail;
import com.mes.domain.shipment.entity.ShipmentPlan;
import com.mes.domain.shipment.repository.ShipmentOrderDetailRepository;
import com.mes.domain.shipment.repository.ShipmentOrderRepository;
import com.mes.domain.shipment.repository.ShipmentPlanRepository;
import com.mes.domain.sales.entity.SalesOrder;
import com.mes.domain.sales.entity.SalesOrderDetail;
import com.mes.domain.sales.repository.SalesOrderDetailRepository;
import com.mes.domain.stock.entity.ProductStock;
import com.mes.domain.stock.repository.ProductStockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * 출하 도메인의 계획·지시 처리를 묶은 서비스.
 *
 * <p>UI 상으로는 "출하계획"과 "출하지시관리"가 분리되어 있으나, 계획에서 지시로 데이터가
 * 단방향으로 흘러가는 구조라 한 컴포넌트 안에서 두 흐름을 함께 다룬다.</p>
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ShipmentService {

  private final ShipmentPlanRepository planRepo;
  private final ShipmentOrderRepository orderRepo;
  private final ShipmentOrderDetailRepository orderDetailRepo;
  private final ItemRepository itemRepo;
  private final ProductStockRepository productStockRepo;
  private final SalesOrderDetailRepository salesOrderDetailRepo;
  private final ShipmentInspectRepository shipmentInspectRepo;

  // 부동소수점 비교용 허용 오차 (m). 수주잔여 cap 판정에서 사용.
  private static final double QTY_EPSILON = 0.0001;

  // ==============================================================
  //  출하계획
  // ==============================================================

  /**
   * 출하계획 목록을 만든다.
   *
   * <p>연관 데이터(수주상세·plan별 지시량·수주별 예약량·실시간 현재고)를 모두 벌크로 한 번씩만
   * 끌어온 뒤 Map 캐시에 담아 합치므로, plan 한 건마다 추가 쿼리가 나가지 않는다.</p>
   */
  public List<ShipmentDto.PlanRes> getPlanList(ShipmentDto.PlanSearchReq req) {
    List<ShipmentPlan> plans = planRepo.findBySearchCondition(
        parseDateOrNull(req.getDateFrom()), parseDateOrNull(req.getDateTo()));
    if (plans.isEmpty()) {
      return new ArrayList<>();
    }

    // 수주상세 — orderDate 를 끌어오기 위해 일괄 적재
    List<Long> salesDtlSqs = distinctNonNull(plans.stream().map(ShipmentPlan::getSalesOrderDtlSq));
    Map<Long, SalesOrderDetail> salesDtlById = indexById(
        salesOrderDetailRepo.findAllById(salesDtlSqs), SalesOrderDetail::getOrderDtlSq);

    // plan 단위로 이미 발행된 출하지시 수량의 합
    Map<Long, Double> orderedByPlan = toSumMap(
        orderDetailRepo.sumOrderQtyByPlanSqIn(distinctNonNull(plans.stream().map(ShipmentPlan::getPlanSq))));

    // 수주 단위 예약(=누적 출하지시)량. plan별 지시량과 달리 같은 수주에 묶인 모든 plan을 가로질러
    // 합산한 값이며, "수주 예약수량" 표기와 잔여 cap 판정의 기준이 된다.
    Map<Long, Double> reservedBySalesDtl = salesDtlSqs.isEmpty()
        ? Map.of()
        : toSumMap(orderDetailRepo.sumOrderQtyBySalesOrderDtlSqIn(salesDtlSqs));

    // ShipmentPlan.currentStock 은 등록 당시의 스냅샷이라 이후 생산분이 반영되지 않는다.
    // 노출 대상 plan들의 itemSq에 대해 ProductStock을 다시 합산해 최신값으로 덮어쓴다.
    Map<Long, Double> liveStockByItem = aggregateLiveStockByItemSq(
        distinctNonNull(plans.stream().map(ShipmentPlan::getItemSq)));

    List<ShipmentDto.PlanRes> rows = new ArrayList<>(plans.size());
    for (ShipmentPlan p : plans) {
      // 수주잔여(수주량 − 예약량)가 0 이하인 plan은 화면에서 빼버린다. 같은 수주의 plan들이
      // 누적되어 수주가 다 채워지면 일제히 사라진다. 단, 수주량 자체가 없는 plan은 그대로 둔다.
      if (hasRemainingSalesQty(p, reservedBySalesDtl)) {
        rows.add(buildPlanRes(p, salesDtlById, orderedByPlan, reservedBySalesDtl, liveStockByItem));
      }
    }
    return rows;
  }

  private boolean hasRemainingSalesQty(ShipmentPlan p, Map<Long, Double> reservedBySalesDtl) {
    Double salesQty = p.getSalesOrderQty();
    if (salesQty == null || salesQty <= 0) {
      return true;
    }
    return salesQty - reservedForPlan(p, reservedBySalesDtl) > 0;
  }

  private double reservedForPlan(ShipmentPlan p, Map<Long, Double> reservedBySalesDtl) {
    Long key = p.getSalesOrderDtlSq();
    return key == null ? 0.0 : reservedBySalesDtl.getOrDefault(key, 0.0);
  }

  private ShipmentDto.PlanRes buildPlanRes(ShipmentPlan p,
                                           Map<Long, SalesOrderDetail> salesDtlById,
                                           Map<Long, Double> orderedByPlan,
                                           Map<Long, Double> reservedBySalesDtl,
                                           Map<Long, Double> liveStockByItem) {
    String orderDate = null;
    String deliveryPlace = null;
    if (p.getSalesOrderDtlSq() != null) {
      SalesOrderDetail dtl = salesDtlById.get(p.getSalesOrderDtlSq());
      SalesOrder so = (dtl == null) ? null : dtl.getSalesOrder();
      if (so != null) {
        orderDate = dateToStr(so.getOrderDate());
        deliveryPlace = so.getDeliveryPlace();
      }
    }

    double liveStock;
    if (p.getItemSq() != null) {
      liveStock = liveStockByItem.getOrDefault(p.getItemSq(), 0.0);
    } else {
      liveStock = p.getCurrentStock() != null ? p.getCurrentStock() : 0.0;
    }

    return ShipmentDto.PlanRes.builder()
        .planSq(p.getPlanSq())
        .salesOrderDtlSq(p.getSalesOrderDtlSq())
        .orderDate(orderDate)
        .deliveryPlace(deliveryPlace)
        .expectedShipDate(dateToStr(p.getExpectedShipDate()))
        .customerCode(p.getCustomerCode())
        .customerName(p.getCustomerName())
        .itemCode(p.getItemCode())
        .itemName(p.getItemName())
        .basisWeight(p.getBasisWeight())
        .width(p.getWidth())
        .length(p.getLength())
        .salesOrderQty(p.getSalesOrderQty())
        .currentStock(liveStock)
        .storageLocation(p.getStorageLocation())
        .planQty(p.getPlanQty())
        .planQtyEa(p.getPlanQtyEa())
        .lotNo(p.getLotNo())
        .orderNo(p.getOrderNo())
        .planStatus(p.getPlanStatus())
        .remark(p.getRemark())
        .orderedQty(orderedByPlan.getOrDefault(p.getPlanSq(), 0.0))
        .reservedQty(reservedForPlan(p, reservedBySalesDtl))
        .build();
  }

  /** 출하계획 단건 등록/수정. 출하량은 숫자 입력만 받고 LOT 단위 배분은 하지 않는다. */
  @Transactional
  public void savePlan(ShipmentDto.PlanSaveReq req) {
    LocalDate expectedShipDate = parseDateOrNull(req.getExpectedShipDate());

    // FE에서 보관위치/규격(평량·폭·길이)이 빠져 들어온 경우 itemCode로 품목 마스터에서 메운다.
    String storageLocation = req.getStorageLocation();
    Double basisWeight = req.getBasisWeight();
    Double width = req.getWidth();
    Double length = req.getLength();

    Item itemMaster = lookupItemByCode(req.getItemCode());
    if (itemMaster != null) {
      if (isBlank(storageLocation)) {
        storageLocation = itemMaster.getEffectiveStorageLocation();
      }
      basisWeight = orKeep(basisWeight, itemMaster.getEffectiveBasisWeight());
      width = orKeep(width, itemMaster.getEffectiveWidth());
      length = orKeep(length, itemMaster.getEffectiveLength());
    }

    // 현재고가 비어 들어오면 해당 품목의 ProductStock 합으로 자동 채운다.
    Double currentStock = req.getCurrentStock();
    if ((currentStock == null || currentStock == 0.0) && itemMaster != null) {
      currentStock = sumStockMeters(productStockRepo.findByItemSq(itemMaster.getItemSq()));
    }

    // EA 환산: FE 미입력 시 planQty / length 를 올림한다.
    Integer planQtyEa = req.getPlanQtyEa();
    boolean needEa = planQtyEa == null || planQtyEa == 0;
    if (needEa && req.getPlanQty() != null && length != null && length > 0) {
      planQtyEa = (int) Math.ceil(req.getPlanQty() / length);
    }

    if (req.getPlanSq() == null) {
      insertNewPlan(req, expectedShipDate, basisWeight, width, length, currentStock, storageLocation, planQtyEa);
    } else {
      applyPlanUpdate(req, expectedShipDate, currentStock, storageLocation, planQtyEa);
    }
  }

  private void applyPlanUpdate(ShipmentDto.PlanSaveReq req, LocalDate expectedShipDate,
                               Double currentStock, String storageLocation, Integer planQtyEa) {
    planRepo.findById(req.getPlanSq()).ifPresent(plan ->
        plan.update(req.getPlanQty(), planQtyEa, expectedShipDate,
            currentStock, storageLocation, plan.getLotNo(), req.getRemark()));
  }

  private void insertNewPlan(ShipmentDto.PlanSaveReq req, LocalDate expectedShipDate,
                             Double basisWeight, Double width, Double length,
                             Double currentStock, String storageLocation, Integer planQtyEa) {
    // 신규 계획은 항상 수주(SalesOrderDetail)로부터 파생되어야 한다.
    // 거래처는 SalesOrder.customer_sq 만을 출처로 삼고 customer_code 폴백은 쓰지 않는다.
    // (코드 재등록 시 다른 거래처로 오매핑될 수 있어 금지)
    if (req.getSalesOrderDtlSq() == null) {
      throw new IllegalStateException("출하계획 신규 등록은 수주(salesOrderDtlSq)가 필요합니다.");
    }
    SalesOrderDetail sod = salesOrderDetailRepo.findById(req.getSalesOrderDtlSq())
        .orElseThrow(() -> new IllegalStateException(
            "수주상세를 찾을 수 없습니다: salesOrderDtlSq=" + req.getSalesOrderDtlSq()));
    SalesOrder so = sod.getSalesOrder();
    if (so == null || so.getCustomerSq() == null) {
      throw new IllegalStateException(
          "수주에 거래처가 지정되어 있지 않습니다: salesOrderDtlSq=" + req.getSalesOrderDtlSq());
    }

    String lotNo = isBlank(req.getLotNo()) ? generateNextLotNo() : req.getLotNo();

    ShipmentPlan plan = ShipmentPlan.builder()
        .salesOrderDtlSq(req.getSalesOrderDtlSq())
        .customerSq(so.getCustomerSq())
        .itemSq(req.getItemSq())
        .planDate(LocalDate.now())
        .expectedShipDate(expectedShipDate)
        .planQty(req.getPlanQty())
        .planQtyEa(planQtyEa)
        .lotNo(lotNo)
        .orderNo(req.getOrderNo())
        .customerCode(req.getCustomerCode())
        .customerName(req.getCustomerName())
        .itemCode(req.getItemCode())
        .itemName(req.getItemName())
        .basisWeight(basisWeight)
        .width(width)
        .length(length)
        .salesOrderQty(req.getSalesOrderQty())
        .currentStock(currentStock)
        .storageLocation(storageLocation)
        .remark(req.getRemark())
        .build();
    planRepo.saveAndFlush(plan);
  }

  /** 다음 출하계획 LotNo 채번. 저장 전 미리보기에서도 동일 로직을 재사용한다. */
  public String generateNextLotNo() {
    String prefix = "SH-" + LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMM")) + "-";

    int seq = 1;
    List<String> existing = planRepo.findTopLotNoByPrefix(prefix);
    if (!existing.isEmpty()) {
      // 형식이 깨진 레거시 LotNo는 무시하고 기본값 1을 유지한다.
      String last = existing.get(0);
      String tail = last.substring(last.lastIndexOf("-") + 1);
      try {
        seq = Integer.parseInt(tail) + 1;
      } catch (NumberFormatException ignored) {
        seq = 1;
      }
    }
    return prefix + String.format("%03d", seq);
  }

  /** 등록 폼 보조용: 품목코드로 재고/규격/보관위치를 조회한다. */
  public ShipmentDto.ItemStockRes getItemStock(String itemCode) {
    Item item = itemRepo.findByItemCode(itemCode)
        .orElseThrow(() -> new IllegalArgumentException("품목을 찾을 수 없습니다: " + itemCode));

    double totalM = sumStockMeters(productStockRepo.findByItemSq(item.getItemSq()));

    return ShipmentDto.ItemStockRes.builder()
        .itemCode(item.getItemCode())
        .itemName(item.getItemName())
        .basisWeight(item.getEffectiveBasisWeight())
        .width(item.getEffectiveWidth())
        .length(item.getEffectiveLength())
        .currentStock(totalM)
        .storageLocation(item.getEffectiveStorageLocation())
        .build();
  }

  /** 출하계획 목록 일괄 저장. */
  @Transactional
  public void savePlanList(List<ShipmentDto.PlanSaveReq> reqList) {
    reqList.forEach(this::savePlan);
  }

  /** 출하계획 삭제. */
  @Transactional
  public void deletePlan(Long planSq) {
    planRepo.deleteById(planSq);
  }

  // ==============================================================
  //  출하지시
  // ==============================================================

  /**
   * 출하지시 목록(order + detail 평탄화).
   *
   * <p>plan·수주상세·실시간 현재고·출하검사를 모두 벌크로 미리 조회하여 Map으로 합치는 방식으로
   * N+1을 회피한다.</p>
   */
  public List<ShipmentDto.OrderListItemRes> getOrderList(ShipmentDto.OrderSearchReq req) {
    List<ShipmentOrder> orders = orderRepo.findBySearchCondition(
        parseDateOrNull(req.getDateFrom()), parseDateOrNull(req.getDateTo()));

    List<Long> planSqs = distinctNonNull(detailStream(orders).map(ShipmentOrderDetail::getPlanSq));
    Map<Long, ShipmentPlan> planById = planSqs.isEmpty()
        ? Map.of()
        : indexById(planRepo.findAllById(planSqs), ShipmentPlan::getPlanSq);

    List<Long> salesDtlSqs = distinctNonNull(planById.values().stream().map(ShipmentPlan::getSalesOrderDtlSq));
    Map<Long, SalesOrderDetail> salesDtlById = salesDtlSqs.isEmpty()
        ? Map.of()
        : indexById(salesOrderDetailRepo.findAllById(salesDtlSqs), SalesOrderDetail::getOrderDtlSq);

    // ShipmentOrderDetail.currentStock 도 지시 등록시점 스냅샷이라 신규 생산이 빠진다 → 실시간으로 덮는다.
    Map<Long, Double> liveStockByItem = aggregateLiveStockByItemSq(
        distinctNonNull(detailStream(orders).map(ShipmentOrderDetail::getItemSq)));

    // 같은 shipDtlSq에 출하검사가 여러 건이면 검사일 최신(없으면 PK 큰) 1건만 남긴다.
    List<Long> shipDtlSqs = distinctNonNull(detailStream(orders).map(ShipmentOrderDetail::getShipDtlSq));
    Map<Long, ShipmentInspect> inspectByDtl = shipDtlSqs.isEmpty()
        ? Map.of()
        : shipmentInspectRepo.findByShipDtlSqIn(shipDtlSqs).stream()
            .collect(Collectors.toMap(
                ShipmentInspect::getShipDtlSq,
                Function.identity(),
                this::pickLatestInspect));

    List<ShipmentDto.OrderListItemRes> rows = new ArrayList<>();
    for (ShipmentOrder order : orders) {
      List<ShipmentOrderDetail> details = order.getDetails();
      if (details == null || details.isEmpty()) {
        rows.add(buildOrderListItemRes(order, null, planById, salesDtlById, liveStockByItem, inspectByDtl));
        continue;
      }
      for (ShipmentOrderDetail detail : details) {
        rows.add(buildOrderListItemRes(order, detail, planById, salesDtlById, liveStockByItem, inspectByDtl));
      }
    }
    return rows;
  }

  // 한 shipDtlSq에 검사가 둘 이상일 때 더 최신 건 선택 (검사일 우선, 동률/누락이면 PK 큰 쪽).
  private ShipmentInspect pickLatestInspect(ShipmentInspect a, ShipmentInspect b) {
    LocalDate ad = a.getInspectDate();
    LocalDate bd = b.getInspectDate();
    // 둘 다 검사일이 있으면 더 나중 날짜가 우선.
    if (ad != null && bd != null) {
      return bd.isAfter(ad) ? b : a;
    }
    // 한쪽만 검사일이 있으면 그쪽을 채택.
    if (ad != null || bd != null) {
      return ad != null ? a : b;
    }
    // 둘 다 검사일이 없으면 PK가 더 큰(나중에 등록된) 건을 채택.
    Long aSq = a.getShipInspectSq();
    Long bSq = b.getShipInspectSq();
    boolean preferA = aSq != null && bSq != null && aSq > bSq;
    return preferA ? a : b;
  }

  private Map<Long, Double> aggregateLiveStockByItemSq(List<Long> itemSqs) {
    if (itemSqs == null || itemSqs.isEmpty()) {
      return Map.of();
    }
    return productStockRepo.findByItemSqIn(itemSqs).stream()
        .filter(s -> s.getItemSq() != null)
        .collect(Collectors.groupingBy(
            ProductStock::getItemSq,
            Collectors.reducing(0.0,
                s -> s.getCurrentQtyM() != null ? s.getCurrentQtyM() : 0.0,
                Double::sum)));
  }

  private ShipmentDto.OrderListItemRes buildOrderListItemRes(ShipmentOrder order, ShipmentOrderDetail detail,
      Map<Long, ShipmentPlan> planById, Map<Long, SalesOrderDetail> salesDtlById,
      Map<Long, Double> liveStockByItem, Map<Long, ShipmentInspect> inspectByDtl) {
    ShipmentDto.OrderListItemRes row = ShipmentDto.OrderListItemRes.builder()
        .shipOrderSq(order.getShipOrderSq())
        .expectedShipDate(dateToStr(order.getExpectedShipDate()))
        .expectedShipTime(order.getExpectedShipTime() != null ? order.getExpectedShipTime().toString() : null)
        .destination(order.getDestination())
        .customerReq(order.getCustomerReq())
        .orderStatus(order.getOrderStatus() != null ? order.getOrderStatus().name() : null)
        .build();

    if (detail == null) {
      return row;
    }

    row.setShipDtlSq(detail.getShipDtlSq());
    row.setPlanSq(detail.getPlanSq());
    row.setShipStatus(detail.getShipStatus() != null ? detail.getShipStatus().name() : null);
    row.setItemCode(detail.getItemCode());
    row.setItemName(detail.getItemName());
    row.setBasisWeight(detail.getBasisWeight());
    row.setWidth(detail.getWidth());
    row.setLength(detail.getLength());
    row.setCustomerCode(detail.getCustomerCode());
    row.setCustomerName(detail.getCustomerName());
    row.setPlanQty(detail.getOrderQty());
    row.setPlanQtyEa(detail.getOrderQtyEa());

    // 지시 등록시점 스냅샷 대신 실시간 현재고를 노출
    double liveStock;
    if (detail.getItemSq() != null) {
      liveStock = liveStockByItem.getOrDefault(detail.getItemSq(), 0.0);
    } else {
      liveStock = detail.getCurrentStock() != null ? detail.getCurrentStock() : 0.0;
    }
    row.setCurrentStock(liveStock);
    row.setSalesOrderQty(detail.getSalesOrderQty());
    row.setStorageLocation(detail.getStorageLocation());
    row.setProductLotNo(detail.getProductLotNo());

    ShipmentInspect inspect = inspectByDtl.get(detail.getShipDtlSq());
    row.setInspectRegistered(inspect != null);
    row.setInspectJudge(inspect != null && inspect.getJudgeCode() != null
        ? inspect.getJudgeCode().name() : null);

    if (detail.getPlanSq() != null) {
      ShipmentPlan plan = planById.get(detail.getPlanSq());
      if (plan != null) {
        row.setLotNo(plan.getLotNo());
        row.setOrderNo(plan.getOrderNo());
        row.setSalesOrderDtlSq(plan.getSalesOrderDtlSq());
        if (plan.getSalesOrderDtlSq() != null) {
          SalesOrderDetail sod = salesDtlById.get(plan.getSalesOrderDtlSq());
          SalesOrder so = (sod == null) ? null : sod.getSalesOrder();
          if (so != null && so.getOrderDate() != null) {
            row.setOrderDate(so.getOrderDate().toString());
          }
        }
      }
    }
    return row;
  }

  /**
   * 출하지시 평탄화 목록을 일괄 저장한다.
   *
   * <p>수주잔여수량(수주량 − 누적 출하지시량)을 다음과 같이 검증한다:</p>
   * <ul>
   *   <li>합계가 잔여 이하 → 통과</li>
   *   <li>초과하더라도 force=true → 통과 (FE에서 사용자 확인을 받은 경우)</li>
   *   <li>force 아니면서 초과 → IllegalStateException</li>
   * </ul>
   *
   * <p>한 번의 호출 안에서 여러 건이 같은 수주를 가리키면, 그 호출 내 누적분까지 차감해서 비교한다.</p>
   */
  @Transactional
  public void saveFlatOrderList(List<ShipmentDto.FlatOrderSaveReq> reqList) {
    // 같은 호출 안에서의 누적 소비량 (key: salesOrderDtlSq)
    Map<Long, Double> consumedInThisCall = new HashMap<>();

    for (ShipmentDto.FlatOrderSaveReq req : reqList) {
      if (req.getPlanSq() == null) {
        throw new IllegalStateException("출하지시는 출하계획(planSq)이 필요합니다.");
      }
      ShipmentPlan plan = planRepo.findById(req.getPlanSq())
          .orElseThrow(() -> new IllegalStateException(
              "출하계획을 찾을 수 없습니다: planSq=" + req.getPlanSq()));

      Long salesOrderDtlSq = plan.getSalesOrderDtlSq();
      Double salesOrderQty = (req.getSalesOrderQty() != null)
          ? req.getSalesOrderQty()
          : plan.getSalesOrderQty();

      verifySalesQtyCap(req, salesOrderDtlSq, salesOrderQty, consumedInThisCall);
      if (salesOrderDtlSq != null) {
        double qty = req.getPlanQty() != null ? req.getPlanQty() : 0.0;
        consumedInThisCall.merge(salesOrderDtlSq, qty, Double::sum);
      }

      ShipmentOrder order = ShipmentOrder.builder()
          .customerSq(resolveOrderCustomerSq(plan))
          .expectedShipDate(parseDateOrNull(req.getExpectedShipDate()))
          .expectedShipTime(parseTimeOrNull(req.getExpectedShipTime()))
          .destination(req.getDestination())
          .customerReq(req.getCustomerReq())
          .useYn(true)
          .build();

      ShipmentOrderDetail detail = ShipmentOrderDetail.builder()
          .planSq(req.getPlanSq())
          .itemSq(resolveOrderItemSq(plan, req.getItemCode()))
          .productLotNo(req.getProductLotNo())
          .orderQty(req.getPlanQty())
          .orderQtyEa(req.getPlanQtyEa())
          .customerCode(req.getCustomerCode())
          .customerName(req.getCustomerName())
          .itemCode(req.getItemCode())
          .itemName(req.getItemName())
          .basisWeight(req.getBasisWeight())
          .width(req.getWidth())
          .length(req.getLength())
          .salesOrderQty(req.getSalesOrderQty())
          .currentStock(req.getCurrentStock())
          .storageLocation(req.getStorageLocation())
          .build();

      order.addDetail(detail);

      planRepo.findById(req.getPlanSq()).ifPresent(ShipmentPlan::markAsOrdered);
      orderRepo.save(order);
    }
  }

  // 출하지시 거래처 결정: plan.customerSq → (없으면) salesOrderDtl→SalesOrder.customerSq.
  // customer_code 폴백은 오매핑 위험 때문에 쓰지 않는다.
  private Long resolveOrderCustomerSq(ShipmentPlan plan) {
    if (plan.getCustomerSq() != null) {
      return plan.getCustomerSq();
    }
    if (plan.getSalesOrderDtlSq() != null) {
      SalesOrderDetail sod = salesOrderDetailRepo.findById(plan.getSalesOrderDtlSq()).orElse(null);
      if (sod != null && sod.getSalesOrder() != null) {
        return sod.getSalesOrder().getCustomerSq();
      }
    }
    return null;
  }

  private Long resolveOrderItemSq(ShipmentPlan plan, String itemCode) {
    if (plan.getItemSq() != null) {
      return plan.getItemSq();
    }
    Item item = lookupItemByCode(itemCode);
    return (item == null) ? null : item.getItemSq();
  }

  private void verifySalesQtyCap(ShipmentDto.FlatOrderSaveReq req, Long salesOrderDtlSq,
                                 Double salesOrderQty, Map<Long, Double> consumedInThisCall) {
    if (Boolean.TRUE.equals(req.getForce())) {
      return;
    }
    if (salesOrderDtlSq == null || salesOrderQty == null || salesOrderQty <= 0) {
      return;
    }
    double reserved = orderDetailRepo.sumOrderQtyBySalesOrderDtlSq(salesOrderDtlSq).stream()
        .findFirst()
        .map(row -> row[1] == null ? 0.0 : ((Number) row[1]).doubleValue())
        .orElse(0.0);
    double consumed = consumedInThisCall.getOrDefault(salesOrderDtlSq, 0.0);
    double requested = req.getPlanQty() != null ? req.getPlanQty() : 0.0;
    double remaining = salesOrderQty - reserved - consumed;
    // 0.0001m 미만 차이는 부동소수점 오차로 보고 허용한다.
    if (requested - remaining > QTY_EPSILON) {
      throw new IllegalStateException(
          "출하지시량이 수주잔여수량을 초과합니다. (수주잔여: " + remaining + "m, 요청: " + requested + "m). " +
          "초과 등록을 원하면 force=true 로 재요청해 주세요.");
    }
  }

  /** 출하지시 수정. 단건 detail 기준으로 갱신하되, 출하검사가 붙은 건은 LOT/수량 변경을 막는다. */
  @Transactional
  public void updateOrder(Long shipOrderSq, ShipmentDto.FlatOrderSaveReq req) {
    ShipmentOrder order = orderRepo.findById(shipOrderSq)
        .orElseThrow(() -> new IllegalArgumentException("출하지시를 찾을 수 없습니다: " + shipOrderSq));

    order.update(parseDateOrNull(req.getExpectedShipDate()),
        parseTimeOrNull(req.getExpectedShipTime()),
        req.getDestination(), req.getCustomerReq());

    if (order.getDetails().isEmpty()) {
      return;
    }
    ShipmentOrderDetail detail = order.getDetails().get(0);

    // 출하검사가 붙은 detail은 결과 추적 보호를 위해 LOT·수량을 바꿀 수 없다.
    // 공통 마스터 필드(출하일/시간/도착지/요청사항)는 위 order.update 에서 이미 반영됐다.
    boolean inspected = detail.getShipDtlSq() != null
        && !shipmentInspectRepo.findByShipDtlSq(detail.getShipDtlSq()).isEmpty();
    if (inspected) {
      boolean lotChanged = !Objects.equals(detail.getProductLotNo(), req.getProductLotNo());
      boolean qtyChanged = !Objects.equals(detail.getOrderQty(), req.getPlanQty())
          || !Objects.equals(detail.getOrderQtyEa(), req.getPlanQtyEa());
      if (lotChanged || qtyChanged) {
        throw new IllegalStateException(
            "출하검사가 등록된 출하지시는 제품LOT·수량을 변경할 수 없습니다. (shipDtlSq=" + detail.getShipDtlSq() + ")");
      }
      // 검사 등록건은 비정규화 스냅샷도 그대로 보존한다 (수정 무시).
      return;
    }

    detail.updateFields(req.getPlanQty(), req.getPlanQtyEa(), req.getCurrentStock(),
        req.getStorageLocation(), req.getItemCode(), req.getItemName(),
        req.getBasisWeight(), req.getWidth(), req.getLength(),
        req.getCustomerCode(), req.getCustomerName(), req.getSalesOrderQty(),
        req.getProductLotNo());
  }

  /** 출하지시 삭제. */
  @Transactional
  public void deleteOrder(Long shipOrderSq) {
    orderRepo.deleteById(shipOrderSq);
  }

  // ==============================================================
  //  보조 유틸
  // ==============================================================

  // 널/빈 문자열이면 null 반환 → Repository BETWEEN 조건을 무시시켜 전체 조회되게 한다.
  private LocalDate parseDateOrNull(String raw) {
    return isBlank(raw) ? null : LocalDate.parse(raw);
  }

  private LocalTime parseTimeOrNull(String raw) {
    if (isBlank(raw)) {
      return null;
    }
    try {
      return LocalTime.parse(raw);
    } catch (RuntimeException malformed) {
      // 시각 포맷이 어긋난 입력은 무시하고 미지정(null)으로 처리한다.
      return null;
    }
  }

  private Item lookupItemByCode(String itemCode) {
    if (isBlank(itemCode)) {
      return null;
    }
    return itemRepo.findByItemCode(itemCode).orElse(null);
  }

  private double sumStockMeters(List<ProductStock> stocks) {
    return stocks.stream()
        .map(ProductStock::getCurrentQtyM)
        .filter(Objects::nonNull)
        .mapToDouble(Double::doubleValue)
        .sum();
  }

  private static String dateToStr(LocalDate date) {
    return date != null ? date.toString() : null;
  }

  private static boolean isBlank(String s) {
    return s == null || s.isEmpty();
  }

  private static <T> T orKeep(T current, T fallback) {
    return current != null ? current : fallback;
  }

  private static List<Long> distinctNonNull(Stream<Long> ids) {
    return ids.filter(Objects::nonNull).distinct().collect(Collectors.toList());
  }

  private static <T> Map<Long, T> indexById(Collection<T> values, Function<T, Long> keyFn) {
    return values.stream().collect(Collectors.toMap(keyFn, Function.identity()));
  }

  private static Stream<ShipmentOrderDetail> detailStream(Collection<ShipmentOrder> orders) {
    return orders.stream()
        .flatMap(o -> o.getDetails() != null ? o.getDetails().stream() : Stream.empty());
  }

  // group-by 결과(Object[]{key, sum})를 key→sum Map으로 변환
  private static Map<Long, Double> toSumMap(List<Object[]> rows) {
    return rows.stream().collect(Collectors.toMap(
        row -> (Long) row[0],
        row -> row[1] == null ? 0.0 : ((Number) row[1]).doubleValue()));
  }
}
