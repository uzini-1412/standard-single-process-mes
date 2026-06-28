package com.mes.domain.purchase.service;

import com.mes.domain.customer.entity.Customer;
import com.mes.domain.customer.repository.CustomerRepository;
import com.mes.domain.item.entity.Item;
import com.mes.domain.item.repository.ItemRepository;
import com.mes.domain.material.repository.MaterialInboundRepository;
import com.mes.domain.purchase.dto.PurchaseOrderDto;
import com.mes.domain.purchase.entity.PurchaseOrder;
import com.mes.domain.purchase.entity.PurchaseOrderDetail;
import com.mes.domain.purchase.repository.PurchaseOrderRepository;
import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;
import com.mes.global.support.EntityIndex;
import lombok.RequiredArgsConstructor;
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
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 발주(Purchase Order) 마스터 1건 + 상세 N건의 등록/조회/삭제를 담당한다.
 * 조회는 거래처·품목을 PK 일괄 조회 후 Map join 으로 풀어 N+1 을 피한다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PurchaseOrderService {

  /** 부가세 기본율(%) 및 분모. */
  private static final BigDecimal DEFAULT_TAX_RATE = new BigDecimal("10.00");
  private static final BigDecimal PERCENT = new BigDecimal("100");
  private static final DateTimeFormatter YEAR_MONTH = DateTimeFormatter.ofPattern("yyyyMM");

  private final PurchaseOrderRepository purchaseOrderRepository;
  private final CustomerRepository customerRepository;
  private final ItemRepository itemRepository;
  private final MaterialInboundRepository materialInboundRepository;

  // ── 조회 ────────────────────────────────────────────

  public List<PurchaseOrderDto.Res> getList(PurchaseOrderDto.SearchReq req) {
    List<PurchaseOrder> orders = purchaseOrderRepository.findBySearchCondition(
        req.getCustomerSq(), req.getDateFrom(), req.getDateTo(), req.getKeyword());
    if (orders.isEmpty()) {
      return List.of();
    }
    Map<Long, Customer> customerById = customersOf(orders);
    Map<Long, Item> itemById = itemsOf(orders);
    return orders.stream()
        .map(po -> toRes(po, customerById, itemById))
        .collect(Collectors.toList());
  }

  public PurchaseOrderDto.Res getDetail(Long orderSq) {
    PurchaseOrder po = loadOrder(orderSq);
    PurchaseOrderDto.Res dto = toRes(po);
    dto.setHasInbound(usedByInbound(po));   // 가입고가 걸려 있으면 삭제 불가
    return dto;
  }

  // ── 저장 / 삭제 ─────────────────────────────────────

  @Transactional
  public void save(PurchaseOrderDto.SaveReq req) {
    PurchaseOrder master = (req.getOrderSq() == null) ? createMaster(req) : refreshMaster(req);
    BigDecimal grandTotal = attachLines(master, req.getDetails());
    master.updateTotalAmt(grandTotal);
    purchaseOrderRepository.save(master);
  }

  @Transactional
  public void delete(PurchaseOrderDto.DeleteReq req) {
    List<Long> ids = req.getOrderIds();
    if (ids == null || ids.isEmpty()) {
      return;
    }
    List<Long> lineSqs = purchaseOrderRepository.findAllById(ids).stream()
        .flatMap(po -> po.getOrderDetails().stream())
        .map(PurchaseOrderDetail::getOrderDtlSq)
        .filter(Objects::nonNull)
        .collect(Collectors.toList());
    if (!lineSqs.isEmpty() && materialInboundRepository.existsByOrderDtlSqIn(lineSqs)) {
      throw new CustomException(ErrorCode.COMMON_INFO_IN_USE);
    }
    purchaseOrderRepository.deleteAllById(ids);
  }

  /** 발주번호 채번: PO-yyyyMM-001 부터 월 단위로 증가. */
  public String generateOrderNo() {
    String prefix = "PO-" + LocalDate.now().format(YEAR_MONTH) + "-";
    String latest = purchaseOrderRepository.findMaxOrderNo(prefix);
    int next = (latest == null) ? 1 : Integer.parseInt(latest.substring(prefix.length())) + 1;
    return prefix + String.format("%03d", next);
  }

  // ── 마스터 빌드/갱신 ────────────────────────────────

  private PurchaseOrder createMaster(PurchaseOrderDto.SaveReq req) {
    // 발주번호는 프론트 선채번 값을 우선 쓰고, 비어 있으면 서버에서 생성한다.
    String orderNo = hasText(req.getOrderNo()) ? req.getOrderNo() : generateOrderNo();
    return PurchaseOrder.builder()
        .orderNo(orderNo)
        .orderStatus("ORDERED")
        .customerSq(req.getCustomerSq())
        .orderDate(req.getOrderDate())
        .inReqDate(req.getInReqDate())
        .paymentTerms(req.getPaymentTerms())
        .remark(req.getRemark())
        .submitDoc(req.getSubmitDoc())
        .reqMaterialCertYn(req.getReqMaterialCertYn())
        .reqTransSpecYn(req.getReqTransSpecYn())
        .materialCertFilePath(req.getMaterialCertFilePath())
        .materialCertFileNm(req.getMaterialCertFileNm())
        .transSpecFilePath(req.getTransSpecFilePath())
        .transSpecFileNm(req.getTransSpecFileNm())
        .taxApplyYn(req.getTaxApplyYn() != null ? req.getTaxApplyYn() : true)
        .taxRate(req.getTaxRate() != null ? req.getTaxRate() : DEFAULT_TAX_RATE)
        .useYn(true)
        .build();
  }

  private PurchaseOrder refreshMaster(PurchaseOrderDto.SaveReq req) {
    PurchaseOrder master = loadOrder(req.getOrderSq());
    master.updateOrder(
        req.getCustomerSq(), req.getOrderDate(), req.getInReqDate(),
        req.getPaymentTerms(), req.getRemark(), req.getSubmitDoc(),
        req.getReqMaterialCertYn(), req.getReqTransSpecYn(),
        req.getMaterialCertFilePath(), req.getMaterialCertFileNm(),
        req.getTransSpecFilePath(), req.getTransSpecFileNm(),
        req.getTaxApplyYn(), req.getTaxRate(),
        req.getWriterId());
    master.getOrderDetails().clear();   // 상세는 전량 교체
    return master;
  }

  /** 상세 품목을 계산해 마스터에 달고, 합계 금액을 돌려준다. (공급가·부가세 모두 올림) */
  private BigDecimal attachLines(PurchaseOrder master, List<PurchaseOrderDto.DetailDto> lines) {
    if (lines == null) {
      return BigDecimal.ZERO;
    }
    boolean taxed = Boolean.TRUE.equals(master.getTaxApplyYn());
    BigDecimal rate = master.getTaxRate() != null ? master.getTaxRate() : DEFAULT_TAX_RATE;

    BigDecimal sum = BigDecimal.ZERO;
    for (PurchaseOrderDto.DetailDto line : lines) {
      int qty = line.getOrderQty() != null ? line.getOrderQty() : 0;
      BigDecimal price = line.getUnitPrice() != null ? line.getUnitPrice() : BigDecimal.ZERO;

      BigDecimal supply = BigDecimal.valueOf(qty).multiply(price).setScale(0, RoundingMode.CEILING);
      BigDecimal vat = taxed
          ? supply.multiply(rate).divide(PERCENT, 0, RoundingMode.CEILING)
          : BigDecimal.ZERO;
      BigDecimal lineTotal = supply.add(vat);
      sum = sum.add(lineTotal);

      master.addDetail(PurchaseOrderDetail.builder()
          .itemSq(line.getItemSq())
          .orderQty(qty)
          .orderUnit(line.getOrderUnit())
          .unitPrice(price)
          .supplyAmt(supply)
          .vatAmt(vat)
          .totalAmt(lineTotal)
          .spec(line.getSpec())
          .remark(line.getRemark())
          .build());
    }
    return sum;
  }

  // ── 보조 조회 ───────────────────────────────────────

  private PurchaseOrder loadOrder(Long orderSq) {
    return purchaseOrderRepository.findById(orderSq)
        .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND));
  }

  private boolean usedByInbound(PurchaseOrder po) {
    List<Long> lineSqs = po.getOrderDetails().stream()
        .map(PurchaseOrderDetail::getOrderDtlSq)
        .filter(Objects::nonNull)
        .collect(Collectors.toList());
    return !lineSqs.isEmpty() && materialInboundRepository.existsByOrderDtlSqIn(lineSqs);
  }

  private Map<Long, Customer> customersOf(List<PurchaseOrder> orders) {
    Set<Long> ids = orders.stream()
        .map(PurchaseOrder::getCustomerSq)
        .filter(Objects::nonNull)
        .collect(Collectors.toSet());
    return EntityIndex.byId(List.copyOf(ids), customerRepository::findAllById, Customer::getCustomerSq);
  }

  private Map<Long, Item> itemsOf(List<PurchaseOrder> orders) {
    Set<Long> ids = orders.stream()
        .flatMap(po -> po.getOrderDetails().stream())
        .map(PurchaseOrderDetail::getItemSq)
        .filter(Objects::nonNull)
        .collect(Collectors.toSet());
    return EntityIndex.byId(List.copyOf(ids), itemRepository::findAllById, Item::getItemSq);
  }

  // ── 엔티티 → DTO ───────────────────────────────────

  private PurchaseOrderDto.Res toRes(PurchaseOrder po) {
    Map<Long, Customer> customerById = customerRepository.findById(po.getCustomerSq())
        .map(c -> Map.of(c.getCustomerSq(), c))
        .orElseGet(Map::of);
    Set<Long> itemIds = po.getOrderDetails().stream()
        .map(PurchaseOrderDetail::getItemSq)
        .filter(Objects::nonNull)
        .collect(Collectors.toSet());
    Map<Long, Item> itemById = EntityIndex.byId(
        List.copyOf(itemIds), itemRepository::findAllById, Item::getItemSq);
    return toRes(po, customerById, itemById);
  }

  private PurchaseOrderDto.Res toRes(PurchaseOrder po,
      Map<Long, Customer> customerById, Map<Long, Item> itemById) {
    PurchaseOrderDto.Res dto = new PurchaseOrderDto.Res();
    dto.setOrderSq(po.getOrderSq());
    dto.setOrderNo(po.getOrderNo());
    dto.setCustomerSq(po.getCustomerSq());
    dto.setOrderDate(po.getOrderDate());
    dto.setInReqDate(po.getInReqDate());
    dto.setPaymentTerms(po.getPaymentTerms());
    dto.setTotalOrderAmt(po.getTotalOrderAmt());
    dto.setOrderStatus(po.getOrderStatus());
    dto.setRemark(po.getRemark());
    dto.setSubmitDoc(po.getSubmitDoc());
    dto.setReqMaterialCertYn(po.getReqMaterialCertYn());
    dto.setReqTransSpecYn(po.getReqTransSpecYn());
    dto.setMaterialCertFilePath(po.getMaterialCertFilePath());
    dto.setMaterialCertFileNm(po.getMaterialCertFileNm());
    dto.setTransSpecFilePath(po.getTransSpecFilePath());
    dto.setTransSpecFileNm(po.getTransSpecFileNm());
    dto.setTaxApplyYn(po.getTaxApplyYn());
    dto.setTaxRate(po.getTaxRate());
    dto.setRegDt(po.getRegDt());

    Customer cust = customerById.get(po.getCustomerSq());
    if (cust != null) {
      dto.setCustomerCode(cust.getCustomerCode());
      dto.setCustomerName(cust.getCustomerName());
    }

    dto.setDetails(po.getOrderDetails().stream()
        .map(line -> toLineRes(line, itemById))
        .collect(Collectors.toList()));
    return dto;
  }

  private PurchaseOrderDto.DetailRes toLineRes(PurchaseOrderDetail line, Map<Long, Item> itemById) {
    PurchaseOrderDto.DetailRes lineDto = new PurchaseOrderDto.DetailRes();
    lineDto.setOrderDtlSq(line.getOrderDtlSq());
    lineDto.setItemSq(line.getItemSq());
    lineDto.setOrderQty(line.getOrderQty());
    lineDto.setOrderUnit(line.getOrderUnit());
    lineDto.setUnitPrice(line.getUnitPrice());
    lineDto.setSupplyAmt(line.getSupplyAmt());
    lineDto.setVatAmt(line.getVatAmt());
    lineDto.setTotalAmt(line.getTotalAmt());
    lineDto.setSpec(line.getSpec());
    lineDto.setRemark(line.getRemark());

    Item item = itemById.get(line.getItemSq());
    if (item != null) {
      lineDto.setItemCode(item.getItemCode());
      lineDto.setItemName(item.getItemName());
      lineDto.setImportInspGb(item.getImportInspGb());
    }
    return lineDto;
  }

  private static boolean hasText(String s) {
    return s != null && !s.isEmpty();
  }
}
