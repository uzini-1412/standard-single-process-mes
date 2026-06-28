package com.mes.domain.production.service;

import com.mes.domain.customer.repository.CustomerRepository;
import com.mes.domain.item.entity.Item;
import com.mes.domain.item.repository.ItemRepository;
import com.mes.domain.production.dto.ProductionDto;
import com.mes.domain.production.entity.ProductionPlan;
import com.mes.domain.production.entity.ProductionRequirement;
import com.mes.domain.production.repository.ProductionPlanRepository;
import com.mes.domain.production.repository.ProductionRequirementRepository;
import com.mes.domain.sales.entity.SalesOrder;
import com.mes.domain.sales.entity.SalesOrderDetail;
import com.mes.domain.sales.repository.SalesOrderDetailRepository;
import com.mes.domain.sales.repository.SalesOrderRepository;
import com.mes.domain.shipment.repository.ShipmentResultRepository;
import com.mes.domain.stock.entity.ProductStock;
import com.mes.domain.stock.repository.MaterialStockRepository;
import com.mes.domain.stock.repository.ProductStockRepository;
import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;
import com.mes.global.support.EntityIndex;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductionService {

  private final ProductionPlanRepository planRepo;
  private final ProductionRequirementRepository requirementRepo;
  private final SalesOrderRepository salesOrderRepo;
  private final SalesOrderDetailRepository salesOrderDetailRepo;
  private final ItemRepository itemRepo;
  private final MaterialStockRepository materialStockRepo;
  private final ProductStockRepository productStockRepo;
  private final CustomerRepository customerRepo;
  private final ShipmentResultRepository shipmentResultRepo;

  // ── 1. 생산 소요량 ─────────────────────────────────────────────

  /**
   * 수주·재고·출하 실적을 그때그때 합쳐 소요량을 산출한다. 결과는 DB에 남기지 않는 휘발성 계산이다.
   */
  public List<ProductionDto.ReqRes> getRequirementList(ProductionDto.ReqCalcReq req) {
    List<SalesOrder> orders = salesOrderRepo.findBySearchCondition(
        null, req.getDateFrom(), req.getDateTo(), null);
    if (orders.isEmpty()) {
      return new ArrayList<>();
    }

    // 소요량 산출에 필요한 보조 데이터를 한 번에 모아 둔다 (행마다 재조회 방지).
    List<Long> targetItemSqs = collectItemSqs(orders);
    Map<Long, Item> itemById = loadItemsAsMap(targetItemSqs);
    Map<Long, Double> onHandByItem = aggregateOnHandByItem(targetItemSqs);
    Map<Long, com.mes.domain.customer.entity.Customer> customerById = loadCustomersAsMap(orders);
    Map<Long, Double> plannedShipByItem = aggregateExpectedShipment(LocalDate.now());

    List<ProductionDto.ReqRes> rows = new ArrayList<>();
    for (SalesOrder order : orders) {
      for (SalesOrderDetail line : order.getOrderDetails()) {
        Item item = line.getItemSq() != null ? itemById.get(line.getItemSq()) : null;
        if (item == null) {
          continue;
        }
        rows.add(composeRequirementRow(order, line, item, onHandByItem, customerById, plannedShipByItem));
      }
    }
    return rows;
  }

  // 주문 상세에서 중복 없는 품목 PK 목록을 추린다.
  private List<Long> collectItemSqs(List<SalesOrder> orders) {
    return orders.stream()
        .flatMap(o -> o.getOrderDetails().stream())
        .map(SalesOrderDetail::getItemSq)
        .filter(Objects::nonNull)
        .distinct()
        .collect(Collectors.toList());
  }

  private Map<Long, Item> loadItemsAsMap(List<Long> itemSqs) {
    return EntityIndex.byId(itemSqs, itemRepo::findAllById, Item::getItemSq);
  }

  private Map<Long, com.mes.domain.customer.entity.Customer> loadCustomersAsMap(List<SalesOrder> orders) {
    List<Long> customerSqs = orders.stream()
        .map(SalesOrder::getCustomerSq)
        .filter(Objects::nonNull)
        .distinct()
        .collect(Collectors.toList());
    return EntityIndex.byId(customerSqs, customerRepo::findAllById,
        com.mes.domain.customer.entity.Customer::getCustomerSq);
  }

  // 한 주문 상세 → 응답 한 행. 안전재고/과부족/예상생산시간 등을 모두 여기서 계산한다.
  private ProductionDto.ReqRes composeRequirementRow(
      SalesOrder order, SalesOrderDetail line, Item item,
      Map<Long, Double> onHandByItem,
      Map<Long, com.mes.domain.customer.entity.Customer> customerById,
      Map<Long, Double> plannedShipByItem) {

    double onHand = onHandByItem.getOrDefault(line.getItemSq(), 0.0);
    double safetyStock = resolveSafetyStock(line, item);
    double orderQty = line.getOrderQty() != null ? line.getOrderQty().doubleValue() : 0.0;

    // 가용재고 = 현재고 - 안전재고. 과부족은 양수면 부족, 음수면 잉여를 뜻한다.
    double usableStock = onHand - safetyStock;
    double shortage = orderQty - usableStock;

    double plannedShip = plannedShipByItem.getOrDefault(line.getItemSq(), 0.0);
    double requiredQty = shortage + plannedShip;

    double speed = item.getProductionSpeed() != null ? item.getProductionSpeed() : 0.0;
    double estimatedTime = speed > 0 ? requiredQty / speed : 0.0;
    double widthInMeter = line.getWidth() != null ? line.getWidth() / 1000.0 : 0.0;
    double perHourArea = speed * widthInMeter;

    ProductionDto.ReqRes row = new ProductionDto.ReqRes();

    // 주문 헤더 / 거래처
    row.setOrderDtlSq(line.getOrderDtlSq());
    row.setOrderNo(order.getOrderNo());
    row.setOrderDate(order.getOrderDate() != null ? order.getOrderDate().toString() : null);

    com.mes.domain.customer.entity.Customer customer =
        order.getCustomerSq() != null ? customerById.get(order.getCustomerSq()) : null;
    if (customer != null) {
      row.setCustomerCode(customer.getCustomerCode());
      row.setCustomerName(customer.getCustomerName());
    }

    // 품목 식별 + 평량/폭/길이
    row.setItemSq(item.getItemSq());
    row.setItemCode(item.getItemCode());
    row.setItemName(item.getItemName());
    applyDimensions(row, line, item);

    // 수량 계산 결과
    row.setOrderQty((int) orderQty);
    row.setCurrentStock((int) onHand);
    row.setSafetyStock((int) safetyStock);
    row.setShortageQty((int) shortage);
    row.setDeliveryPlannedQty((int) plannedShip);
    row.setProductionReqQty((int) requiredQty);
    row.setPlanQty((int) requiredQty);

    // 생산 속도 / 시간 추정
    row.setProductionSpeed(speed);
    row.setProductionPerHourM2(perHourArea);
    row.setEstimatedProductionTime(estimatedTime);
    return row;
  }

  // 폭이 지정된 스펙의 안전재고를 우선 적용하고, 없으면 품목 마스터 안전재고로 떨어진다.
  private double resolveSafetyStock(SalesOrderDetail line, Item item) {
    if (line.getWidth() != null && item.getSpecs() != null) {
      for (var spec : item.getSpecs()) {
        if (spec.getWidth() != null && spec.getWidth().equals(line.getWidth())) {
          if (spec.getSafetyStock() != null) {
            return spec.getSafetyStock();
          }
          break;
        }
      }
    }
    return item.getSafetyStock() != null ? item.getSafetyStock() : 0;
  }

  // 평량/폭/길이는 주문 상세 값이 있으면 그것을, 비면 품목 유효값을 채운다.
  private void applyDimensions(ProductionDto.ReqRes res, SalesOrderDetail line, Item item) {
    if (line.getBasisWeight() != null) {
      res.setBasisWeight(line.getBasisWeight());
    } else if (item.getEffectiveBasisWeight() != null) {
      res.setBasisWeight(item.getEffectiveBasisWeight());
    }
    if (line.getWidth() != null) {
      res.setWidth(line.getWidth());
    } else if (item.getEffectiveWidth() != null) {
      res.setWidth(item.getEffectiveWidth());
    }
    if (line.getLength() != null) {
      res.setLength(line.getLength());
    } else if (item.getEffectiveLength() != null) {
      res.setLength(item.getEffectiveLength());
    }
  }

  /**
   * 출하예정량을 itemCode 키로 묶어 반환한다. 프론트가 추가 변환 없이 바로 표에 꽂을 수 있게 한 형태.
   */
  public Map<String, Double> getExpectedShipmentByItemCode() {
    Map<Long, Double> byItemSq = aggregateExpectedShipment(LocalDate.now());
    if (byItemSq.isEmpty()) {
      return Map.of();
    }

    List<Item> items = itemRepo.findAllById(new ArrayList<>(byItemSq.keySet()));
    Map<String, Double> byCode = new HashMap<>();
    for (Item item : items) {
      if (item.getItemCode() != null) {
        byCode.put(item.getItemCode(), byItemSq.getOrDefault(item.getItemSq(), 0.0));
      }
    }
    return byCode;
  }

  // 품목별 현재고(M) 합계 맵. findByItemSqIn 한 번으로 가져와 itemSq 단위로 합산한다.
  private Map<Long, Double> aggregateOnHandByItem(List<Long> itemSqs) {
    if (itemSqs == null || itemSqs.isEmpty()) {
      return Map.of();
    }
    Map<Long, Double> stockByItem = new HashMap<>();
    for (ProductStock ps : productStockRepo.findByItemSqIn(itemSqs)) {
      double qty = ps.getCurrentQtyM() != null ? ps.getCurrentQtyM() : 0.0;
      stockByItem.merge(ps.getItemSq(), qty, Double::sum);
    }
    return stockByItem;
  }

  /**
   * 출하예정량 = (직전 3개월 평균 출하량) - (당월 누적 출하량), 음수는 0으로 막는다.
   * 별도 등록 절차 없이 출하 실적만으로 추정하며, 직전 3개월(저번달까지) 평균치에서 이번 달에 아직
   * 못 채운 만큼을 앞으로 내보낼 양으로 본다.
   */
  private Map<Long, Double> aggregateExpectedShipment(LocalDate asOf) {
    LocalDate baseDate = asOf != null ? asOf : LocalDate.now();
    YearMonth thisMonth = YearMonth.from(baseDate);
    YearMonth prevMonth = thisMonth.minusMonths(1);
    YearMonth windowStart = thisMonth.minusMonths(3);

    LocalDate windowFrom = windowStart.atDay(1);
    LocalDate windowTo = prevMonth.atEndOfMonth();
    LocalDate thisFrom = thisMonth.atDay(1);
    LocalDate thisTo = thisMonth.atEndOfMonth();

    Map<Long, Double> pastThreeMonths = shippedSumByItem(windowFrom, windowTo);
    Map<Long, Double> thisMonthSum = shippedSumByItem(thisFrom, thisTo);

    Set<Long> itemUniverse = new HashSet<>();
    itemUniverse.addAll(pastThreeMonths.keySet());
    itemUniverse.addAll(thisMonthSum.keySet());

    Map<Long, Double> expected = new HashMap<>();
    for (Long itemSq : itemUniverse) {
      double monthlyAvg = pastThreeMonths.getOrDefault(itemSq, 0.0) / 3.0;
      double remainder = monthlyAvg - thisMonthSum.getOrDefault(itemSq, 0.0);
      expected.put(itemSq, Math.max(0.0, remainder));
    }
    return expected;
  }

  // 기간 내 품목별 출하량 합계를 double 맵으로 환산.
  private Map<Long, Double> shippedSumByItem(LocalDate from, LocalDate to) {
    return shipmentResultRepo.sumShippedQtyGroupByItem(from, to).stream()
        .collect(Collectors.toMap(
            ShipmentResultRepository.ShippedSumPerItem::getItemSq,
            r -> r.getQty() != null ? r.getQty().doubleValue() : 0.0));
  }

  // ── 2. 생산 계획 ──────────────────────────────────────────────

  /**
   * 생산 계획 목록. 시작/종료일은 한쪽만 들어와도 되며 쿼리 쪽에서 IS NULL 로 흡수한다.
   */
  public List<ProductionDto.PlanRes> getPlanList(ProductionDto.PlanSearchReq req) {
    List<ProductionPlan> plans = planRepo.findBySearchCondition(
        req.getDateFrom(), req.getDateTo(), req.getLineSq());
    if (plans.isEmpty()) {
      return new ArrayList<>();
    }

    // N+1 회피: 참조 엔티티들을 PK 모아 일괄 적재.
    Map<Long, Item> itemById = loadItemsAsMap(distinctSqs(plans, ProductionPlan::getItemSq));
    Map<Long, ProductionRequirement> requirementById = requirementRepo
        .findAllById(distinctSqs(plans, ProductionPlan::getReqSq)).stream()
        .collect(Collectors.toMap(ProductionRequirement::getReqSq, Function.identity()));

    List<Long> orderDtlSqs = requirementById.values().stream()
        .map(ProductionRequirement::getOrderDtlSq)
        .filter(Objects::nonNull).distinct().collect(Collectors.toList());
    Map<Long, SalesOrderDetail> orderDtlById = EntityIndex.byId(
        orderDtlSqs, salesOrderDetailRepo::findAllById, SalesOrderDetail::getOrderDtlSq);

    List<ProductionDto.PlanRes> rows = new ArrayList<>(plans.size());
    for (ProductionPlan plan : plans) {
      rows.add(composePlanRow(plan, itemById, requirementById, orderDtlById));
    }
    return rows;
  }

  private List<Long> distinctSqs(List<ProductionPlan> plans, Function<ProductionPlan, Long> extractor) {
    return plans.stream().map(extractor).filter(Objects::nonNull).distinct().collect(Collectors.toList());
  }

  private ProductionDto.PlanRes composePlanRow(
      ProductionPlan plan, Map<Long, Item> itemById,
      Map<Long, ProductionRequirement> requirementById,
      Map<Long, SalesOrderDetail> orderDtlById) {

    ProductionDto.PlanRes row = new ProductionDto.PlanRes();

    // 계획 자체에서 그대로 복사되는 필드들.
    row.setPlanSq(plan.getPlanSq());
    row.setPlanDate(plan.getPlanDate());
    row.setLineSq(plan.getLineSq());
    row.setLineName(plan.getLineName());
    row.setPlanQty(plan.getPlanQty());
    row.setWeight(plan.getWeight());
    row.setEstimatedProductionTime(plan.getEstimatedProductionTime());
    row.setCurrentStock(plan.getCurrentStock());
    row.setStartTime(plan.getStartTime());
    row.setEndTime(plan.getEndTime());
    row.setPlanStatus(plan.getPlanStatus());
    row.setRemark(plan.getRemark());
    row.setRegDt(plan.getRegDt());
    row.setModDt(plan.getModDt());

    // 품목 마스터에서 끌어오는 스펙 필드들 (품목이 매핑된 경우에만).
    Item item = itemById.get(plan.getItemSq());
    if (item != null) {
      row.setItemSq(item.getItemSq());
      row.setItemCode(item.getItemCode());
      row.setItemName(item.getItemName());
      row.setItemSpec(item.getSpec());
      row.setBasisWeight(item.getEffectiveBasisWeight() != null ? item.getEffectiveBasisWeight() : 0.0);
      row.setWidth(item.getEffectiveWidth() != null ? item.getEffectiveWidth() : 0.0);
      row.setLength(item.getEffectiveLength() != null ? item.getEffectiveLength() : 0.0);
      // 계획에 지정된 생산속도가 우선, 없으면 품목 기본값.
      double speed = plan.getProductionSpeed() != null
          ? plan.getProductionSpeed()
          : (item.getProductionSpeed() != null ? item.getProductionSpeed() : 0.0);
      row.setProductionSpeed(speed);
    }

    // 계획 → 소요량 → 주문 상세 → 주문 으로 따라가 수주일자를 채워 준다.
    String orderDate = traceOrderDate(plan, requirementById, orderDtlById);
    if (orderDate != null) {
      row.setOrderDate(orderDate);
    }
    return row;
  }

  private String traceOrderDate(ProductionPlan plan,
                                Map<Long, ProductionRequirement> requirementById,
                                Map<Long, SalesOrderDetail> orderDtlById) {
    if (plan.getReqSq() == null) {
      return null;
    }
    ProductionRequirement requirement = requirementById.get(plan.getReqSq());
    if (requirement == null || requirement.getOrderDtlSq() == null) {
      return null;
    }
    SalesOrderDetail line = orderDtlById.get(requirement.getOrderDtlSq());
    if (line == null) {
      return null;
    }
    SalesOrder order = line.getSalesOrder();
    if (order == null || order.getOrderDate() == null) {
      return null;
    }
    return order.getOrderDate().toString();
  }

  /**
   * 생산 계획 일괄 저장 (신규/수정 혼합).
   */
  @Transactional
  public void savePlanList(List<ProductionDto.PlanSaveReq> reqList) {
    for (ProductionDto.PlanSaveReq req : reqList) {
      if (req.getPlanSq() == null) {
        insertPlan(req);
      } else {
        updatePlan(req);
      }
    }
  }

  private void insertPlan(ProductionDto.PlanSaveReq req) {
    Long resolvedItemSq = resolveItemSq(req.getItemSq(), req.getItemCode());

    // 신규 계획은 항상 대기(WAIT) 상태로 시작한다.
    ProductionPlan newPlan = ProductionPlan.builder()
        .itemSq(resolvedItemSq)
        .reqSq(req.getReqSq())
        .lineSq(req.getLineSq())
        .lineName(req.getLineName())
        .planDate(req.getPlanDate())
        .planQty(req.getPlanQty())
        .weight(req.getWeight())
        .currentStock(req.getCurrentStock())
        .productionSpeed(req.getProductionSpeed())
        .estimatedProductionTime(req.getEstimatedProductionTime())
        .startTime(req.getStartTime())
        .endTime(req.getEndTime())
        .remark(req.getRemark())
        .planStatus("WAIT")
        .build();
    planRepo.save(newPlan);
  }

  private void updatePlan(ProductionDto.PlanSaveReq req) {
    ProductionPlan plan = planRepo.findById(req.getPlanSq())
        .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND));
    plan.updateInfo(req.getPlanDate(), req.getLineSq(), req.getLineName(), req.getPlanQty(),
        req.getWeight(), req.getProductionSpeed(), req.getEstimatedProductionTime(),
        req.getCurrentStock(), req.getStartTime(), req.getEndTime(), req.getRemark());
  }

  // itemSq 가 비었으면 itemCode 로 한 번 조회해 본다.
  private Long resolveItemSq(Long itemSq, String itemCode) {
    if (itemSq != null) {
      return itemSq;
    }
    if (itemCode == null) {
      return null;
    }
    return itemRepo.findByItemCode(itemCode).map(Item::getItemSq).orElse(null);
  }

  /**
   * 생산 계획 일괄 삭제.
   */
  @Transactional
  public void deletePlanList(ProductionDto.PlanDeleteReq req) {
    if (req.getPlanIds() != null && !req.getPlanIds().isEmpty()) {
      planRepo.deleteAllById(req.getPlanIds());
    }
  }
}
