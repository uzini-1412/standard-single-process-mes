package com.mes.domain.production.repository;

import com.mes.domain.production.entity.WorkOrder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 작업지시(마스터) 접근 계층.
 *
 * <p>현황/페이징 조회는 상세를 fetch join 해 N+1 을 막고, LOT 채번과 대시보드 합계는
 * 별도 집계 쿼리로 둔다. 마스터 별칭 {@code ord}, 품목 별칭 {@code itm}.
 */
@Repository
public interface ProductionWorkOrderRepository extends JpaRepository<WorkOrder, Long> {

  /* === 목록 / 현황 ======================================================== */

  /** 날짜 필터 없이 전체를 지시일 역순으로. 상세까지 fetch 한다. */
  @Query("""
      select distinct ord
        from ProductionWorkOrder ord
        left join fetch ord.details
       order by ord.workOrderDate desc, ord.workOrderSq desc
      """)
  List<WorkOrder> findAllByOrderByWorkOrderDateDesc();

  /**
   * 현황 조회 — 기간/라인 필터. 상세를 fetch join 하므로 distinct 가 필요하다.
   * dateFrom·dateTo·lineSq·lineName 은 각각 null 이면 해당 조건을 건너뛴다.
   */
  @Query("""
      select distinct ord
        from ProductionWorkOrder ord
        left join fetch ord.details
       where (:dateFrom  is null or ord.workOrderDate >= :dateFrom)
         and (:dateTo    is null or ord.workOrderDate <= :dateTo)
         and (:lineSq    is null or ord.lineSq = :lineSq)
         and (:lineName  is null or ord.lineName = :lineName)
       order by ord.workOrderDate desc, ord.workOrderSq desc
      """)
  List<WorkOrder> findBySearchCondition(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo,
      @Param("lineSq") Long lineSq,
      @Param("lineName") String lineName);

  /**
   * 현황 페이징판 — 위 검색에 품목 코드/명(부분 일치, 대소문자 무시)을 더한 것.
   * fetch join 대신 Item 을 단순 조인해 count 쿼리와 정렬이 페이징과 충돌하지 않게 한다.
   */
  @Query(
      value = """
          select ord
            from ProductionWorkOrder ord
            left join Item itm on itm.itemSq = ord.itemSq
           where (:dateFrom  is null or ord.workOrderDate >= :dateFrom)
             and (:dateTo    is null or ord.workOrderDate <= :dateTo)
             and (:lineSq    is null or ord.lineSq = :lineSq)
             and (:lineName  is null or ord.lineName = :lineName)
             and (:itemCode  is null or lower(itm.itemCode) like lower(concat('%', :itemCode, '%')))
             and (:itemName  is null or lower(itm.itemName) like lower(concat('%', :itemName, '%')))
           order by ord.workOrderDate desc, ord.workOrderSq desc
          """,
      countQuery = """
          select count(ord)
            from ProductionWorkOrder ord
            left join Item itm on itm.itemSq = ord.itemSq
           where (:dateFrom  is null or ord.workOrderDate >= :dateFrom)
             and (:dateTo    is null or ord.workOrderDate <= :dateTo)
             and (:lineSq    is null or ord.lineSq = :lineSq)
             and (:lineName  is null or ord.lineName = :lineName)
             and (:itemCode  is null or lower(itm.itemCode) like lower(concat('%', :itemCode, '%')))
             and (:itemName  is null or lower(itm.itemName) like lower(concat('%', :itemName, '%')))
          """)
  Page<WorkOrder> findBySearchConditionPaged(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo,
      @Param("lineSq") Long lineSq,
      @Param("lineName") String lineName,
      @Param("itemCode") String itemCode,
      @Param("itemName") String itemName,
      Pageable pageable);

  /**
   * 원소재투입분석상세 — 지정 라인에서 지시일·시작일·종료일 중 하루라도 해당 날짜에 걸리는 지시.
   * 시작/종료는 [dayStart, dayEnd) 반열린 구간으로 비교한다.
   */
  @Query("""
      select distinct ord
        from ProductionWorkOrder ord
        left join fetch ord.details
       where ord.lineName = :lineName
         and (
              ord.workOrderDate = :date
           or (ord.workStartTime is not null and ord.workStartTime >= :dayStart and ord.workStartTime < :dayEnd)
           or (ord.workEndTime   is not null and ord.workEndTime   >= :dayStart and ord.workEndTime   < :dayEnd)
         )
       order by ord.workOrderDate desc, ord.workOrderSq desc
      """)
  List<WorkOrder> findByLineAndDateAcrossLifecycle(
      @Param("lineName") String lineName,
      @Param("date") LocalDate date,
      @Param("dayStart") LocalDateTime dayStart,
      @Param("dayEnd") LocalDateTime dayEnd);

  /* === 채번 / 집계 ======================================================== */

  /** 생산 Lot-No 채번 — 같은 prefix 로 시작하는 기존 지시 수를 다음 순번 기준으로 쓴다. */
  @Query("""
      select count(ord)
        from ProductionWorkOrder ord
       where ord.productionLotNo like concat(:prefix, '%')
      """)
  long countByProductionLotNoPrefix(@Param("prefix") String prefix);

  /** 라인별 작업지시량(targetQty) 합계 — 대시보드. */
  @Query("""
      select ord.lineName as lineName, coalesce(sum(ord.targetQty), 0) as qty
        from ProductionWorkOrder ord
       where ord.workOrderDate between :dateFrom and :dateTo
       group by ord.lineName
      """)
  List<LineSum> sumTargetQtyGroupByLine(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo);

  /**
   * 월별 작업지시량(targetQty, m) 합계 — 생산계획 대비 실적 화면의 "계획" 소스.
   * 마스터 targetQty 는 상세 orderQty 합과 동기화되도록 운영한다.
   */
  @Query("""
      select month(ord.workOrderDate) as month, coalesce(sum(ord.targetQty), 0) as qty
        from ProductionWorkOrder ord
       where ord.workOrderDate between :dateFrom and :dateTo
       group by month(ord.workOrderDate)
      """)
  List<MonthlySum> sumTargetQtyGroupByMonth(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo);

  interface LineSum {
    String getLineName();
    Long getQty();
  }

  interface MonthlySum {
    Integer getMonth();
    Long getQty();
  }
}
