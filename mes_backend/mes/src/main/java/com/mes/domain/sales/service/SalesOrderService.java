package com.mes.domain.sales.service;

import com.mes.domain.customer.entity.Customer;
import com.mes.domain.customer.repository.CustomerRepository;
import com.mes.domain.item.entity.Item;
import com.mes.domain.item.repository.ItemRepository;
import com.mes.domain.sales.dto.SalesOrderDto;
import com.mes.domain.sales.entity.SalesOrder;
import com.mes.domain.sales.entity.SalesOrderDetail;
import com.mes.domain.sales.repository.SalesOrderRepository;
import com.mes.domain.shipment.repository.ShipmentPlanRepository;
import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;
import com.mes.global.support.EntityIndex;
import com.mes.global.response.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SalesOrderService {

  private static final BigDecimal DEFAULT_TAX_RATE = new BigDecimal("10.00");
  private static final String STATUS_ORDERED = "ORDERED";
  private static final DateTimeFormatter ORDER_NO_MONTH = DateTimeFormatter.ofPattern("yyyyMM");

  private final SalesOrderRepository salesOrderRepository;
  private final CustomerRepository customerRepository;
  private final ItemRepository itemRepository;
  private final ShipmentPlanRepository shipmentPlanRepository;

  // ==================================================================
  //  쓰기: 저장 / 삭제 / 채번
  // ==================================================================

  /**
   * 등록(orderSq == null) 또는 수정. 수정 시 기존 라인은 모두 비우고 다시 채운다.
   * 합계 금액은 라인을 붙이면서 누적한 값으로 갱신한다.
   */
  @Transactional
  public void save(SalesOrderDto.SaveReq req) {
    boolean isNew = req.getOrderSq() == null;
    SalesOrder order = isNew ? createOrder(req) : loadAndResetForUpdate(req);

    BigDecimal grandTotal = appendDetails(order, req);
    order.updateTotalAmt(grandTotal);
    salesOrderRepository.save(order);
  }

  @Transactional
  public void delete(SalesOrderDto.DeleteReq req) {
    List<Long> targetIds = req.getOrderIds();
    if (targetIds != null && !targetIds.isEmpty()) {
      salesOrderRepository.deleteAllById(targetIds);
    }
  }

  /** 신규 수주번호 채번. 형식: SO-YYYYMM-NNN (월 단위 3자리 시퀀스). */
  public String generateOrderNo() {
    String prefix = "SO-" + LocalDate.now().format(ORDER_NO_MONTH) + "-";
    String latest = salesOrderRepository.findMaxOrderNo(prefix);

    int sequence = 1;
    if (latest != null && latest.length() > prefix.length()) {
      sequence = Integer.parseInt(latest.substring(latest.length() - 3)) + 1;
    }
    return prefix + String.format("%03d", sequence);
  }

  // ==================================================================
  //  읽기: 목록 / 페이지 / 단건
  // ==================================================================

  /** 비페이징 목록. 거래처/품목 마스터를 한 번에 적재해 N+1 을 회피한다. */
  public List<SalesOrderDto.Res> getList(SalesOrderDto.SearchReq req) {
    List<SalesOrder> orders = salesOrderRepository.findBySearchCondition(
        req.getCustomerSq(), req.getDateFrom(), req.getDateTo(), req.getKeyword());
    return assembleResList(orders);
  }

  /** 페이지 단위 목록 (수주관리/생산소요량산출 화면). */
  public PageResponse<SalesOrderDto.Res> getListPaged(SalesOrderDto.SearchReq req) {
    int pageIdx = (req.getPage() != null && req.getPage() >= 0) ? req.getPage() : 0;
    int pageSize = (req.getSize() != null && req.getSize() > 0) ? req.getSize() : 50;

    Pageable pageable = PageRequest.of(pageIdx, pageSize,
        resolveOrderSort(req.getSortField(), req.getSortDirection()));
    Page<SalesOrder> slice = salesOrderRepository.findBySearchConditionPaged(
        req.getCustomerSq(), req.getDateFrom(), req.getDateTo(), req.getKeyword(), pageable);

    List<SalesOrderDto.Res> content = assembleResList(slice.getContent());
    return PageResponse.of(content, pageIdx, pageSize, slice.getTotalElements());
  }

  /** 단건 상세. */
  public SalesOrderDto.Res getDetail(Long orderSq) {
    SalesOrder order = salesOrderRepository.findById(orderSq)
        .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND));
    return mapToRes(order);
  }

  // ==================================================================
  //  저장 보조
  // ==================================================================

  private SalesOrder createOrder(SalesOrderDto.SaveReq req) {
    Boolean taxApply = req.getTaxApplyYn() != null ? req.getTaxApplyYn() : Boolean.TRUE;
    BigDecimal rate = req.getTaxRate() != null ? req.getTaxRate() : DEFAULT_TAX_RATE;
    return SalesOrder.builder()
        .orderNo(generateOrderNo())
        .customerSq(req.getCustomerSq())
        .orderDate(req.getOrderDate())
        .deliveryReqDate(req.getDeliveryReqDate())
        .deliveryPlace(req.getDeliveryPlace())
        .paymentTerms(req.getPaymentTerms())
        .remark(req.getRemark())
        .orderStatus(STATUS_ORDERED)
        .taxApplyYn(taxApply)
        .taxRate(rate)
        .useYn(true)
        .build();
  }

  private SalesOrder loadAndResetForUpdate(SalesOrderDto.SaveReq req) {
    SalesOrder order = salesOrderRepository.findById(req.getOrderSq())
        .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND));
    order.updateInfo(req.getCustomerSq(), req.getOrderDate(), req.getDeliveryReqDate(),
        req.getDeliveryPlace(), req.getPaymentTerms(), req.getRemark(),
        req.getTaxApplyYn(), req.getTaxRate());
    order.getOrderDetails().clear();
    return order;
  }

  /**
   * 요청 라인들을 엔티티로 만들어 부모에 붙이고, 각 라인의 합계를 누적해 총액을 돌려준다.
   *   공급액 = 단가 × m2  (소수 올림)
   *   부가세 = 라인 부가세 입력값 (소수 올림)
   *   합계   = 공급액 + 부가세
   */
  private BigDecimal appendDetails(SalesOrder order, SalesOrderDto.SaveReq req) {
    List<SalesOrderDto.DetailDto> lines = req.getDetails();
    if (lines == null || lines.isEmpty()) {
      return BigDecimal.ZERO;
    }

    BigDecimal runningTotal = BigDecimal.ZERO;
    for (SalesOrderDto.DetailDto line : lines) {
      BigDecimal price = nvl(line.getUnitPrice());
      BigDecimal unitVat = nvl(line.getUnitVatAmt());
      double areaM2 = line.getOrderQtyM2() != null ? line.getOrderQtyM2() : 0.0;

      BigDecimal supply = price.multiply(BigDecimal.valueOf(areaM2)).setScale(0, RoundingMode.CEILING);
      BigDecimal vat = unitVat.setScale(0, RoundingMode.CEILING);
      BigDecimal lineTotal = supply.add(vat);
      runningTotal = runningTotal.add(lineTotal);

      order.addDetail(SalesOrderDetail.builder()
          .itemSq(line.getItemSq())
          .orderQty(line.getOrderQty() != null ? line.getOrderQty() : 0)
          .orderUnit(line.getOrderUnit())
          .unitPrice(price)
          .unitVatAmt(unitVat)
          .supplyAmt(supply)
          .vatAmt(vat)
          .totalAmt(lineTotal)
          .spec(line.getSpec())
          .basisWeight(line.getBasisWeight())
          .width(line.getWidth())
          .length(line.getLength())
          .weight(line.getWeight())
          .orderQtyEa(line.getOrderQtyEa())
          .orderQtyM2(line.getOrderQtyM2())
          .remark(line.getRemark())
          .build());
    }
    return runningTotal;
  }

  private static BigDecimal nvl(BigDecimal v) {
    return v != null ? v : BigDecimal.ZERO;
  }

  // ==================================================================
  //  조회 → 응답 변환
  // ==================================================================

  /** 주문 목록 공통 변환. 비었으면 빈 리스트, 아니면 마스터 캐시를 적재해 매핑. */
  private List<SalesOrderDto.Res> assembleResList(List<SalesOrder> orders) {
    if (orders.isEmpty()) {
      return List.of();
    }
    Map<Long, Customer> customerLookup = loadCustomers(orders);
    Map<Long, Item> itemLookup = loadItems(orders);
    return orders.stream()
        .map(o -> mapToRes(o, customerLookup, itemLookup))
        .collect(Collectors.toList());
  }

  /** 단건용: findById 결과를 단일 항목 맵으로 감싸 공통 매핑에 위임. */
  private SalesOrderDto.Res mapToRes(SalesOrder order) {
    Map<Long, Customer> customerLookup = customerRepository.findById(order.getCustomerSq())
        .map(c -> Map.of(c.getCustomerSq(), c))
        .orElseGet(Map::of);
    Set<Long> itemIds = order.getOrderDetails().stream()
        .map(SalesOrderDetail::getItemSq)
        .filter(Objects::nonNull)
        .collect(Collectors.toSet());
    Map<Long, Item> itemLookup = EntityIndex.byId(
        List.copyOf(itemIds), itemRepository::findAllById, Item::getItemSq);
    return mapToRes(order, customerLookup, itemLookup);
  }

  /** 미리 적재된 거래처/품목 캐시를 사용하는 공통 변환. */
  private SalesOrderDto.Res mapToRes(SalesOrder order,
      Map<Long, Customer> customerLookup,
      Map<Long, Item> itemLookup) {
    SalesOrderDto.Res res = new SalesOrderDto.Res();
    res.setOrderSq(order.getOrderSq());
    res.setOrderNo(order.getOrderNo());
    res.setCustomerSq(order.getCustomerSq());
    res.setOrderDate(order.getOrderDate());
    res.setDeliveryReqDate(order.getDeliveryReqDate());
    res.setDeliveryPlace(order.getDeliveryPlace());
    res.setTotalOrderAmt(order.getTotalOrderAmt());
    res.setPaymentTerms(order.getPaymentTerms());
    res.setOrderStatus(order.getOrderStatus());
    res.setRemark(order.getRemark());
    res.setTaxApplyYn(order.getTaxApplyYn());
    res.setTaxRate(order.getTaxRate());
    res.setRegDt(order.getRegDt());

    Customer customer = customerLookup.get(order.getCustomerSq());
    if (customer != null) {
      res.setCustomerName(customer.getCustomerName());
      res.setCustomerCode(customer.getCustomerCode());
    }

    res.setDetails(order.getOrderDetails().stream()
        .map(d -> mapDetail(d, itemLookup))
        .collect(Collectors.toList()));
    return res;
  }

  private SalesOrderDto.DetailRes mapDetail(SalesOrderDetail d, Map<Long, Item> itemLookup) {
    SalesOrderDto.DetailRes dr = new SalesOrderDto.DetailRes();
    dr.setOrderDtlSq(d.getOrderDtlSq());
    dr.setItemSq(d.getItemSq());

    Item item = itemLookup.get(d.getItemSq());
    if (item != null) {
      dr.setItemCode(item.getItemCode());
      dr.setItemName(item.getItemName());
    }

    dr.setOrderQty(d.getOrderQty());
    dr.setOrderQtyEa(d.getOrderQtyEa());
    dr.setOrderQtyM2(d.getOrderQtyM2());
    dr.setOrderUnit(d.getOrderUnit());
    dr.setUnitPrice(d.getUnitPrice());
    dr.setUnitVatAmt(d.getUnitVatAmt());
    dr.setSupplyAmt(d.getSupplyAmt());
    dr.setVatAmt(d.getVatAmt());
    dr.setTotalAmt(d.getTotalAmt());
    dr.setSpec(d.getSpec());
    dr.setBasisWeight(d.getBasisWeight());
    dr.setWidth(d.getWidth());
    dr.setLength(d.getLength());
    dr.setWeight(d.getWeight());
    dr.setRemark(d.getRemark());
    if (d.getOrderDtlSq() != null) {
      dr.setPlannedQty(shipmentPlanRepository.sumPlanQtyBySalesOrderDtlSq(d.getOrderDtlSq()));
    }
    return dr;
  }

  // ==================================================================
  //  마스터 캐시 / 정렬
  // ==================================================================

  private Map<Long, Customer> loadCustomers(List<SalesOrder> orders) {
    Set<Long> ids = orders.stream()
        .map(SalesOrder::getCustomerSq)
        .filter(Objects::nonNull)
        .collect(Collectors.toSet());
    return EntityIndex.byId(List.copyOf(ids), customerRepository::findAllById, Customer::getCustomerSq);
  }

  private Map<Long, Item> loadItems(List<SalesOrder> orders) {
    Set<Long> ids = orders.stream()
        .flatMap(o -> o.getOrderDetails().stream())
        .map(SalesOrderDetail::getItemSq)
        .filter(Objects::nonNull)
        .collect(Collectors.toSet());
    return EntityIndex.byId(List.copyOf(ids), itemRepository::findAllById, Item::getItemSq);
  }

  private Sort resolveOrderSort(String field, String direction) {
    Sort fallback = Sort.by(Sort.Order.desc("orderNo"));
    if (field == null || field.isEmpty()) {
      return fallback;
    }
    String column;
    switch (field) {
      case "orderNo":          column = "orderNo"; break;
      case "orderDate":        column = "orderDate"; break;
      case "deliveryReqDate":  column = "deliveryReqDate"; break;
      case "totalOrderAmt":    column = "totalOrderAmt"; break;
      case "orderStatus":      column = "orderStatus"; break;
      default:                 return fallback;
    }
    return "ASC".equalsIgnoreCase(direction)
        ? Sort.by(Sort.Order.asc(column))
        : Sort.by(Sort.Order.desc(column));
  }
}
