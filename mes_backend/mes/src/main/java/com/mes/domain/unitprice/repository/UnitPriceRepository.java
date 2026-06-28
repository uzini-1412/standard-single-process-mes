package com.mes.domain.unitprice.repository;

import com.mes.domain.unitprice.entity.PriceType;
import com.mes.domain.unitprice.entity.UnitPrice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface UnitPriceRepository extends JpaRepository<UnitPrice, Long> {

  /**
   * 매출/매입 현황의 fallback 단가 계산용 일괄 조회.
   * 사용중(use_yn=TRUE)이면서 지정한 구분에 해당하는, 주어진 거래처/품목 집합의 단가를 모두 가져온다.
   */
  @Query("SELECT p FROM UnitPrice p "
      + "WHERE p.priceType = :priceType "
      + "AND p.useYn = TRUE "
      + "AND p.customerSq IN :customerSqs "
      + "AND p.itemSq IN :itemSqs")
  List<UnitPrice> findActiveByCustomerSqsAndItemSqsAndType(
      @Param("customerSqs") List<Long> customerSqs,
      @Param("itemSqs") List<Long> itemSqs,
      @Param("priceType") PriceType priceType);

  /** 같은 품목·거래처·구분 묶음에 속한 모든 단가 행. */
  List<UnitPrice> findByItemSqAndCustomerSqAndPriceType(Long itemSq, Long customerSq, PriceType priceType);

  /**
   * 화면 검색용 단건 조회. 모든 파라미터는 null 이면 해당 조건을 건너뛴다.
   * baseDate 가 지정되면 그 날짜가 적용기간[startDate, endDate] 안에 드는 행만 남긴다(endDate null=무기한).
   * 정렬은 품목 오름차순 → 적용시작일 내림차순(최신 우선).
   */
  @Query("SELECT p FROM UnitPrice p "
      + "WHERE (:itemSq IS NULL OR p.itemSq = :itemSq) "
      + "AND (:customerSq IS NULL OR p.customerSq = :customerSq) "
      + "AND (:priceType IS NULL OR p.priceType = :priceType) "
      + "AND (:baseDate IS NULL OR (p.startDate <= :baseDate AND (p.endDate IS NULL OR p.endDate >= :baseDate))) "
      + "AND (:useYn IS NULL OR p.useYn = :useYn) "
      + "ORDER BY p.itemSq ASC, p.startDate DESC")
  List<UnitPrice> findBySearchCondition(
      @Param("itemSq") Long itemSq,
      @Param("customerSq") Long customerSq,
      @Param("priceType") PriceType priceType,
      @Param("baseDate") LocalDate baseDate,
      @Param("useYn") Boolean useYn);
}
