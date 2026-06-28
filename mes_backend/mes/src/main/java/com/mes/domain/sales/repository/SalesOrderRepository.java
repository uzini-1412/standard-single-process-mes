package com.mes.domain.sales.repository;

import com.mes.domain.sales.entity.SalesOrder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface SalesOrderRepository extends JpaRepository<SalesOrder, Long> {

  /*
   * 수주관리 / 생산소요량산출 화면의 페이지 단위 조회.
   * 동일 WHERE 절을 본문/카운트 양쪽에 적용한다.
   */
  @Query(value = "SELECT o FROM SalesOrder o " +
      "WHERE (:customerSq IS NULL OR o.customerSq = :customerSq) " +
      "AND (:dateFrom IS NULL OR o.orderDate >= :dateFrom) " +
      "AND (:dateTo IS NULL OR o.orderDate <= :dateTo) " +
      "AND (:keyword IS NULL OR o.orderNo LIKE %:keyword%)",
      countQuery = "SELECT COUNT(o) FROM SalesOrder o " +
          "WHERE (:customerSq IS NULL OR o.customerSq = :customerSq) " +
          "AND (:dateFrom IS NULL OR o.orderDate >= :dateFrom) " +
          "AND (:dateTo IS NULL OR o.orderDate <= :dateTo) " +
          "AND (:keyword IS NULL OR o.orderNo LIKE %:keyword%)")
  Page<SalesOrder> findBySearchConditionPaged(
      @Param("customerSq") Long customerSq,
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo,
      @Param("keyword") String keyword,
      Pageable pageable);

  /*
   * 비페이징 목록. orderDetails 를 JOIN FETCH 하여 N+1 을 회피하므로
   * 컬렉션 중복 행 제거를 위해 DISTINCT 가 반드시 필요하다.
   */
  @Query("SELECT DISTINCT o FROM SalesOrder o " +
      "LEFT JOIN FETCH o.orderDetails " +
      "WHERE (:customerSq IS NULL OR o.customerSq = :customerSq) " +
      "AND (:dateFrom IS NULL OR o.orderDate >= :dateFrom) " +
      "AND (:dateTo IS NULL OR o.orderDate <= :dateTo) " +
      "AND (:keyword IS NULL OR o.orderNo LIKE %:keyword%) " +
      "ORDER BY o.orderNo DESC")
  List<SalesOrder> findBySearchCondition(
      @Param("customerSq") Long customerSq,
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo,
      @Param("keyword") String keyword);

  /*
   * 채번용. prefix(예: "SO-202602-")로 시작하는 수주번호 중 최댓값을 반환.
   */
  @Query("SELECT MAX(o.orderNo) FROM SalesOrder o WHERE o.orderNo LIKE :prefix%")
  String findMaxOrderNo(@Param("prefix") String prefix);
}
