package com.mes.domain.collection.service;

import com.mes.domain.collection.dto.CollectionDto;
import com.mes.domain.collection.entity.Collection;
import com.mes.domain.collection.entity.CollectionDetail;
import com.mes.domain.collection.repository.CollectionRepository;
import com.mes.domain.sales.entity.SalesOrderDetail;
import com.mes.domain.sales.repository.SalesOrderDetailRepository;
import com.mes.domain.shipment.entity.ShipmentOrderDetail;
import com.mes.domain.shipment.entity.ShipmentPlan;
import com.mes.domain.shipment.entity.ShipmentResult;
import com.mes.domain.shipment.repository.ShipmentOrderDetailRepository;
import com.mes.domain.shipment.repository.ShipmentPlanRepository;
import com.mes.domain.shipment.repository.ShipmentResultRepository;
import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;
import com.mes.global.support.EntityIndex;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CollectionService {

    private static final BigDecimal VAT_RATE = new BigDecimal("0.1");

    private final CollectionRepository collectionRepository;
    private final ShipmentResultRepository shipmentResultRepository;
    private final ShipmentOrderDetailRepository orderDetailRepository;
    private final ShipmentPlanRepository planRepository;
    private final SalesOrderDetailRepository salesOrderDetailRepository;

    // ──────────────────────────────────────────────
    //  조회
    // ──────────────────────────────────────────────

    public List<CollectionDto.ListRes> getList(CollectionDto.SearchReq req) {
        return collectionRepository.search(req.getDateFrom(), req.getDateTo())
                .stream()
                .map(this::toListRes)
                .toList();
    }

    public CollectionDto.Res getDetail(Long collectionSq) {
        return toRes(loadOrThrow(collectionSq));
    }

    // ──────────────────────────────────────────────
    //  저장 / 삭제
    // ──────────────────────────────────────────────

    @Transactional
    public Long save(CollectionDto.SaveReq req) {
        Collection target = (req.getCollectionSq() == null)
                ? newReceipt(req)
                : mergeReceipt(req);
        collectionRepository.save(target);
        return target.getReceiptSeq();
    }

    @Transactional
    public void delete(Long collectionSq) {
        collectionRepository.deleteById(collectionSq);
    }

    /** 신규 전표: 헤더 + 명세를 그대로 적재한다. */
    private Collection newReceipt(CollectionDto.SaveReq req) {
        Collection receipt = toEntity(req);
        bindLines(receipt, req);
        return receipt;
    }

    /** 기존 전표: 헤더만 갱신하고 명세는 전량 교체한다. */
    private Collection mergeReceipt(CollectionDto.SaveReq req) {
        Collection receipt = loadOrThrow(req.getCollectionSq());
        receipt.applyChanges(toEntity(req));
        receipt.clearLines();
        bindLines(receipt, req);
        return receipt;
    }

    private void bindLines(Collection receipt, CollectionDto.SaveReq req) {
        if (req.getDetails() == null) return;
        req.getDetails().forEach(d -> receipt.attachLine(toLineEntity(d)));
    }

    private Collection loadOrThrow(Long collectionSq) {
        return collectionRepository.findById(collectionSq)
                .orElseThrow(() -> new CustomException(
                        ErrorCode.COMMON_ENTITY_NOT_FOUND, "자금관리 데이터를 찾을 수 없습니다."));
    }

    // ──────────────────────────────────────────────
    //  거래처별 출하실적 후보 (수금 등록 모달)
    //  N+1 회피를 위해 단계별로 일괄 조회한 뒤 Map 으로 join 한다.
    // ──────────────────────────────────────────────

    public List<CollectionDto.ShipResultOption> getShipResultsByCustomerCode(String customerCode) {
        LocalDate from = LocalDate.of(2000, 1, 1);
        LocalDate to = LocalDate.now().plusMonths(1);

        List<ShipmentResult> results = shipmentResultRepository.findBySearchCondition(from, to);
        if (results.isEmpty()) {
            return List.of();
        }

        Map<Long, ShipmentOrderDetail> detailById = fetchOrderDetails(results);
        Map<Long, ShipmentPlan> planById = fetchPlans(detailById.values());
        Map<Long, SalesOrderDetail> orderById = fetchSalesOrders(planById.values());

        return results.stream()
                .map(r -> buildOption(r, customerCode, detailById, planById, orderById))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    private Map<Long, ShipmentOrderDetail> fetchOrderDetails(List<ShipmentResult> results) {
        List<Long> ids = results.stream()
                .map(ShipmentResult::getShipDtlSq)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        return EntityIndex.byId(ids, orderDetailRepository::findAllById, ShipmentOrderDetail::getShipDtlSq);
    }

    private Map<Long, ShipmentPlan> fetchPlans(java.util.Collection<ShipmentOrderDetail> details) {
        List<Long> ids = details.stream()
                .map(ShipmentOrderDetail::getPlanSq)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        return EntityIndex.byId(ids, planRepository::findAllById, ShipmentPlan::getPlanSq);
    }

    private Map<Long, SalesOrderDetail> fetchSalesOrders(java.util.Collection<ShipmentPlan> plans) {
        List<Long> ids = plans.stream()
                .map(ShipmentPlan::getSalesOrderDtlSq)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        return EntityIndex.byId(ids, salesOrderDetailRepository::findAllById, SalesOrderDetail::getOrderDtlSq);
    }

    /**
     * 출하실적 한 건을 모달 옵션으로 환산한다. 매칭되는 출하지시상세가
     * 없으면 null 을 돌려 후속 필터에서 제외한다.
     */
    private CollectionDto.ShipResultOption buildOption(
            ShipmentResult r,
            String customerCode,
            Map<Long, ShipmentOrderDetail> detailById,
            Map<Long, ShipmentPlan> planById,
            Map<Long, SalesOrderDetail> orderById) {

        ShipmentOrderDetail detail = (r.getShipDtlSq() == null) ? null : detailById.get(r.getShipDtlSq());
        if (detail == null || !customerCode.equals(detail.getCustomerCode())) {
            return null;
        }

        CollectionDto.ShipResultOption opt = new CollectionDto.ShipResultOption();
        opt.setShipResultSq(r.getShipResultSq());
        opt.setLotNo(r.getLotNo());
        opt.setShipDate(r.getShipDate());
        opt.setItemCode(detail.getItemCode());
        opt.setItemName(detail.getItemName());

        BigDecimal qty = toQty(r);
        opt.setShippedQty(r.getShippedQty() != null ? qty : null);

        SalesOrderDetail order = resolveOrder(detail, planById, orderById);
        BigDecimal unitPrice = (order != null && order.getUnitPrice() != null)
                ? order.getUnitPrice() : BigDecimal.ZERO;
        opt.setUnitPrice(unitPrice);
        opt.setSalesAmt(order != null ? grossOf(qty, unitPrice) : BigDecimal.ZERO);
        return opt;
    }

    private SalesOrderDetail resolveOrder(ShipmentOrderDetail detail,
                                          Map<Long, ShipmentPlan> planById,
                                          Map<Long, SalesOrderDetail> orderById) {
        if (detail.getPlanSq() == null) return null;
        ShipmentPlan plan = planById.get(detail.getPlanSq());
        if (plan == null || plan.getSalesOrderDtlSq() == null) return null;
        return orderById.get(plan.getSalesOrderDtlSq());
    }

    private static BigDecimal toQty(ShipmentResult r) {
        return r.getShippedQty() != null ? BigDecimal.valueOf(r.getShippedQty()) : BigDecimal.ZERO;
    }

    /** 공급가 = 수량×단가(올림), 부가세 10% 가산한 합계를 매출액으로 본다. */
    private static BigDecimal grossOf(BigDecimal qty, BigDecimal unitPrice) {
        BigDecimal supply = qty.multiply(unitPrice).setScale(0, RoundingMode.CEILING);
        BigDecimal vat = supply.multiply(VAT_RATE).setScale(0, RoundingMode.CEILING);
        return supply.add(vat);
    }

    // ──────────────────────────────────────────────
    //  엔티티 ↔ DTO 매핑
    // ──────────────────────────────────────────────

    private Collection toEntity(CollectionDto.SaveReq req) {
        return Collection.builder()
                .partnerSeq(req.getCustomerSq())
                .partnerCode(req.getCustomerCode())
                .partnerName(req.getCustomerName())
                .receiptDate(req.getCollectionDate())
                .settlementTerms(req.getPaymentTerms())
                .supplyPrice(req.getSupplyAmt())
                .taxAmount(req.getVatAmt())
                .grandTotal(req.getTotalAmt())
                .receivedTotal(req.getTotalCollectionAmt())
                .outstanding(req.getBalance())
                .createdBy(req.getRegistrant())
                .note(req.getRemark())
                .build();
    }

    private CollectionDetail toLineEntity(CollectionDto.DetailData d) {
        return CollectionDetail.builder()
                .shipmentResultSeq(d.getShipResultSq())
                .lotNo(d.getLotNo())
                .shipmentDate(d.getShipDate())
                .salesValue(d.getSalesAmt())
                .salesCumulative(d.getSalesAccum())
                .receivedValue(d.getCollectionAmt())
                .receivedCumulative(d.getCollectionAccum())
                .outstanding(d.getBalance())
                .note(d.getRemark())
                .build();
    }

    private CollectionDto.ListRes toListRes(Collection c) {
        CollectionDto.ListRes res = new CollectionDto.ListRes();
        res.setCollectionSq(c.getReceiptSeq());
        res.setCollectionDate(c.getReceiptDate());
        res.setPaymentTerms(c.getSettlementTerms());
        res.setCustomerCode(c.getPartnerCode());
        res.setCustomerName(c.getPartnerName());
        res.setSupplyAmt(c.getSupplyPrice());
        res.setVatAmt(c.getTaxAmount());
        res.setTotalAmt(c.getGrandTotal());
        res.setTotalCollectionAmt(c.getReceivedTotal());
        res.setBalance(c.getOutstanding());
        res.setRegistrant(c.getCreatedBy());
        res.setRemark(c.getNote());
        return res;
    }

    private CollectionDto.Res toRes(Collection c) {
        CollectionDto.Res res = new CollectionDto.Res();
        res.setCollectionSq(c.getReceiptSeq());
        res.setCustomerSq(c.getPartnerSeq());
        res.setCustomerCode(c.getPartnerCode());
        res.setCustomerName(c.getPartnerName());
        res.setCollectionDate(c.getReceiptDate());
        res.setPaymentTerms(c.getSettlementTerms());
        res.setSupplyAmt(c.getSupplyPrice());
        res.setVatAmt(c.getTaxAmount());
        res.setTotalAmt(c.getGrandTotal());
        res.setTotalCollectionAmt(c.getReceivedTotal());
        res.setBalance(c.getOutstanding());
        res.setRegistrant(c.getCreatedBy());
        res.setRemark(c.getNote());
        res.setDetails(c.getLines().stream().map(this::toLineRes).collect(Collectors.toList()));
        return res;
    }

    private CollectionDto.DetailRes toLineRes(CollectionDetail line) {
        CollectionDto.DetailRes dr = new CollectionDto.DetailRes();
        dr.setCollectionDtlSq(line.getLineSeq());
        dr.setShipResultSq(line.getShipmentResultSeq());
        dr.setLotNo(line.getLotNo());
        dr.setShipDate(line.getShipmentDate());
        dr.setSalesAmt(line.getSalesValue());
        dr.setSalesAccum(line.getSalesCumulative());
        dr.setCollectionAmt(line.getReceivedValue());
        dr.setCollectionAccum(line.getReceivedCumulative());
        dr.setBalance(line.getOutstanding());
        dr.setRemark(line.getNote());
        return dr;
    }
}
