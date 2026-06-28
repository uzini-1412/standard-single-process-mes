package com.mes.domain.sales.service;

import com.mes.domain.customer.entity.Customer;
import com.mes.domain.customer.repository.CustomerRepository;
import com.mes.domain.sales.dto.SalesStatusDto;
import com.mes.domain.sales.entity.SalesOrderDetail;
import com.mes.domain.sales.repository.SalesOrderDetailRepository;
import com.mes.domain.shipment.entity.ShipmentOrderDetail;
import com.mes.domain.shipment.entity.ShipmentPlan;
import com.mes.domain.shipment.entity.ShipmentResult;
import com.mes.domain.shipment.repository.ShipmentOrderDetailRepository;
import com.mes.domain.shipment.repository.ShipmentPlanRepository;
import com.mes.domain.shipment.repository.ShipmentResultRepository;
import com.mes.domain.unitprice.entity.PriceType;
import com.mes.domain.unitprice.entity.UnitPrice;
import com.mes.domain.unitprice.repository.UnitPriceRepository;
import com.mes.global.response.PageResponse;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SalesStatusService {

    private static final LocalDate FLOOR_DATE = LocalDate.of(2000, 1, 1);
    private static final BigDecimal VAT_RATE = new BigDecimal("0.1");

    private final ShipmentResultRepository resultRepository;
    private final ShipmentOrderDetailRepository orderDetailRepository;
    private final ShipmentPlanRepository planRepository;
    private final SalesOrderDetailRepository salesOrderDetailRepository;
    private final CustomerRepository customerRepository;
    private final UnitPriceRepository unitPriceRepository;

    @PersistenceContext
    private EntityManager em;

    // ========================================================
    //  공개 API
    // ========================================================

    /** 거래처 옵션이 있으면 메모리 필터한 뒤 매출 행으로 변환한다. */
    public List<SalesStatusDto.Res> getSalesStatusList(SalesStatusDto.SearchReq req) {
        List<ShipmentResult> results = resultRepository.findBySearchCondition(
                orDefaultFrom(req.getDateFrom()), orDefaultTo(req.getDateTo()));

        Long customerSq = req.getCustomerSq();
        if (customerSq != null) {
            List<ShipmentResult> filtered = new ArrayList<>(results.size());
            for (ShipmentResult r : results) {
                if (customerSq.equals(r.getCustomerSq())) {
                    filtered.add(r);
                }
            }
            results = filtered;
        }
        return buildResList(results);
    }

    /** 그룹키(customer_sq + ship_date + lot_no) 단위 상세 — 팝업. */
    public List<SalesStatusDto.Res> getSalesStatusItemsByGroup(SalesStatusDto.SearchReq req) {
        String groupCode = req.getGroupCustomerCode();
        LocalDate groupDate = req.getGroupShipDate();
        String groupLot = req.getGroupLotNo();
        boolean missingKey = groupCode == null || groupCode.isEmpty() || groupDate == null || groupLot == null;
        if (missingKey) {
            return List.of();
        }
        Long customerSq = customerRepository.findByCustomerCode(groupCode)
                .map(Customer::getCustomerSq)
                .orElse(null);
        if (customerSq == null) {
            return List.of();
        }
        return buildResList(
                resultRepository.findByCustomerSqAndShipDateAndLotNo(customerSq, groupDate, groupLot));
    }

    /** 검색 기간 내 출하 실적이 있는 거래처만 distinct 로 반환 (가벼운 단일 쿼리). */
    public List<SalesStatusDto.CustomerOption> getCustomerOptions(SalesStatusDto.SearchReq req) {
        var distinctCustomers = resultRepository.findDistinctCustomerOptionsForSalesStatus(
                orDefaultFrom(req.getDateFrom()), orDefaultTo(req.getDateTo()));

        List<SalesStatusDto.CustomerOption> options = new ArrayList<>(distinctCustomers.size());
        for (var v : distinctCustomers) {
            SalesStatusDto.CustomerOption opt = new SalesStatusDto.CustomerOption();
            opt.setCustomerCode(v.getCustomerCode());
            opt.setCustomerName(v.getCustomerName());
            options.add(opt);
        }
        return options;
    }

    /** 월별 매출 합계. customerCode 가 주어지면 해당 거래처만, 아니면 전체 합계. */
    public List<SalesStatusDto.TrendRes> getSalesTrend(SalesStatusDto.SearchReq req) {
        List<SalesStatusDto.Res> rows = getSalesStatusList(req);
        String custCode = trimToNull(req.getCustomerCode());

        Map<String, BigDecimal> byMonth = new LinkedHashMap<>();
        for (SalesStatusDto.Res r : rows) {
            if (r.getShipDate() == null) {
                continue;
            }
            // customerCode 가 지정된 경우 해당 거래처 행만 합산한다.
            if (custCode != null && !custCode.equals(r.getCustomerCode())) {
                continue;
            }
            BigDecimal amount = r.getTotalAmt() != null ? r.getTotalAmt() : BigDecimal.ZERO;
            byMonth.merge(monthKey(r.getShipDate()), amount, BigDecimal::add);
        }

        List<SalesStatusDto.TrendRes> trend = new ArrayList<>(byMonth.size());
        byMonth.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .forEach(e -> trend.add(toTrendRes(e.getKey(), e.getValue())));
        return trend;
    }

    private static String monthKey(LocalDate date) {
        return String.format("%04d-%02d", date.getYear(), date.getMonthValue());
    }

    private static SalesStatusDto.TrendRes toTrendRes(String yearMonth, BigDecimal amount) {
        SalesStatusDto.TrendRes t = new SalesStatusDto.TrendRes();
        t.setYearMonth(yearMonth);
        t.setAmount(amount);
        return t;
    }

    /*
     * (customerCode, shipDate, lotNo) 그룹 단위 페이지 조회 — 화면 상단 표.
     * GROUP BY + LIMIT/OFFSET 으로 페이지 분량만 적재해 대량 풀로드를 피한다.
     * 단가는 SalesOrderDetail.unit_price 를 우선하고, 없으면
     * (customer+item+width+length) 조합의 최신 SALE 활성 단가로 대체한다.
     * 대체 단가 subquery 는 ROW_NUMBER 윈도우로 그룹당 1건만 고른다.
     */
    public PageResponse<SalesStatusDto.GroupRes> getSalesStatusListPaged(SalesStatusDto.SearchReq req) {
        int page = (req.getPage() != null && req.getPage() >= 0) ? req.getPage() : 0;
        int size = (req.getSize() != null && req.getSize() > 0) ? req.getSize() : 50;
        int offset = page * size;

        LocalDate dateFrom = orDefaultFrom(req.getDateFrom());
        LocalDate dateTo = orDefaultTo(req.getDateTo());
        String customerCode = req.getCustomerCode() != null && !req.getCustomerCode().isEmpty()
                ? req.getCustomerCode() : "";
        String orderBy = resolveSalesGroupOrderBy(req.getSortField(), req.getSortDirection());

        String baseFrom =
            "FROM mes_shipment_result_tb r " +
            "LEFT JOIN mes_customer_tb c ON c.customer_sq = r.customer_sq " +
            "LEFT JOIN mes_shipment_order_dtl_tb sod ON sod.ship_dtl_sq = r.ship_dtl_sq " +
            "LEFT JOIN mes_shipment_plan_tb sp ON sp.plan_sq = sod.plan_sq " +
            "LEFT JOIN mes_sales_order_dtl_tb ssod ON ssod.order_dtl_sq = sp.sales_order_dtl_sq " +
            "LEFT JOIN ( " +
            "  SELECT customer_sq, item_sq, width, length, unit_price FROM ( " +
            "    SELECT customer_sq, item_sq, width, length, unit_price, " +
            "      ROW_NUMBER() OVER (" +
            "        PARTITION BY customer_sq, item_sq, width, length " +
            "        ORDER BY start_date DESC, unit_price_sq DESC" +
            "      ) AS rn " +
            "    FROM mes_unit_price_tb " +
            "    WHERE price_type = 'SALE' AND use_yn = TRUE " +
            "  ) ranked WHERE rn = 1 " +
            ") fb ON fb.customer_sq = r.customer_sq " +
            "  AND fb.item_sq = r.item_sq " +
            "  AND fb.width <=> sod.width " +
            "  AND fb.length <=> sod.length " +
            "WHERE r.ship_date >= :dateFrom " +
            "  AND r.ship_date <= :dateTo " +
            "  AND (:customerCode = '' OR c.customer_cd = :customerCode) ";

        String pageSql =
            "SELECT customerCode, customerName, shipDate, lotNo, MAX(shipOrderSq) AS shipOrderSq, " +
            "       SUM(supply_row + vat_row) AS salesAmount " +
            "FROM ( " +
            "  SELECT " +
            "    c.customer_cd AS customerCode, " +
            "    c.customer_nm AS customerName, " +
            "    r.ship_date AS shipDate, " +
            "    r.lot_no AS lotNo, " +
            "    sod.ship_order_sq AS shipOrderSq, " +
            "    CEILING(COALESCE(r.shipped_qty,0) * COALESCE(ssod.unit_price, fb.unit_price, 0)) AS supply_row, " +
            "    CEILING(CEILING(COALESCE(r.shipped_qty,0) * COALESCE(ssod.unit_price, fb.unit_price, 0)) * 0.1) AS vat_row " +
            "  " + baseFrom +
            ") src " +
            "GROUP BY customerCode, customerName, shipDate, lotNo " +
            "ORDER BY " + orderBy + " " +
            "LIMIT :size OFFSET :offset";

        Query pageQuery = em.createNativeQuery(pageSql);
        bindCommon(pageQuery, dateFrom, dateTo, customerCode);
        pageQuery.setParameter("size", size);
        pageQuery.setParameter("offset", offset);

        @SuppressWarnings("unchecked")
        List<Object[]> rows = pageQuery.getResultList();
        List<SalesStatusDto.GroupRes> groups = rows.stream()
                .map(this::toGroupRes)
                .collect(Collectors.toList());

        String countSql =
            "SELECT COUNT(*) FROM ( " +
            "  SELECT 1 " + baseFrom +
            "  GROUP BY c.customer_cd, c.customer_nm, r.ship_date, r.lot_no " +
            ") g";
        Query countQuery = em.createNativeQuery(countSql);
        bindCommon(countQuery, dateFrom, dateTo, customerCode);
        long total = ((Number) countQuery.getSingleResult()).longValue();

        return PageResponse.of(groups, page, size, total);
    }

    // ========================================================
    //  내부: 변환
    // ========================================================

    /*
     * ShipmentResult 컬렉션을 매출현황 Res 행으로 변환.
     * 4단 FK 체인(주문상세→계획→수주상세)과 거래처 마스터, SALE 단가 fallback 캐시를
     * 모두 미리 일괄 조회하여 N+1 을 제거한다.
     */
    private List<SalesStatusDto.Res> buildResList(List<ShipmentResult> results) {
        if (results.isEmpty()) {
            return List.of();
        }

        Map<Long, ShipmentOrderDetail> dtlMap = orderDetailRepository.findAllById(
                        distinct(results, ShipmentResult::getShipDtlSq)).stream()
                .collect(Collectors.toMap(ShipmentOrderDetail::getShipDtlSq, Function.identity()));

        Map<Long, ShipmentPlan> planMap = planRepository.findAllById(
                        distinct(dtlMap.values(), ShipmentOrderDetail::getPlanSq)).stream()
                .collect(Collectors.toMap(ShipmentPlan::getPlanSq, Function.identity()));

        Map<Long, SalesOrderDetail> sodMap = salesOrderDetailRepository.findAllById(
                        distinct(planMap.values(), ShipmentPlan::getSalesOrderDtlSq)).stream()
                .collect(Collectors.toMap(SalesOrderDetail::getOrderDtlSq, Function.identity()));

        Map<Long, Customer> custMap = customerRepository.findAllById(
                        distinct(results, ShipmentResult::getCustomerSq)).stream()
                .collect(Collectors.toMap(Customer::getCustomerSq, Function.identity()));

        Map<String, List<UnitPrice>> priceCache = buildPriceCache(results, PriceType.SALE);

        return results.stream()
                .map(r -> toRes(r, dtlMap, planMap, sodMap, custMap, priceCache))
                .collect(Collectors.toList());
    }

    private SalesStatusDto.Res toRes(ShipmentResult r,
            Map<Long, ShipmentOrderDetail> dtlMap,
            Map<Long, ShipmentPlan> planMap,
            Map<Long, SalesOrderDetail> sodMap,
            Map<Long, Customer> custMap,
            Map<String, List<UnitPrice>> priceCache) {
        SalesStatusDto.Res res = new SalesStatusDto.Res();
        res.setShipResultSq(r.getShipResultSq());
        res.setLotNo(r.getLotNo());
        res.setShipDate(r.getShipDate());
        res.setQty(r.getShippedQty());
        res.setRemark(r.getRemark());

        ShipmentOrderDetail d = r.getShipDtlSq() != null ? dtlMap.get(r.getShipDtlSq()) : null;
        if (d != null) {
            res.setCustomerCode(d.getCustomerCode());
            res.setCustomerName(d.getCustomerName());
            res.setItemCode(d.getItemCode());
            res.setItemName(d.getItemName());
            if (d.getShipmentOrder() != null) {
                res.setShipOrderSq(d.getShipmentOrder().getShipOrderSq());
            }
        }

        // 주문상세에 거래처 정보가 비어 있으면 거래처 마스터로 채운다
        if (res.getCustomerCode() == null && r.getCustomerSq() != null) {
            Customer c = custMap.get(r.getCustomerSq());
            if (c != null) {
                res.setCustomerCode(c.getCustomerCode());
                res.setCustomerName(c.getCustomerName());
            }
        }

        BigDecimal price = chainPrice(d, planMap, sodMap);
        if (price == null) {
            Double width = d != null ? d.getWidth() : null;
            Double length = d != null ? d.getLength() : null;
            price = resolveFallbackPrice(r.getCustomerSq(), r.getItemSq(), width, length,
                    r.getShipDate(), priceCache);
        }
        applyAmounts(res, r, price);

        return res;
    }

    /** 단가가 있으면 공급/부가세/합계를 채우고, 끝으로 남은 null 금액은 0 으로 보정한다. */
    private void applyAmounts(SalesStatusDto.Res res, ShipmentResult r, BigDecimal price) {
        if (price != null) {
            res.setUnitPrice(price);
            BigDecimal qty = r.getShippedQty() != null
                    ? BigDecimal.valueOf(r.getShippedQty()) : BigDecimal.ZERO;
            BigDecimal supply = qty.multiply(price).setScale(0, RoundingMode.CEILING);
            BigDecimal vat = supply.multiply(VAT_RATE).setScale(0, RoundingMode.CEILING);
            res.setSupplyAmt(supply);
            res.setVatAmt(vat);
            res.setTotalAmt(supply.add(vat));
        }
        if (res.getUnitPrice() == null) res.setUnitPrice(BigDecimal.ZERO);
        if (res.getSupplyAmt() == null) res.setSupplyAmt(BigDecimal.ZERO);
        if (res.getVatAmt() == null) res.setVatAmt(BigDecimal.ZERO);
        if (res.getTotalAmt() == null) res.setTotalAmt(BigDecimal.ZERO);
    }

    private SalesStatusDto.GroupRes toGroupRes(Object[] row) {
        SalesStatusDto.GroupRes g = new SalesStatusDto.GroupRes();
        g.setCustomerCode((String) row[0]);
        g.setCustomerName((String) row[1]);
        g.setShipDate(toLocalDate(row[2]));
        g.setLotNo((String) row[3]);
        g.setShipOrderSq(row[4] != null ? ((Number) row[4]).longValue() : null);
        g.setSalesAmount(row[5] != null ? new BigDecimal(row[5].toString()) : BigDecimal.ZERO);
        return g;
    }

    // ========================================================
    //  내부: 단가 결정
    // ========================================================

    /** 1순위: 4단 체인의 SalesOrderDetail.unitPrice( > 0 ). 못 찾으면 null. */
    private BigDecimal chainPrice(ShipmentOrderDetail d,
            Map<Long, ShipmentPlan> planMap, Map<Long, SalesOrderDetail> sodMap) {
        if (d == null || d.getPlanSq() == null) {
            return null;
        }
        ShipmentPlan plan = planMap.get(d.getPlanSq());
        if (plan == null || plan.getSalesOrderDtlSq() == null) {
            return null;
        }
        SalesOrderDetail sod = sodMap.get(plan.getSalesOrderDtlSq());
        boolean hasPositivePrice = sod != null && sod.getUnitPrice() != null
                && sod.getUnitPrice().compareTo(BigDecimal.ZERO) > 0;
        return hasPositivePrice ? sod.getUnitPrice() : null;
    }

    /** (customerSq|itemSq) → SALE 활성 단가 후보 묶음. */
    private Map<String, List<UnitPrice>> buildPriceCache(List<ShipmentResult> results, PriceType type) {
        List<Long> customerKeys = distinct(results, ShipmentResult::getCustomerSq);
        List<Long> itemKeys = distinct(results, ShipmentResult::getItemSq);
        if (customerKeys.isEmpty() || itemKeys.isEmpty()) {
            return Map.of();
        }
        return unitPriceRepository
                .findActiveByCustomerSqsAndItemSqsAndType(customerKeys, itemKeys, type)
                .stream()
                .collect(Collectors.groupingBy(SalesStatusService::priceCacheKey));
    }

    private static String priceCacheKey(UnitPrice u) {
        return u.getCustomerSq() + "|" + u.getItemSq();
    }

    /*
     * width/length 가 일치(NULL=NULL 허용)하는 후보 중에서
     * ship_date 시점에 유효한 단가를 우선 채택하고, 없으면 start_date 최신 1건을 쓴다.
     */
    private BigDecimal resolveFallbackPrice(Long customerSq, Long itemSq, Double width, Double length,
                                            LocalDate shipDate, Map<String, List<UnitPrice>> cache) {
        if (customerSq == null || itemSq == null) {
            return null;
        }
        List<UnitPrice> candidates = cache.getOrDefault(customerSq + "|" + itemSq, List.of());

        List<UnitPrice> bySpec = new ArrayList<>();
        for (UnitPrice u : candidates) {
            if (Objects.equals(u.getWidth(), width) && Objects.equals(u.getLength(), length)) {
                bySpec.add(u);
            }
        }
        if (bySpec.isEmpty()) {
            return null;
        }

        // 1순위: 출하일 기준 유효기간 안에 들어오는 단가 중 가장 최근 적용분.
        UnitPrice picked = null;
        if (shipDate != null) {
            picked = latestStartDate(bySpec.stream().filter(u -> coversDate(u, shipDate)));
        }
        // 2순위: 유효기간 매칭이 없으면 start_date 가 있는 후보 중 최신분.
        if (picked == null) {
            picked = latestStartDate(bySpec.stream().filter(u -> u.getStartDate() != null));
        }
        return picked != null ? picked.getPrice() : null;
    }

    /** start_date <= shipDate <= end_date(없으면 무기한) 인지 여부. */
    private static boolean coversDate(UnitPrice u, LocalDate shipDate) {
        if (u.getStartDate() == null || u.getStartDate().isAfter(shipDate)) {
            return false;
        }
        return u.getEndDate() == null || !u.getEndDate().isBefore(shipDate);
    }

    private static UnitPrice latestStartDate(java.util.stream.Stream<UnitPrice> stream) {
        return stream.max(Comparator.comparing(UnitPrice::getStartDate)).orElse(null);
    }

    // ========================================================
    //  내부: SQL 정렬 / 파라미터 바인딩
    // ========================================================

    /** 그룹 페이지 정렬용 컬럼 화이트리스트. NULL 은 항상 마지막. */
    private String resolveSalesGroupOrderBy(String field, String direction) {
        String dir = "ASC".equalsIgnoreCase(direction) ? "ASC" : "DESC";
        String col = mapGroupSortColumn(field);
        return col + " IS NULL, " + col + " " + dir;
    }

    private String mapGroupSortColumn(String field) {
        if (field == null || field.isEmpty()) {
            return "shipDate";
        }
        switch (field) {
            case "customerName": return "customerName";
            case "customerCode": return "customerCode";
            case "lotNo":        return "lotNo";
            case "salesAmount":  return "salesAmount";
            case "shipDate":
            default:             return "shipDate";
        }
    }

    private void bindCommon(Query query, LocalDate dateFrom, LocalDate dateTo, String customerCode) {
        query.setParameter("dateFrom", dateFrom);
        query.setParameter("dateTo", dateTo);
        query.setParameter("customerCode", customerCode);
    }

    // ========================================================
    //  내부: 공통 유틸
    // ========================================================

    private LocalDate orDefaultFrom(LocalDate v) {
        return v != null ? v : FLOOR_DATE;
    }

    private LocalDate orDefaultTo(LocalDate v) {
        return v != null ? v : LocalDate.now().plusMonths(1);
    }

    private static String trimToNull(String s) {
        return (s != null && !s.isEmpty()) ? s : null;
    }

    private static <T> List<Long> distinct(Iterable<T> src, Function<T, Long> extractor) {
        Set<Long> seen = new LinkedHashSet<>();
        for (T item : src) {
            Long id = extractor.apply(item);
            if (id != null) {
                seen.add(id);
            }
        }
        return new ArrayList<>(seen);
    }

    /**
     * 네이티브 쿼리가 돌려준 날짜 값을 LocalDate 로 정규화한다.
     * Hibernate 버전·드라이버에 따라 LocalDate / java.sql.Date / java.util.Date /
     * 문자열 등으로 제각각 올 수 있어 타입별로 분기한다.
     */
    private static LocalDate toLocalDate(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof LocalDate localDate) {
            return localDate;
        }
        if (value instanceof java.sql.Date sqlDate) {
            return sqlDate.toLocalDate();
        }
        if (value instanceof java.util.Date utilDate) {
            return new java.sql.Date(utilDate.getTime()).toLocalDate();
        }
        return LocalDate.parse(value.toString());
    }
}
