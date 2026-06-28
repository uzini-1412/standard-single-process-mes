package com.mes.domain.purchase.service;

import com.mes.domain.customer.entity.Customer;
import com.mes.domain.customer.repository.CustomerRepository;
import com.mes.domain.item.entity.Item;
import com.mes.domain.item.repository.ItemRepository;
import com.mes.domain.material.entity.MaterialInbound;
import com.mes.domain.material.repository.MaterialInboundRepository;
import com.mes.domain.purchase.dto.PurchaseStatusDto;
import com.mes.domain.purchase.entity.PurchaseOrderDetail;
import com.mes.domain.purchase.repository.PurchaseOrderDetailRepository;
import com.mes.global.response.PageResponse;
import com.mes.global.support.EntityIndex;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 거래처원장(매입현황). 합격 입고 실적(MaterialInbound) 을 기준으로
 * 발주상세→발주→거래처 / 품목 을 join 해 매입 금액을 환산한다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PurchaseStatusService {

  private static final BigDecimal VAT_RATE = new BigDecimal("0.1");
  private static final LocalDate EPOCH_FLOOR = LocalDate.of(2000, 1, 1);

  private final MaterialInboundRepository inboundRepository;
  private final PurchaseOrderDetailRepository orderDetailRepository;
  private final ItemRepository itemRepository;
  private final CustomerRepository customerRepository;

  @PersistenceContext
  private EntityManager em;

  // ── 목록 / 상세 ─────────────────────────────────────

  public List<PurchaseStatusDto.Res> getPurchaseStatusList(PurchaseStatusDto.SearchReq req) {
    List<MaterialInbound> accepted = acceptedInbounds(req.getDateFrom(), req.getDateTo());
    return buildRows(accepted, req.getCustomerSq());
  }

  // 그룹 상세(팝업): 선택한 (계정/거래처/입고일) 키로 풀로드 없이 단일일자만 조회한다.
  public List<PurchaseStatusDto.Res> getPurchaseStatusItemsByGroup(PurchaseStatusDto.SearchReq req) {
    LocalDate day = req.getGroupInboundDate();
    if (day == null) {
      return List.of();
    }

    List<MaterialInbound> accepted = inboundRepository.findByInboundDate(day).stream()
        .filter(this::isAccepted)
        .collect(Collectors.toList());

    accepted = applyAccountTypeFilter(accepted, req.getGroupAccountType());
    Long customerSqFilter = toCustomerSqFilter(req.getGroupCustomerCode());
    return buildRows(accepted, customerSqFilter);
  }

  private List<MaterialInbound> applyAccountTypeFilter(List<MaterialInbound> accepted, String accountType) {
    if (accountType == null || accountType.isEmpty() || accepted.isEmpty()) {
      return accepted;
    }
    Set<Long> itemSqs = accepted.stream()
        .map(MaterialInbound::getItemSq)
        .filter(Objects::nonNull)
        .collect(Collectors.toSet());
    Set<Long> matchedItemSqs = itemRepository.findAllById(itemSqs).stream()
        .filter(i -> accountType.equals(i.getAccountType()))
        .map(Item::getItemSq)
        .collect(Collectors.toSet());
    return accepted.stream()
        .filter(m -> matchedItemSqs.contains(m.getItemSq()))
        .collect(Collectors.toList());
  }

  private Long toCustomerSqFilter(String customerCode) {
    if (customerCode == null || customerCode.isEmpty()) {
      return null;
    }
    // 매칭되는 거래처가 없으면 -1 로 강제 미스 처리
    return customerRepository.findByCustomerCode(customerCode)
        .map(Customer::getCustomerSq)
        .orElse(-1L);
  }

  // ── MaterialInbound → Res 변환 (4단 FK 일괄 조회) ──

  private List<PurchaseStatusDto.Res> buildRows(List<MaterialInbound> accepted, Long customerSqFilter) {
    if (accepted.isEmpty()) {
      return List.of();
    }

    Map<Long, PurchaseOrderDetail> detailById = detailsByOrderDtlSq(accepted);

    List<MaterialInbound> scoped = (customerSqFilter == null)
        ? accepted
        : filterByCustomer(accepted, detailById, customerSqFilter);
    if (scoped.isEmpty()) {
      return List.of();
    }

    Map<Long, Item> itemById = itemsOf(scoped);
    Map<Long, Customer> customerById = customersOf(detailById);

    return scoped.stream()
        .map(m -> toRow(m, detailById, itemById, customerById))
        .collect(Collectors.toList());
  }

  private List<MaterialInbound> filterByCustomer(List<MaterialInbound> list,
      Map<Long, PurchaseOrderDetail> detailById, Long customerSq) {
    return list.stream()
        .filter(m -> {
          PurchaseOrderDetail d = (m.getOrderDtlSq() == null) ? null : detailById.get(m.getOrderDtlSq());
          return d != null && d.getPurchaseOrder() != null
              && customerSq.equals(d.getPurchaseOrder().getCustomerSq());
        })
        .collect(Collectors.toList());
  }

  private PurchaseStatusDto.Res toRow(MaterialInbound m,
      Map<Long, PurchaseOrderDetail> detailById,
      Map<Long, Item> itemById,
      Map<Long, Customer> customerById) {
    PurchaseStatusDto.Res row = new PurchaseStatusDto.Res();
    row.setInboundSq(m.getInboundSq());
    row.setInboundDate(m.getInboundDate());
    row.setQty(m.getPassedQty() != null ? m.getPassedQty().intValue() : null);

    Item item = (m.getItemSq() == null) ? null : itemById.get(m.getItemSq());
    if (item != null) {
      row.setAccountType(item.getAccountType());
      row.setItemCode(item.getItemCode());
      row.setItemName(item.getItemName());
    }

    PurchaseOrderDetail detail = (m.getOrderDtlSq() == null) ? null : detailById.get(m.getOrderDtlSq());
    if (detail != null) {
      row.setUnitPrice(detail.getUnitPrice());

      double qty = m.getPassedQty() != null ? m.getPassedQty() : 0.0;
      BigDecimal price = detail.getUnitPrice() != null ? detail.getUnitPrice() : BigDecimal.ZERO;
      BigDecimal supply = BigDecimal.valueOf(qty).multiply(price).setScale(0, RoundingMode.CEILING);
      BigDecimal vat = supply.multiply(VAT_RATE).setScale(0, RoundingMode.CEILING);
      row.setSupplyAmt(supply);
      row.setVatAmt(vat);
      row.setTotalAmt(supply.add(vat));

      Customer cust = customerOf(detail, customerById);
      if (cust != null) {
        row.setCustomerCode(cust.getCustomerCode());
        row.setCustomerName(cust.getCustomerName());
      }
    }

    zeroFill(row);
    return row;
  }

  private static Customer customerOf(PurchaseOrderDetail detail, Map<Long, Customer> customerById) {
    if (detail.getPurchaseOrder() == null || detail.getPurchaseOrder().getCustomerSq() == null) {
      return null;
    }
    return customerById.get(detail.getPurchaseOrder().getCustomerSq());
  }

  private static void zeroFill(PurchaseStatusDto.Res row) {
    if (row.getUnitPrice() == null) row.setUnitPrice(BigDecimal.ZERO);
    if (row.getSupplyAmt() == null) row.setSupplyAmt(BigDecimal.ZERO);
    if (row.getVatAmt() == null) row.setVatAmt(BigDecimal.ZERO);
    if (row.getTotalAmt() == null) row.setTotalAmt(BigDecimal.ZERO);
  }

  // ── 일괄 조회 헬퍼 ─────────────────────────────────

  private Map<Long, PurchaseOrderDetail> detailsByOrderDtlSq(List<MaterialInbound> accepted) {
    List<Long> dtlSqs = accepted.stream()
        .map(MaterialInbound::getOrderDtlSq)
        .filter(Objects::nonNull)
        .distinct()
        .collect(Collectors.toList());
    return EntityIndex.byId(dtlSqs, orderDetailRepository::findAllById, PurchaseOrderDetail::getOrderDtlSq);
  }

  private Map<Long, Item> itemsOf(List<MaterialInbound> scoped) {
    List<Long> itemSqs = scoped.stream()
        .map(MaterialInbound::getItemSq)
        .filter(Objects::nonNull)
        .distinct()
        .collect(Collectors.toList());
    return EntityIndex.byId(itemSqs, itemRepository::findAllById, Item::getItemSq);
  }

  private Map<Long, Customer> customersOf(Map<Long, PurchaseOrderDetail> detailById) {
    List<Long> custSqs = detailById.values().stream()
        .map(d -> d.getPurchaseOrder() != null ? d.getPurchaseOrder().getCustomerSq() : null)
        .filter(Objects::nonNull)
        .distinct()
        .collect(Collectors.toList());
    return EntityIndex.byId(custSqs, customerRepository::findAllById, Customer::getCustomerSq);
  }

  private List<MaterialInbound> acceptedInbounds(LocalDate from, LocalDate to) {
    return inboundRepository.findBySearchCondition(floorDate(from), horizonDate(to), null).stream()
        .filter(this::isAccepted)
        .collect(Collectors.toList());
  }

  private boolean isAccepted(MaterialInbound m) {
    return "PASS".equals(m.getInspectStatus())
        && m.getPassedQty() != null && m.getPassedQty() > 0.0;
  }

  // ── 그룹 페이징 (SQL GROUP BY + LIMIT/OFFSET) ──────

  public PageResponse<PurchaseStatusDto.GroupRes> getPurchaseStatusListPaged(PurchaseStatusDto.SearchReq req) {
    int page = (req.getPage() != null && req.getPage() >= 0) ? req.getPage() : 0;
    int size = (req.getSize() != null && req.getSize() > 0) ? req.getSize() : 50;
    int offset = page * size;

    LocalDate from = floorDate(req.getDateFrom());
    LocalDate to = horizonDate(req.getDateTo());
    String customerCode = (req.getCustomerCode() != null) ? req.getCustomerCode() : "";

    String source = """
        FROM mes_material_inbound_tb m
        LEFT JOIN mes_purchase_order_dtl_tb pod ON pod.order_dtl_sq = m.order_dtl_sq
        LEFT JOIN mes_purchase_order_tb po ON po.order_sq = pod.order_sq
        LEFT JOIN mes_customer_tb c ON c.customer_sq = po.customer_sq
        LEFT JOIN mes_item_tb i ON i.item_sq = m.item_sq
        WHERE m.inspect_status = 'PASS' AND COALESCE(m.passed_qty, 0) > 0
          AND m.inbound_date >= :dateFrom
          AND m.inbound_date <= :dateTo
          AND (:customerCode = '' OR c.customer_cd = :customerCode)
        """;

    String pageSql = """
        SELECT accountType, customerCode, customerName, inboundDate,
               SUM(supply_row + vat_row) AS purchaseAmount
        FROM (
          SELECT
            i.account_type AS accountType,
            c.customer_cd AS customerCode,
            c.customer_nm AS customerName,
            m.inbound_date AS inboundDate,
            CEILING(COALESCE(m.passed_qty,0) * COALESCE(pod.unit_price, 0)) AS supply_row,
            CEILING(CEILING(COALESCE(m.passed_qty,0) * COALESCE(pod.unit_price, 0)) * 0.1) AS vat_row
          """ + source + """
        ) src
        GROUP BY accountType, customerCode, customerName, inboundDate
        ORDER BY """ + " " + groupOrderClause(req.getSortField(), req.getSortDirection()) + " "
        + "LIMIT :size OFFSET :offset";

    Query pageQuery = em.createNativeQuery(pageSql);
    pageQuery.setParameter("dateFrom", from);
    pageQuery.setParameter("dateTo", to);
    pageQuery.setParameter("customerCode", customerCode);
    pageQuery.setParameter("size", size);
    pageQuery.setParameter("offset", offset);

    @SuppressWarnings("unchecked")
    List<Object[]> records = pageQuery.getResultList();
    List<PurchaseStatusDto.GroupRes> groups = records.stream()
        .map(this::toGroup)
        .collect(Collectors.toList());

    String countSql = "SELECT COUNT(*) FROM ( SELECT 1 " + source
        + " GROUP BY i.account_type, c.customer_cd, c.customer_nm, m.inbound_date ) g";
    Query countQuery = em.createNativeQuery(countSql);
    countQuery.setParameter("dateFrom", from);
    countQuery.setParameter("dateTo", to);
    countQuery.setParameter("customerCode", customerCode);
    long total = ((Number) countQuery.getSingleResult()).longValue();

    return PageResponse.of(groups, page, size, total);
  }

  private PurchaseStatusDto.GroupRes toGroup(Object[] r) {
    PurchaseStatusDto.GroupRes g = new PurchaseStatusDto.GroupRes();
    g.setAccountType((String) r[0]);
    g.setCustomerCode((String) r[1]);
    g.setCustomerName((String) r[2]);
    g.setInboundDate(toLocalDate(r[3]));
    g.setPurchaseAmount(r[4] != null ? new BigDecimal(r[4].toString()) : BigDecimal.ZERO);
    return g;
  }

  private String groupOrderClause(String field, String direction) {
    String dir = "ASC".equalsIgnoreCase(direction) ? "ASC" : "DESC";
    String col = switch (field == null ? "" : field) {
      case "customerName" -> "customerName";
      case "customerCode" -> "customerCode";
      case "accountType" -> "accountType";
      case "purchaseAmount" -> "purchaseAmount";
      default -> "inboundDate";
    };
    return col + " IS NULL, " + col + " " + dir;
  }

  // ── 추이 / 옵션 ─────────────────────────────────────

  public List<PurchaseStatusDto.TrendRes> getPurchaseTrend(PurchaseStatusDto.SearchReq req) {
    List<PurchaseStatusDto.Res> rows = getPurchaseStatusList(req);

    String custCode = (req.getCustomerCode() != null && !req.getCustomerCode().isEmpty())
        ? req.getCustomerCode() : null;
    if (custCode != null) {
      rows = rows.stream()
          .filter(r -> custCode.equals(r.getCustomerCode()))
          .collect(Collectors.toList());
    }

    Map<String, BigDecimal> byMonth = new LinkedHashMap<>();
    for (PurchaseStatusDto.Res r : rows) {
      if (r.getInboundDate() == null) {
        continue;
      }
      String key = String.format("%04d-%02d", r.getInboundDate().getYear(), r.getInboundDate().getMonthValue());
      BigDecimal amt = r.getTotalAmt() != null ? r.getTotalAmt() : BigDecimal.ZERO;
      byMonth.merge(key, amt, BigDecimal::add);
    }

    return byMonth.entrySet().stream()
        .sorted(Map.Entry.comparingByKey())
        .map(e -> {
          PurchaseStatusDto.TrendRes t = new PurchaseStatusDto.TrendRes();
          t.setYearMonth(e.getKey());
          t.setAmount(e.getValue());
          return t;
        })
        .collect(Collectors.toList());
  }

  public List<PurchaseStatusDto.CustomerOption> getCustomerOptions(PurchaseStatusDto.SearchReq req) {
    return inboundRepository
        .findDistinctCustomerOptionsForPurchaseStatus(floorDate(req.getDateFrom()), horizonDate(req.getDateTo()))
        .stream()
        .map(v -> {
          PurchaseStatusDto.CustomerOption opt = new PurchaseStatusDto.CustomerOption();
          opt.setCustomerCode(v.getCustomerCode());
          opt.setCustomerName(v.getCustomerName());
          return opt;
        })
        .collect(Collectors.toList());
  }

  // ── 공통 유틸 ───────────────────────────────────────

  private static LocalDate floorDate(LocalDate d) {
    return d != null ? d : EPOCH_FLOOR;
  }

  private static LocalDate horizonDate(LocalDate d) {
    return d != null ? d : LocalDate.now().plusMonths(1);
  }

  // native query 의 date 컬럼은 Hibernate 버전에 따라 LocalDate / java.sql.Date 로 온다.
  private static LocalDate toLocalDate(Object o) {
    if (o == null) return null;
    if (o instanceof LocalDate ld) return ld;
    if (o instanceof java.sql.Date sd) return sd.toLocalDate();
    if (o instanceof java.util.Date ud) return new java.sql.Date(ud.getTime()).toLocalDate();
    return LocalDate.parse(o.toString());
  }
}
