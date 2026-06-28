package com.mes.domain.purchase.repository;

import com.mes.domain.purchase.entity.PurchaseOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {

  /**
   * 검색조건(거래처/발주일 구간/발주번호 키워드)에 맞는 발주를 조회한다.
   * 상세(orderDetails)를 LEFT JOIN FETCH 로 함께 적재해 N+1 을 막고,
   * 1:N 조인으로 생기는 마스터 중복은 DISTINCT 로 제거한다.
   */
  @Query("""
      SELECT DISTINCT po FROM PurchaseOrder po
      LEFT JOIN FETCH po.orderDetails
      WHERE (:keyword IS NULL OR po.orderNo LIKE %:keyword%)
        AND (:customerSq IS NULL OR po.customerSq = :customerSq)
        AND (:dateFrom IS NULL OR po.orderDate >= :dateFrom)
        AND (:dateTo IS NULL OR po.orderDate <= :dateTo)
      ORDER BY po.orderNo DESC
      """)
  List<PurchaseOrder> findBySearchCondition(
      @Param("customerSq") Long customerSq,
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo,
      @Param("keyword") String keyword);

  /** 채번 보조: 주어진 접두어(PO-yyyyMM-)로 시작하는 발주번호 중 최댓값. */
  @Query("SELECT MAX(po.orderNo) FROM PurchaseOrder po WHERE po.orderNo LIKE :prefix%")
  String findMaxOrderNo(@Param("prefix") String prefix);
}
