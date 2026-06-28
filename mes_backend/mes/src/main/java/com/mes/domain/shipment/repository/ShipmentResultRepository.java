package com.mes.domain.shipment.repository;

import com.mes.domain.shipment.entity.ShipmentResult;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ShipmentResultRepository extends JpaRepository<ShipmentResult, Long> {

  // ----- derived 단건/다건 조회 -----

  // 품목별 출하실적
  List<ShipmentResult> findByItemSq(Long itemSq);

  // 다수 품목 출하실적 일괄 (재고 통계 등)
  List<ShipmentResult> findByItemSqIn(Collection<Long> itemSqs);

  // 품목 + 기간 — 제품재고분석 월별 통계에서 최근 N개월만 로드해 메모리 절감
  List<ShipmentResult> findByItemSqInAndShipDateBetween(
      Collection<Long> itemSqs,
      LocalDate dateFrom,
      LocalDate dateTo);

  // LOT 단건 조회 (LOT 추적; findAll+filter 대체)
  Optional<ShipmentResult> findFirstByLotNo(String lotNo);

  // LOT 다건 조회 (LOT 추적 엑셀 출력 연계)
  List<ShipmentResult> findByLotNoIn(Collection<String> lotNos);

  // 지시상세 키 묶음 단위 일괄 로드 — LOT 추적의 풀스캔을 키 조회로 좁힌다
  List<ShipmentResult> findByShipDtlSqIn(Collection<Long> shipDtlSqs);

  // 매출현황 상세팝업: (customer_sq + ship_date + lot_no) 그룹키 직접 조회 (풀로드 회피)
  List<ShipmentResult> findByCustomerSqAndShipDateAndLotNo(
      Long customerSq, LocalDate shipDate, String lotNo);

  // ----- 목록/현황 조회 -----

  // 기간 기반 실적. 경계값이 null 이면 그쪽 비교를 건너뛴다(둘 다 null → 전체).
  @Query("""
      select res
        from ShipmentResult res
       where (:dateFrom is null or res.shipDate >= :dateFrom)
         and (:dateTo   is null or res.shipDate <= :dateTo)
       order by res.shipDate desc, res.shipResultSq desc
      """)
  List<ShipmentResult> findBySearchCondition(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo);

  // 엑셀출력용 — 기간 + 품번/품명/거래처 필터 (list-paged 와 동일 필터)
  @Query("""
      select res
        from ShipmentResult res
        left join Item itm on itm.itemSq = res.itemSq
        left join Customer cst on cst.customerSq = res.customerSq
       where (:dateFrom is null or res.shipDate >= :dateFrom)
         and (:dateTo   is null or res.shipDate <= :dateTo)
         and (:itemCode is null or lower(itm.itemCode) like lower(concat('%', :itemCode, '%')))
         and (:itemName is null or lower(itm.itemName) like lower(concat('%', :itemName, '%')))
         and (:customerName is null or lower(cst.customerName) like lower(concat('%', :customerName, '%')))
       order by res.shipDate desc, res.shipResultSq desc
      """)
  List<ShipmentResult> findByExportSearchCondition(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo,
      @Param("itemCode") String itemCode,
      @Param("itemName") String itemName,
      @Param("customerName") String customerName);

  // 출하관리(현황) 페이징. 정렬은 Pageable.sort 로 주입하고, 정렬 필드 화이트리스트는 Service 가 검증한다.
  @Query(value = """
      select res
        from ShipmentResult res
        left join Item itm on itm.itemSq = res.itemSq
        left join Customer cst on cst.customerSq = res.customerSq
       where (:dateFrom is null or res.shipDate >= :dateFrom)
         and (:dateTo   is null or res.shipDate <= :dateTo)
         and (:itemCode is null or lower(itm.itemCode) like lower(concat('%', :itemCode, '%')))
         and (:itemName is null or lower(itm.itemName) like lower(concat('%', :itemName, '%')))
         and (:customerName is null or lower(cst.customerName) like lower(concat('%', :customerName, '%')))
      """,
      countQuery = """
          select count(res)
            from ShipmentResult res
            left join Item itm on itm.itemSq = res.itemSq
            left join Customer cst on cst.customerSq = res.customerSq
           where (:dateFrom is null or res.shipDate >= :dateFrom)
             and (:dateTo   is null or res.shipDate <= :dateTo)
             and (:itemCode is null or lower(itm.itemCode) like lower(concat('%', :itemCode, '%')))
             and (:itemName is null or lower(itm.itemName) like lower(concat('%', :itemName, '%')))
             and (:customerName is null or lower(cst.customerName) like lower(concat('%', :customerName, '%')))
          """)
  Page<ShipmentResult> findBySearchConditionPaged(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo,
      @Param("itemCode") String itemCode,
      @Param("itemName") String itemName,
      @Param("customerName") String customerName,
      Pageable pageable);

  // LOT 추적 검색 페이징 (기간 + lotNo 키워드). 시작/종료일 단독 입력도 허용.
  @Query("""
      select res
        from ShipmentResult res
       where (:dateFrom is null or res.shipDate >= :dateFrom)
         and (:dateTo   is null or res.shipDate <= :dateTo)
         and (:keyword  is null or lower(res.lotNo) like lower(concat('%', :keyword, '%')))
       order by res.shipDate desc, res.shipResultSq desc
      """)
  Page<ShipmentResult> findForLotTracePaged(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo,
      @Param("keyword") String keyword,
      Pageable pageable);

  // ----- 집계/통계 -----

  // 단일 품목 + 기간 실제 출하량 합계 (재고 통계)
  @Query("""
      select coalesce(sum(res.shippedQty), 0)
        from ShipmentResult res
       where res.itemSq = :itemSq
         and res.shipDate between :dateFrom and :dateTo
      """)
  Double sumShippedQtyByItemAndDateRange(
      @Param("itemSq") Long itemSq,
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo);

  // 전체 품목 출하량 합계 (기간 필터) — 출하예정량 산출용 (itemSq → sum)
  @Query("""
      select res.itemSq as itemSq, coalesce(sum(res.shippedQty), 0) as qty
        from ShipmentResult res
       where res.shipDate between :dateFrom and :dateTo
         and res.itemSq is not null
       group by res.itemSq
      """)
  List<ShippedSumPerItem> sumShippedQtyGroupByItem(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo);

  // 대시보드: 월(MONTH) 단위 출하실적량 합계 — 대용량 대비 DB 측 GROUP BY
  @Query("""
      select month(res.shipDate) as month, coalesce(sum(res.shippedQty), 0) as qty
        from ShipmentResult res
       where res.shipDate between :dateFrom and :dateTo
       group by month(res.shipDate)
      """)
  List<MonthlySum> sumShippedQtyGroupByMonth(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo);

  // 대시보드 회전율: 품목별 기간 출하량(m/EA) 합계와 마지막 출하일
  @Query("""
      select res.itemSq as itemSq,
             coalesce(sum(res.shippedQty), 0) as shippedM,
             coalesce(sum(res.shippedQtyEa), 0) as shippedEa,
             max(res.shipDate) as lastShip
        from ShipmentResult res
       where res.shipDate between :dateFrom and :dateTo
         and res.itemSq is not null
       group by res.itemSq
      """)
  List<ShipPerItem> aggregateShipForTurnover(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo);

  // 출하LOT 채번: prefix 로 시작하는 LOT 중 최대값
  @Query("select max(res.lotNo) from ShipmentResult res where res.lotNo like concat(:prefix, '%')")
  String findMaxLotNo(@Param("prefix") String prefix);

  // 매출현황 거래처 드롭다운: 기간 내 출하실적 거래처를 SQL DISTINCT 로 가볍게 조회
  @Query("""
      select distinct cst.customerCode as customerCode, cst.customerName as customerName
        from ShipmentResult res
        join Customer cst on cst.customerSq = res.customerSq
       where (:dateFrom is null or res.shipDate >= :dateFrom)
         and (:dateTo   is null or res.shipDate <= :dateTo)
       order by cst.customerCode
      """)
  List<CustomerOptionView> findDistinctCustomerOptionsForSalesStatus(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo);

  // ----- projection -----

  interface ShippedSumPerItem {
    Long getItemSq();
    Double getQty();
  }

  interface MonthlySum {
    Integer getMonth();
    Double getQty();
  }

  interface ShipPerItem {
    Long getItemSq();
    Double getShippedM();
    Long getShippedEa();
    LocalDate getLastShip();
  }

  interface CustomerOptionView {
    String getCustomerCode();
    String getCustomerName();
  }
}
