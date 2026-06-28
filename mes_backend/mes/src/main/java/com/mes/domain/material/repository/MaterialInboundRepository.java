package com.mes.domain.material.repository;

import com.mes.domain.material.entity.MaterialInbound;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

/**
 * 가입고 저장소. 가입고관리/입고현황/자재재고현황·LOT추적·대시보드·거래처원장이
 * 같은 테이블을 공유하므로 화면별 조회·채번·집계 질의를 한곳에 모았다.
 */
@Repository
public interface MaterialInboundRepository extends JpaRepository<MaterialInbound, Long> {

  // ---------------------------------------------------------------
  // 파생 쿼리 (메서드명 = 조건)
  // ---------------------------------------------------------------

  /** 동일 품목의 가입고 — LOT 추적에서 같은 품목으로 좁힐 때. */
  List<MaterialInbound> findByItemSq(Long itemSq);

  /** 특정 입고일 단건 — 거래처원장 상세팝업이 풀로드를 피하려고 일자로 끊어 부른다. */
  List<MaterialInbound> findByInboundDate(LocalDate inboundDate);

  /** 발주 삭제 가드 — 주어진 발주상세 PK들 중 가입고가 하나라도 걸려 있으면 true. */
  boolean existsByOrderDtlSqIn(Collection<Long> orderDtlSqs);

  // ---------------------------------------------------------------
  // 목록 조회 (가입고현황 / LOT추적 / 재고이력)
  // ---------------------------------------------------------------

  /** 가입고현황: 기간 + LOT번호 부분일치, 최신 입고 우선. */
  @Query("""
      SELECT ib FROM MaterialInbound ib
      WHERE (:dateFrom IS NULL OR ib.inboundDate >= :dateFrom)
        AND (:dateTo   IS NULL OR ib.inboundDate <= :dateTo)
        AND (:keyword  IS NULL OR LOWER(ib.lotNo) LIKE LOWER(CONCAT('%', :keyword, '%')))
      ORDER BY ib.inboundDate DESC, ib.inboundSq DESC
      """)
  List<MaterialInbound> findBySearchCondition(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo,
      @Param("keyword") String keyword);

  /** 위 조회의 페이징판(LOT 추적). 검색어는 lotNo·purchaseLotNo 양쪽 부분일치. */
  @Query("""
      SELECT ib FROM MaterialInbound ib
      WHERE (:dateFrom IS NULL OR ib.inboundDate >= :dateFrom)
        AND (:dateTo   IS NULL OR ib.inboundDate <= :dateTo)
        AND (
              :keyword IS NULL
              OR LOWER(ib.lotNo)         LIKE LOWER(CONCAT('%', :keyword, '%'))
              OR LOWER(ib.purchaseLotNo) LIKE LOWER(CONCAT('%', :keyword, '%'))
            )
      """)
  Page<MaterialInbound> findBySearchConditionPaged(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo,
      @Param("keyword") String keyword,
      Pageable pageable);

  /** LOT 통합 검색 — lotNo / purchaseLotNo / inspectLotNo 중 정확히 하나라도 일치. */
  @Query("""
      SELECT ib FROM MaterialInbound ib
      WHERE :lot IN (ib.lotNo, ib.purchaseLotNo, ib.inspectLotNo)
      ORDER BY ib.inboundDate DESC
      """)
  List<MaterialInbound> findByAnyLotNo(@Param("lot") String lot);

  /** 자재재고현황 행 클릭 → 해당 품목 재고 이력(최신순). */
  @Query("""
      SELECT ib FROM MaterialInbound ib
      WHERE ib.itemSq = :itemSq
      ORDER BY ib.inboundDate DESC, ib.inboundSq DESC
      """)
  List<MaterialInbound> findByItemSqOrderByDateDesc(@Param("itemSq") Long itemSq);

  // ---------------------------------------------------------------
  // 채번 보조 (집계 함수)
  // ---------------------------------------------------------------

  /** 오늘자 LOT 채번(LOT-yyyyMMdd-XXX)을 위한 당일 건수. */
  @Query("SELECT COUNT(ib) FROM MaterialInbound ib WHERE ib.inboundDate = :today")
  long countByInboundDate(@Param("today") LocalDate today);

  /** 구매 LOT-No 채번(RM-yyyyMM-거래처-XXX)용 최대값. */
  @Query("SELECT MAX(ib.purchaseLotNo) FROM MaterialInbound ib WHERE ib.purchaseLotNo LIKE :prefix%")
  String findMaxPurchaseLotNo(@Param("prefix") String prefix);

  /** 입고검사 LOT 채번(IS-yyyyMMdd-XX)용 최대값. */
  @Query("SELECT MAX(ib.inspectLotNo) FROM MaterialInbound ib WHERE ib.inspectLotNo LIKE :prefix%")
  String findMaxInspectLotNo(@Param("prefix") String prefix);

  // ---------------------------------------------------------------
  // 대시보드 집계
  // ---------------------------------------------------------------
  // 재고로 인정되는 가입고만 합산한다: inspectStatus 가 NULL(무검사 즉시입고)이거나
  // 'PASS'(검사 합격). WAIT/REJECT 는 아직/영구히 재고가 아니므로 빠진다.

  /** 기간 내 실입고량 합계(자재 품목 한정). */
  @Query("""
      SELECT COALESCE(SUM(ib.inboundQty), 0.0) FROM MaterialInbound ib
      WHERE ib.inboundDate BETWEEN :dateFrom AND :dateTo
        AND ib.itemSq IN :materialItemSqs
        AND (ib.inspectStatus IS NULL OR ib.inspectStatus = 'PASS')
      """)
  Double sumInboundQtyInRange(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo,
      @Param("materialItemSqs") Collection<Long> materialItemSqs);

  /**
   * asOf 시점까지 누적 자재 재고량(자재재고현황 currentQty 컨벤션과 동일).
   * REGISTER(+) 와 ADJUST(±, 생산투입 차감·재고조정 시 음수)를 함께 더한 보유량.
   */
  @Query("""
      SELECT COALESCE(SUM(ib.inboundQty), 0.0) FROM MaterialInbound ib
      WHERE ib.inboundDate <= :asOf
        AND ib.itemSq IN :materialItemSqs
        AND (ib.inspectStatus IS NULL OR ib.inspectStatus = 'PASS')
      """)
  Double sumStockQtyAsOf(
      @Param("asOf") LocalDate asOf,
      @Param("materialItemSqs") Collection<Long> materialItemSqs);

  // ---------------------------------------------------------------
  // 거래처원장 (매입현황 드롭다운)
  // ---------------------------------------------------------------

  /** 기간 내 합격 입고 실적이 있는 거래처 distinct 옵션. */
  @Query("""
      SELECT DISTINCT c.customerCode AS customerCode, c.customerName AS customerName
      FROM MaterialInbound ib
      JOIN PurchaseOrderDetail pod ON pod.orderDtlSq = ib.orderDtlSq
      JOIN com.mes.domain.customer.entity.Customer c
        ON c.customerSq = pod.purchaseOrder.customerSq
      WHERE (:dateFrom IS NULL OR ib.inboundDate >= :dateFrom)
        AND (:dateTo   IS NULL OR ib.inboundDate <= :dateTo)
        AND ib.inspectStatus = 'PASS'
        AND ib.passedQty > 0
      ORDER BY c.customerCode
      """)
  List<CustomerOptionView> findDistinctCustomerOptionsForPurchaseStatus(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo);

  /** 거래처 옵션 투영(코드+명). */
  interface CustomerOptionView {
    String getCustomerCode();
    String getCustomerName();
  }
}
