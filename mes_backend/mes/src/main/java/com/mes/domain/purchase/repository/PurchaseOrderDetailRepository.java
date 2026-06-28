package com.mes.domain.purchase.repository;

import com.mes.domain.purchase.entity.PurchaseOrderDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

@Repository
public interface PurchaseOrderDetailRepository extends JpaRepository<PurchaseOrderDetail, Long> {

  /** 한 발주(Master)에 매달린 상세 품목 전체. */
  List<PurchaseOrderDetail> findByPurchaseOrder_OrderSq(Long orderSq);

  /**
   * 대시보드 집계용: 입고요청일(in_req_date)이 구간에 들고 지정 자재 품목에 해당하는
   * 발주상세의 발주수량 합. 데이터가 없으면 0.
   */
  @Query("""
      SELECT COALESCE(SUM(d.orderQty), 0)
      FROM PurchaseOrderDetail d
      WHERE d.itemSq IN :materialItemSqs
        AND d.purchaseOrder.inReqDate BETWEEN :dateFrom AND :dateTo
      """)
  Long sumOrderQtyByInReqDate(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo,
      @Param("materialItemSqs") Collection<Long> materialItemSqs);
}
