package com.mes.domain.shipment.service;

import com.mes.domain.customer.repository.CustomerRepository;
import com.mes.domain.item.entity.Item;
import com.mes.domain.item.repository.ItemRepository;
import com.mes.domain.sales.entity.SalesOrderDetail;
import com.mes.domain.sales.repository.SalesOrderDetailRepository;
import com.mes.domain.shipment.dto.TradeStatementDto;
import com.mes.domain.shipment.entity.ShipmentOrderDetail;
import com.mes.domain.shipment.entity.ShipmentPlan;
import com.mes.domain.shipment.entity.TradeStatement;
import com.mes.domain.shipment.entity.TradeStatementItem;
import com.mes.domain.shipment.repository.ShipmentOrderDetailRepository;
import com.mes.domain.shipment.repository.ShipmentPlanRepository;
import com.mes.domain.shipment.repository.TradeStatementRepository;
import com.mes.global.support.EntityIndex;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 거래명세서 발행 서비스.
 *
 * 출하지시 상세 → 출하계획 → 수주상세로 이어지는 참조 체인을 따라 명세서 초기 데이터를
 * 채워 주고, 발행된 명세서는 키로 다시 찾아 읽거나 저장한다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TradeStatementService {

  private static final String SOURCE_SHIP_ORDER = "SHIP_ORDER";

  private final TradeStatementRepository statementRepo;
  private final ShipmentOrderDetailRepository orderDetailRepo;
  private final ShipmentPlanRepository planRepo;
  private final SalesOrderDetailRepository salesOrderDetailRepo;
  private final CustomerRepository customerRepo;
  private final ItemRepository itemRepo;

  public TradeStatementDto.Res getByShipOrderSq(Long shipOrderSq) {
    return statementRepo.findByShipOrderSq(shipOrderSq).map(this::toRes).orElse(null);
  }

  /** (sourceType, sourceKey)로 먼저 찾고, 없으면 shipOrderSq로 폴백 조회한다. */
  public TradeStatementDto.Res get(TradeStatementDto.SearchReq req) {
    boolean hasSource = req.getSourceType() != null && req.getSourceKey() != null;
    if (hasSource) {
      TradeStatementDto.Res bySource = statementRepo
          .findBySourceTypeAndSourceKey(req.getSourceType(), req.getSourceKey())
          .map(this::toRes)
          .orElse(null);
      if (bySource != null) {
        return bySource;
      }
    }
    if (isPositive(req.getShipOrderSq())) {
      return statementRepo.findByShipOrderSq(req.getShipOrderSq()).map(this::toRes).orElse(null);
    }
    return null;
  }

  /**
   * 명세서를 저장한다. 동일 키의 건이 있으면 마스터를 갱신하고 항목을 통째로 교체하며,
   * 없으면 새로 만든다. 항목은 cascade로 함께 영속화된다.
   */
  @Transactional
  public void save(TradeStatementDto.SaveReq req) {
    TradeStatement existing = locateExisting(req.getSourceType(), req.getSourceKey(), req.getShipOrderSq());
    TradeStatement target;
    if (existing != null) {
      existing.update(toEntity(req));
      existing.getItems().clear();
      target = existing;
    } else {
      target = toEntity(req);
    }
    attachItems(target, req);
    statementRepo.save(target);
  }

  private TradeStatement locateExisting(String sourceType, String sourceKey, Long shipOrderSq) {
    if (sourceType != null && sourceKey != null) {
      TradeStatement bySource = statementRepo.findBySourceTypeAndSourceKey(sourceType, sourceKey).orElse(null);
      if (bySource != null) {
        return bySource;
      }
    }
    if (!isPositive(shipOrderSq)) {
      return null;
    }
    return statementRepo.findByShipOrderSq(shipOrderSq).orElse(null);
  }

  private void attachItems(TradeStatement statement, TradeStatementDto.SaveReq req) {
    List<TradeStatementDto.ItemData> rows = req.getItems();
    if (rows == null) {
      return;
    }
    for (TradeStatementDto.ItemData row : rows) {
      statement.addItem(toItemEntity(row));
    }
  }

  /** 출하지시 상세를 출발점으로 출하계획·수주상세를 묶어 명세서 초기 데이터를 만든다. */
  public TradeStatementDto.InitRes getInitDataByShipOrderSq(Long shipOrderSq) {
    TradeStatementDto.InitRes res = new TradeStatementDto.InitRes();

    List<ShipmentOrderDetail> details = orderDetailRepo.findByShipmentOrder_ShipOrderSq(shipOrderSq);
    if (details.isEmpty()) {
      return res;
    }

    ShipmentOrderDetail head = details.get(0);
    fillBuyer(res, head);
    if (head.getShipmentOrder() != null) {
      res.setStatementDate(head.getShipmentOrder().getExpectedShipDate());
    }

    // 행마다 item/plan/salesDetail을 개별 조회하면 N+1이 되므로 한 번에 적재해 Map으로 룩업한다.
    Map<Long, Item> itemById = loadItems(details);
    Map<Long, ShipmentPlan> planById = loadPlans(details);
    Map<Long, SalesOrderDetail> salesDtlById = loadSalesDetails(planById.values());

    List<TradeStatementDto.InitItemRes> items = new ArrayList<>(details.size());
    for (ShipmentOrderDetail detail : details) {
      items.add(buildInitItem(detail, itemById, planById, salesDtlById));
    }
    res.setItems(items);
    return res;
  }

  private void fillBuyer(TradeStatementDto.InitRes res, ShipmentOrderDetail head) {
    if (head.getCustomerCode() == null) {
      return;
    }
    customerRepo.findByCustomerCode(head.getCustomerCode()).ifPresent(c -> {
      res.setBuyerRegNo(c.getBusinessNo());
      res.setBuyerCompany(c.getCustomerName());
      res.setBuyerCeo(c.getOwnerName());
      res.setBuyerAddress(c.getAddress());
    });
  }

  private Map<Long, Item> loadItems(List<ShipmentOrderDetail> details) {
    Set<Long> ids = collectSet(details.stream().map(ShipmentOrderDetail::getItemSq));
    return EntityIndex.byId(List.copyOf(ids), itemRepo::findAllById, Item::getItemSq);
  }

  private Map<Long, ShipmentPlan> loadPlans(List<ShipmentOrderDetail> details) {
    Set<Long> ids = collectSet(details.stream().map(ShipmentOrderDetail::getPlanSq));
    return EntityIndex.byId(List.copyOf(ids), planRepo::findAllById, ShipmentPlan::getPlanSq);
  }

  private Map<Long, SalesOrderDetail> loadSalesDetails(java.util.Collection<ShipmentPlan> plans) {
    Set<Long> ids = collectSet(plans.stream().map(ShipmentPlan::getSalesOrderDtlSq));
    return EntityIndex.byId(List.copyOf(ids), salesOrderDetailRepo::findAllById, SalesOrderDetail::getOrderDtlSq);
  }

  private TradeStatementDto.InitItemRes buildInitItem(ShipmentOrderDetail detail,
                                                      Map<Long, Item> itemById,
                                                      Map<Long, ShipmentPlan> planById,
                                                      Map<Long, SalesOrderDetail> salesDtlById) {
    TradeStatementDto.InitItemRes item = new TradeStatementDto.InitItemRes();

    item.setProductName(composeProductName(detail, itemById));

    // 출하지시 orderQty는 Double(m) 단위지만 명세서 수량은 정수로 내림 처리한다.
    Double orderQty = detail.getOrderQty();
    item.setQty(orderQty != null ? orderQty.intValue() : null);

    applyPricing(item, detail, planById, salesDtlById);

    // 단가·수량은 있는데 공급가액이 비어 있으면 수량 × 단가로 채운다.
    boolean needsSupply = item.getUnitPrice() != null && item.getSupplyPrice() == null && item.getQty() != null;
    if (needsSupply) {
      item.setSupplyPrice(item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQty())));
    }
    return item;
  }

  // "품명 - 규격"(품목 마스터 spec) 형태로 표시명을 만든다. spec이 없으면 품명만 쓴다.
  private String composeProductName(ShipmentOrderDetail detail, Map<Long, Item> itemById) {
    String itemName = detail.getItemName() != null ? detail.getItemName() : "";
    String spec = "";
    if (detail.getItemSq() != null) {
      Item it = itemById.get(detail.getItemSq());
      if (it != null && it.getSpec() != null) {
        spec = it.getSpec();
      }
    }
    return spec.isEmpty() ? itemName : itemName + " - " + spec;
  }

  // 단가/공급가액/세액은 출하계획을 거쳐 연결된 수주상세에서 가져온다.
  private void applyPricing(TradeStatementDto.InitItemRes item, ShipmentOrderDetail detail,
                            Map<Long, ShipmentPlan> planById, Map<Long, SalesOrderDetail> salesDtlById) {
    if (detail.getPlanSq() == null) {
      return;
    }
    ShipmentPlan plan = planById.get(detail.getPlanSq());
    if (plan == null || plan.getSalesOrderDtlSq() == null) {
      return;
    }
    SalesOrderDetail sd = salesDtlById.get(plan.getSalesOrderDtlSq());
    if (sd == null) {
      return;
    }
    item.setUnitPrice(sd.getUnitPrice());
    item.setSupplyPrice(sd.getSupplyAmt());
    item.setTax(sd.getVatAmt());
  }

  private static Set<Long> collectSet(java.util.stream.Stream<Long> ids) {
    return ids.filter(Objects::nonNull).collect(Collectors.toSet());
  }

  private static boolean isPositive(Long value) {
    return value != null && value.longValue() > 0L;
  }

  private TradeStatement toEntity(TradeStatementDto.SaveReq req) {
    String sourceType = req.getSourceType();
    if (sourceType == null) {
      sourceType = SOURCE_SHIP_ORDER;
    }
    return TradeStatement.builder()
        // 키/출처/발행일
        .shipOrderSq(req.getShipOrderSq())
        .sourceType(sourceType)
        .sourceKey(req.getSourceKey())
        .statementDate(req.getStatementDate())
        // 공급자(supplier) 측 정보
        .supplierRegNo(req.getSupplierRegNo())
        .supplierCompany(req.getSupplierCompany())
        .supplierCeo(req.getSupplierCeo())
        .supplierAddress(req.getSupplierAddress())
        .supplierBizType(req.getSupplierBizType())
        .supplierBizItem(req.getSupplierBizItem())
        // 공급받는자(buyer) 측 정보
        .buyerRegNo(req.getBuyerRegNo())
        .buyerCompany(req.getBuyerCompany())
        .buyerCeo(req.getBuyerCeo())
        .buyerAddress(req.getBuyerAddress())
        .buyerBizType(req.getBuyerBizType())
        .buyerBizItem(req.getBuyerBizItem())
        // 금액 집계 및 비고
        .prevBalance(req.getPrevBalance())
        .shipAmount(req.getShipAmount())
        .depositAmount(req.getDepositAmount())
        .currBalance(req.getCurrBalance())
        .receiverName(req.getReceiverName())
        .remark(req.getRemark())
        .build();
  }

  private TradeStatementItem toItemEntity(TradeStatementDto.ItemData d) {
    return TradeStatementItem.builder()
        .rowNo(d.getRowNo())
        .productName(d.getProductName())
        .spec(d.getSpec())
        .qty(d.getQty())
        .unitPrice(d.getUnitPrice())
        .supplyPrice(d.getSupplyPrice())
        .tax(d.getTax())
        .build();
  }

  private TradeStatementDto.Res toRes(TradeStatement e) {
    TradeStatementDto.Res res = new TradeStatementDto.Res();

    // 키/출처/발행일
    res.setStatementSq(e.getStatementSq());
    res.setShipOrderSq(e.getShipOrderSq());
    res.setSourceType(e.getSourceType());
    res.setSourceKey(e.getSourceKey());
    res.setStatementDate(e.getStatementDate());

    // 공급자(supplier) 측 정보
    res.setSupplierRegNo(e.getSupplierRegNo());
    res.setSupplierCompany(e.getSupplierCompany());
    res.setSupplierCeo(e.getSupplierCeo());
    res.setSupplierAddress(e.getSupplierAddress());
    res.setSupplierBizType(e.getSupplierBizType());
    res.setSupplierBizItem(e.getSupplierBizItem());

    // 공급받는자(buyer) 측 정보
    res.setBuyerRegNo(e.getBuyerRegNo());
    res.setBuyerCompany(e.getBuyerCompany());
    res.setBuyerCeo(e.getBuyerCeo());
    res.setBuyerAddress(e.getBuyerAddress());
    res.setBuyerBizType(e.getBuyerBizType());
    res.setBuyerBizItem(e.getBuyerBizItem());

    // 금액 집계 및 비고
    res.setPrevBalance(e.getPrevBalance());
    res.setShipAmount(e.getShipAmount());
    res.setDepositAmount(e.getDepositAmount());
    res.setCurrBalance(e.getCurrBalance());
    res.setReceiverName(e.getReceiverName());
    res.setRemark(e.getRemark());

    // 명세 라인
    List<TradeStatementDto.ItemRes> rows = e.getItems().stream()
        .map(this::toItemRes)
        .collect(Collectors.toList());
    res.setItems(rows);
    return res;
  }

  private TradeStatementDto.ItemRes toItemRes(TradeStatementItem i) {
    TradeStatementDto.ItemRes ir = new TradeStatementDto.ItemRes();
    ir.setItemSq(i.getItemSq());
    ir.setRowNo(i.getRowNo());
    ir.setProductName(i.getProductName());
    ir.setSpec(i.getSpec());
    ir.setQty(i.getQty());
    ir.setUnitPrice(i.getUnitPrice());
    ir.setSupplyPrice(i.getSupplyPrice());
    ir.setTax(i.getTax());
    return ir;
  }
}
