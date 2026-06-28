package com.mes.domain.production.repository;

import com.mes.domain.production.entity.WorkResult;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

/**
 * 작업실적(마스터) 데이터 접근 계층.
 *
 * <p>역할별로 메서드를 묶었다: 단건/일괄 조회 → 검색 필터(현황·불량) → LOT 롤 펼침(native)
 * → 대시보드 그룹 집계 → 대시보드 KPI/진단. 펼침과 KPI 는 result_sq 와 dtl 행을 직접
 * 매핑하므로 모두 네이티브로 작성한다.
 */
@Repository
public interface ProductionWorkResultRepository extends JpaRepository<WorkResult, Long> {

  /* =========================================================
   *  1) 단건 · 일괄 조회 (파생 쿼리)
   * ========================================================= */

  List<WorkResult> findAllByOrderByWorkDateDesc();

  /** 작업지시 PK 묶음으로 실적을 한 번에 가져온다 — 비가동 화면 시작/종료시각 보강용. */
  List<WorkResult> findByWorkOrderSqIn(Collection<Long> workOrderSqs);

  /**
   * 비가동 합성행 전용. 이미 비가동이 달린 작업지시 PK 를 빼고 남은 실적만 돌려준다.
   * findAll() 뒤 메모리에서 거르던 방식을 DB 로 옮겨 대량 조회 부담을 덜었다.
   * excludeWoSqs 가 비면 dialect 별 {@code NOT IN ()} 차이 때문에 호출 측이 findAll() 로 우회해야 한다.
   */
  @Query("""
      select r
        from WorkResult r
       where r.workOrderSq is not null
         and r.workOrderSq not in :excludeWoSqs
      """)
  List<WorkResult> findByWorkOrderSqNotIn(@Param("excludeWoSqs") Collection<Long> excludeWoSqs);

  /* =========================================================
   *  2) 실적 현황 검색 (날짜·라인·품목)
   *     dateFrom/dateTo 는 한쪽만 채워도 동작. 품목 코드/명은 부분 일치(대소문자 무시).
   * ========================================================= */

  /** 현황 목록 — 엑셀과 같은 필터를 쓰도록 lineName/itemCode/itemName 까지 모두 받는다. */
  @Query("""
      select r
        from WorkResult r
        left join Item itm on itm.itemSq = r.itemSq
       where (:dateFrom is null or r.workDate >= :dateFrom)
         and (:dateTo   is null or r.workDate <= :dateTo)
         and (:lineSq   is null or r.lineSq = :lineSq)
         and (:lineName is null or r.lineName = :lineName)
         and (:itemCode is null or lower(itm.itemCode) like lower(concat('%', :itemCode, '%')))
         and (:itemName is null or lower(itm.itemName) like lower(concat('%', :itemName, '%')))
       order by r.workDate desc, r.resultSq desc
      """)
  List<WorkResult> findBySearchCondition(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo,
      @Param("lineSq") Long lineSq,
      @Param("lineName") String lineName,
      @Param("itemCode") String itemCode,
      @Param("itemName") String itemName);

  /** 현황 목록 페이징판(생산일보 대용량 대응). 정렬 필드는 Service 화이트리스트로 검증한다. */
  @Query(
      value = """
          select r
            from WorkResult r
            left join Item itm on itm.itemSq = r.itemSq
           where (:dateFrom is null or r.workDate >= :dateFrom)
             and (:dateTo   is null or r.workDate <= :dateTo)
             and (:lineSq   is null or r.lineSq = :lineSq)
             and (:lineName is null or r.lineName = :lineName)
             and (:itemCode is null or lower(itm.itemCode) like lower(concat('%', :itemCode, '%')))
             and (:itemName is null or lower(itm.itemName) like lower(concat('%', :itemName, '%')))
          """,
      countQuery = """
          select count(r)
            from WorkResult r
            left join Item itm on itm.itemSq = r.itemSq
           where (:dateFrom is null or r.workDate >= :dateFrom)
             and (:dateTo   is null or r.workDate <= :dateTo)
             and (:lineSq   is null or r.lineSq = :lineSq)
             and (:lineName is null or r.lineName = :lineName)
             and (:itemCode is null or lower(itm.itemCode) like lower(concat('%', :itemCode, '%')))
             and (:itemName is null or lower(itm.itemName) like lower(concat('%', :itemName, '%')))
          """)
  Page<WorkResult> findBySearchConditionPaged(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo,
      @Param("lineSq") Long lineSq,
      @Param("lineName") String lineName,
      @Param("itemCode") String itemCode,
      @Param("itemName") String itemName,
      Pageable pageable);

  /**
   * 기간별 불량현황(경량). 불량수량이 양수인 마스터 행만 DB 에서 추려 전체 로드를 피한다.
   * LOT 전개가 필요 없는 화면용이라 lineName 필터는 받지 않는다.
   */
  @Query("""
      select r
        from WorkResult r
        left join Item itm on itm.itemSq = r.itemSq
       where (:dateFrom is null or r.workDate >= :dateFrom)
         and (:dateTo   is null or r.workDate <= :dateTo)
         and (:lineSq   is null or r.lineSq = :lineSq)
         and (:itemCode is null or lower(itm.itemCode) like lower(concat('%', :itemCode, '%')))
         and (:itemName is null or lower(itm.itemName) like lower(concat('%', :itemName, '%')))
         and r.totalBadQty is not null
         and r.totalBadQty > 0
       order by r.workDate desc, r.resultSq desc
      """)
  List<WorkResult> findDefectsBySearchCondition(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo,
      @Param("lineSq") Long lineSq,
      @Param("itemCode") String itemCode,
      @Param("itemName") String itemName);

  /* =========================================================
   *  3) LOT 롤 펼침 (native — 1행 = 1롤)
   *     work_result_dtl 의 한 행이 결과 한 행이 된다. 마스터(m)에 dtl(d)을 LEFT JOIN 한 뒤
   *     별칭 집합을 인라인 뷰(u)로 감싸고, 품목 테이블을 바깥에서 다시 붙여 필터/정렬한다.
   *     정렬 키: workDate DESC, resultSq DESC, resultDtlSq ASC.
   * ========================================================= */

  @Query(
      value = """
          select u.* from (
            select m.result_sq        as resultSq,
                   m.work_order_sq    as workOrderSq,
                   m.work_date        as workDate,
                   m.line_sq          as lineSq,
                   m.line_name        as lineName,
                   m.item_sq          as itemSq,
                   m.total_prod_qty   as totalProdQty,
                   m.total_good_qty   as totalGoodQty,
                   m.total_bad_qty    as totalBadQty,
                   m.appearance_defect as appearanceDefect,
                   m.dimension_defect  as dimensionDefect,
                   m.start_time       as startTime,
                   m.end_time         as endTime,
                   d.result_dtl_sq    as resultDtlSq,
                   d.lot_no           as lotNo,
                   d.roll_no          as rollNo,
                   d.prod_width       as prodWidth,
                   d.prod_length      as prodLength,
                   d.real_basis_weight as realBasisWeight,
                   d.net_weight       as netWeight,
                   d.gross_weight     as grossWeight,
                   d.judge_code       as judgeCode,
                   d.defect_type      as defectType,
                   d.work_start_dt    as workStartDt,
                   d.work_end_dt      as workEndDt
              from mes_work_result_tb m
              left join mes_work_result_dtl_tb d on d.result_sq = m.result_sq
          ) u
          left join mes_item_tb i on i.item_sq = u.itemSq
          where (:dateFrom is null or u.workDate >= :dateFrom)
            and (:dateTo   is null or u.workDate <= :dateTo)
            and (:lineSq   is null or u.lineSq = :lineSq)
            and (:lineName is null or u.lineName = :lineName)
            and (:itemCode is null or lower(i.item_cd) like lower(concat('%', :itemCode, '%')))
            and (:itemName is null or lower(i.item_nm) like lower(concat('%', :itemName, '%')))
          order by u.workDate desc, u.resultSq desc, coalesce(u.resultDtlSq, 0) asc
          limit :pageSize offset :pageOffset
          """,
      nativeQuery = true)
  List<ExpandedRow> findExpandedRowsPaged(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo,
      @Param("lineSq") Long lineSq,
      @Param("lineName") String lineName,
      @Param("itemCode") String itemCode,
      @Param("itemName") String itemName,
      @Param("pageSize") int pageSize,
      @Param("pageOffset") int pageOffset);

  /** 위 펼침과 동일한 행 집합을 세어 페이징 total 을 맞춘다. 투영 컬럼만 줄여 비용을 낮췄다. */
  @Query(
      value = """
          select count(*) from (
            select m.result_sq, m.item_sq, m.work_date, m.line_sq, m.line_name
              from mes_work_result_tb m
              left join mes_work_result_dtl_tb d on d.result_sq = m.result_sq
          ) u
          left join mes_item_tb i on i.item_sq = u.item_sq
          where (:dateFrom is null or u.work_date >= :dateFrom)
            and (:dateTo   is null or u.work_date <= :dateTo)
            and (:lineSq   is null or u.line_sq = :lineSq)
            and (:lineName is null or u.line_name = :lineName)
            and (:itemCode is null or lower(i.item_cd) like lower(concat('%', :itemCode, '%')))
            and (:itemName is null or lower(i.item_nm) like lower(concat('%', :itemName, '%')))
          """,
      nativeQuery = true)
  long countExpandedRows(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo,
      @Param("lineSq") Long lineSq,
      @Param("lineName") String lineName,
      @Param("itemCode") String itemCode,
      @Param("itemName") String itemName);

  /** 작업지시 한 건의 전체 롤 펼침 — findExpandedRowsPaged 와 같은 dtl 정책, 필터는 work_order_sq 한 개. */
  @Query(
      value = """
          select u.* from (
            select m.result_sq        as resultSq,
                   m.work_order_sq    as workOrderSq,
                   m.work_date        as workDate,
                   m.line_sq          as lineSq,
                   m.line_name        as lineName,
                   m.item_sq          as itemSq,
                   m.total_prod_qty   as totalProdQty,
                   m.total_good_qty   as totalGoodQty,
                   m.total_bad_qty    as totalBadQty,
                   m.appearance_defect as appearanceDefect,
                   m.dimension_defect  as dimensionDefect,
                   m.start_time       as startTime,
                   m.end_time         as endTime,
                   d.result_dtl_sq    as resultDtlSq,
                   d.lot_no           as lotNo,
                   d.roll_no          as rollNo,
                   d.prod_width       as prodWidth,
                   d.prod_length      as prodLength,
                   d.real_basis_weight as realBasisWeight,
                   d.net_weight       as netWeight,
                   d.gross_weight     as grossWeight,
                   d.judge_code       as judgeCode,
                   d.defect_type      as defectType,
                   d.work_start_dt    as workStartDt,
                   d.work_end_dt      as workEndDt
              from mes_work_result_tb m
              left join mes_work_result_dtl_tb d on d.result_sq = m.result_sq
             where m.work_order_sq = :workOrderSq
          ) u
          order by u.resultSq desc, coalesce(u.resultDtlSq, 0) asc
          """,
      nativeQuery = true)
  List<ExpandedRow> findExpandedRowsByWorkOrderSq(@Param("workOrderSq") Long workOrderSq);

  /** LOT 추적 펼침 페이징 — 펼침 정책 + lotNo 부분 일치(대소문자 무시). 페이징은 native LIMIT/OFFSET. */
  @Query(
      value = """
          select u.* from (
            select m.result_sq        as resultSq,
                   m.work_order_sq    as workOrderSq,
                   m.work_date        as workDate,
                   m.line_sq          as lineSq,
                   m.line_name        as lineName,
                   m.item_sq          as itemSq,
                   m.total_prod_qty   as totalProdQty,
                   m.total_good_qty   as totalGoodQty,
                   m.total_bad_qty    as totalBadQty,
                   m.appearance_defect as appearanceDefect,
                   m.dimension_defect  as dimensionDefect,
                   m.start_time       as startTime,
                   m.end_time         as endTime,
                   d.result_dtl_sq    as resultDtlSq,
                   d.lot_no           as lotNo,
                   d.roll_no          as rollNo,
                   d.prod_width       as prodWidth,
                   d.prod_length      as prodLength,
                   d.real_basis_weight as realBasisWeight,
                   d.net_weight       as netWeight,
                   d.gross_weight     as grossWeight,
                   d.judge_code       as judgeCode,
                   d.defect_type      as defectType,
                   d.work_start_dt    as workStartDt,
                   d.work_end_dt      as workEndDt
              from mes_work_result_tb m
              left join mes_work_result_dtl_tb d on d.result_sq = m.result_sq
          ) u
          where (:dateFrom is null or u.workDate >= :dateFrom)
            and (:dateTo   is null or u.workDate <= :dateTo)
            and (:keyword  is null or lower(u.lotNo) like lower(concat('%', :keyword, '%')))
          order by u.workDate desc, u.resultSq desc, coalesce(u.resultDtlSq, 0) asc
          limit :pageSize offset :pageOffset
          """,
      nativeQuery = true)
  List<ExpandedRow> findForLotTracePaged(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo,
      @Param("keyword") String keyword,
      @Param("pageSize") int pageSize,
      @Param("pageOffset") int pageOffset);

  /** findForLotTracePaged 의 total 카운트 — 같은 조건으로 동일 행을 센다. */
  @Query(
      value = """
          select count(*) from (
            select m.work_date as workDate, d.lot_no as lotNo
              from mes_work_result_tb m
              left join mes_work_result_dtl_tb d on d.result_sq = m.result_sq
          ) u
          where (:dateFrom is null or u.workDate >= :dateFrom)
            and (:dateTo   is null or u.workDate <= :dateTo)
            and (:keyword  is null or lower(u.lotNo) like lower(concat('%', :keyword, '%')))
          """,
      nativeQuery = true)
  long countForLotTrace(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo,
      @Param("keyword") String keyword);

  /** LOT 추적 엑셀 — 페이징 없이 전부. findForLotTracePaged 와 동일한 정책/정렬. */
  @Query(
      value = """
          select u.* from (
            select m.result_sq        as resultSq,
                   m.work_order_sq    as workOrderSq,
                   m.work_date        as workDate,
                   m.line_sq          as lineSq,
                   m.line_name        as lineName,
                   m.item_sq          as itemSq,
                   m.total_prod_qty   as totalProdQty,
                   m.total_good_qty   as totalGoodQty,
                   m.total_bad_qty    as totalBadQty,
                   m.appearance_defect as appearanceDefect,
                   m.dimension_defect  as dimensionDefect,
                   m.start_time       as startTime,
                   m.end_time         as endTime,
                   d.result_dtl_sq    as resultDtlSq,
                   d.lot_no           as lotNo,
                   d.roll_no          as rollNo,
                   d.prod_width       as prodWidth,
                   d.prod_length      as prodLength,
                   d.real_basis_weight as realBasisWeight,
                   d.net_weight       as netWeight,
                   d.gross_weight     as grossWeight,
                   d.judge_code       as judgeCode,
                   d.defect_type      as defectType,
                   d.work_start_dt    as workStartDt,
                   d.work_end_dt      as workEndDt
              from mes_work_result_tb m
              left join mes_work_result_dtl_tb d on d.result_sq = m.result_sq
          ) u
          where (:dateFrom is null or u.workDate >= :dateFrom)
            and (:dateTo   is null or u.workDate <= :dateTo)
            and (:keyword  is null or lower(u.lotNo) like lower(concat('%', :keyword, '%')))
          order by u.workDate desc, u.resultSq desc, coalesce(u.resultDtlSq, 0) asc
          """,
      nativeQuery = true)
  List<ExpandedRow> findForLotTraceAll(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo,
      @Param("keyword") String keyword);

  /**
   * 펼침 native 결과 투영.
   * 날짜/시간 게터는 엔티티와 같은 {@code LocalDate}/{@code LocalDateTime} 으로 선언해야 한다.
   * {@code java.sql.Date}/{@code Timestamp} 로 두면 Spring Data 가 Hibernate 반환값을 매핑하지
   * 못하고 "Cannot project ... to java.sql.Date" 예외를 던진다.
   */
  interface ExpandedRow {
    Long getResultSq();
    Long getWorkOrderSq();
    LocalDate getWorkDate();
    Long getLineSq();
    String getLineName();
    Long getItemSq();
    Integer getTotalProdQty();
    Integer getTotalGoodQty();
    Integer getTotalBadQty();
    String getAppearanceDefect();
    String getDimensionDefect();
    LocalDateTime getStartTime();
    LocalDateTime getEndTime();
    Long getResultDtlSq();
    String getLotNo();
    Integer getRollNo();
    Double getProdWidth();
    Double getProdLength();
    Double getRealBasisWeight();
    Double getNetWeight();
    Double getGrossWeight();
    String getJudgeCode();
    String getDefectType();
    LocalDateTime getWorkStartDt();
    LocalDateTime getWorkEndDt();
  }

  /* =========================================================
   *  4) 대시보드 그룹 집계
   * ========================================================= */

  /** 품목+기간의 양품 생산량 합계 — 마스터 totalGoodQty 기준. */
  @Query("""
      select coalesce(sum(r.totalGoodQty), 0)
        from WorkResult r
       where r.itemSq = :itemSq
         and r.workDate between :dateFrom and :dateTo
      """)
  Long sumGoodQtyByItemAndDateRange(
      @Param("itemSq") Long itemSq,
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo);

  /** 월별 양품 생산량 합계. */
  @Query("""
      select month(r.workDate) as month, coalesce(sum(r.totalGoodQty), 0) as qty
        from WorkResult r
       where r.workDate between :dateFrom and :dateTo
       group by month(r.workDate)
      """)
  List<MonthlySum> sumGoodQtyGroupByMonth(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo);

  /** 라인별 양품 생산량 합계. */
  @Query("""
      select r.lineName as lineName, coalesce(sum(r.totalGoodQty), 0) as qty
        from WorkResult r
       where r.workDate between :dateFrom and :dateTo
       group by r.lineName
      """)
  List<LineSum> sumGoodQtyGroupByLine(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo);

  /** 라인×월별 양품 생산량 합계 (라인별 추이). */
  @Query("""
      select r.lineName as lineName, month(r.workDate) as month, coalesce(sum(r.totalGoodQty), 0) as qty
        from WorkResult r
       where r.workDate between :dateFrom and :dateTo
       group by r.lineName, month(r.workDate)
      """)
  List<LineMonthlySum> sumGoodQtyGroupByLineAndMonth(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo);

  /**
   * 라인×월별 양품 생산 면적(m²) = SUM( (폭mm/1000) × 길이m ), LOT 단위, NG 제외.
   * 폭은 실측(prod_width) 우선, 없으면 품목 스펙 평균(avg_width)으로 보정한다 — 옛 데이터 prod_width 공백 대응.
   */
  @Query(
      value = """
          select m.line_name as lineName,
                 month(m.work_date) as month,
                 coalesce(sum( (coalesce(d.prod_width, isp.avg_width) / 1000.0) * d.prod_length ), 0) as qty
            from mes_work_result_dtl_tb d
            join mes_work_result_tb m on m.result_sq = d.result_sq
            left join (
                 select item_sq, avg(width) as avg_width
                   from mes_item_spec_tb
                  where width is not null
                  group by item_sq
            ) isp on isp.item_sq = m.item_sq
           where m.work_date between :dateFrom and :dateTo
             and d.prod_length is not null
             and (d.judge_code is null or d.judge_code <> 'NG')
             and coalesce(d.prod_width, isp.avg_width) is not null
           group by m.line_name, month(m.work_date)
          """,
      nativeQuery = true)
  List<LineMonthlySum> sumGoodAreaGroupByLineAndMonth(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo);

  /**
   * 월별 생산길이(m) 합계 — 생산일보 "생산길이"(manageLength) 기준. 합·불 구분 없이 모두 더한다.
   * 생산계획 대비 실적 화면의 "실적" 소스.
   */
  @Query("""
      select month(r.workDate) as month, coalesce(sum(d.prodLength), 0) as qty
        from WorkResult r
        join r.details d
       where r.workDate between :dateFrom and :dateTo
       group by month(r.workDate)
      """)
  List<MonthlySum> sumProdLengthGroupByMonth(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo);

  /** 라인별 생산길이(m) 합계. */
  @Query("""
      select r.lineName as lineName, coalesce(sum(d.prodLength), 0) as qty
        from WorkResult r
        join r.details d
       where r.workDate between :dateFrom and :dateTo
       group by r.lineName
      """)
  List<LineSum> sumProdLengthGroupByLine(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo);

  /** 생산추이도: 라인×월별 생산길이(m) 합계 — dtl 실측 prod_length 를 result_sq 단위 서브쿼리로 더한다. */
  @Query(
      value = """
          select m.line_name as lineName,
                 month(m.work_date) as month,
                 coalesce(sum(
                     (select sum(d.prod_length)
                        from mes_work_result_dtl_tb d
                       where d.result_sq = m.result_sq
                         and d.prod_length is not null)
                 ), 0) as qty
            from mes_work_result_tb m
           where m.work_date between :dateFrom and :dateTo
           group by m.line_name, month(m.work_date)
          """,
      nativeQuery = true)
  List<LineMonthlySum> sumProdLengthGroupByLineAndMonth(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo);

  /** 월별 고유 작업일수(distinct workDate) — "월별 일평균 생산량" 분모(전사 기준, 라인 무관). */
  @Query("""
      select month(r.workDate) as month, count(distinct r.workDate) as qty
        from WorkResult r
       where r.workDate between :dateFrom and :dateTo
       group by month(r.workDate)
      """)
  List<MonthlySum> countDistinctWorkDateGroupByMonth(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo);

  /**
   * 라인×월별 고유 작업일수 — 라인 필터 시 분모를 라인 기준으로 좁힌다.
   * 일평균 = 가시 라인 합산 생산량 / MAX(가시 라인별 월 distinct workDate);
   * MAX 를 쓰면 라인 간 같은 날짜를 중복 세지 않고 union 상한을 추정한다.
   */
  @Query("""
      select r.lineName as lineName, month(r.workDate) as month, count(distinct r.workDate) as qty
        from WorkResult r
       where r.workDate between :dateFrom and :dateTo
       group by r.lineName, month(r.workDate)
      """)
  List<LineMonthlySum> countDistinctWorkDateGroupByLineAndMonth(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo);

  interface MonthlySum {
    Integer getMonth();
    Number getQty();
  }

  interface LineSum {
    String getLineName();
    Number getQty();
  }

  interface LineMonthlySum {
    String getLineName();
    Integer getMonth();
    Number getQty();
  }

  /* =========================================================
   *  5) 대시보드 KPI / 진단 (native)
   * ========================================================= */

  /**
   * KPI 행 — 생산일보(work_result) 한 행이 KPI 한 단위.
   * 바깥은 mes_work_result_tb(작업지시가 없어도 됨; 시드는 wo 없이 m+dtl 만 있음),
   * dtl 합산 서브쿼리(dtlsum)에서 result_sq 단위로 생산량/길이/관리중량/롤수를 만든다.
   * dtlsum 안에 work_date 필터를 밀어넣어 조회 기간 dtl 만 집계하므로 전체 GROUP BY 를 피한다.
   * 관리중량 fallback 순서: wo.manage_weight → item.basis_weight → d.real_basis_weight.
   */
  @Query(
      value = """
          select m.result_sq     as resultSq,
                 m.work_order_sq as workOrderSq,
                 m.work_date     as workDate,
                 m.line_name     as lineName,
                 m.item_sq       as itemSq,
                 m.start_time    as startTime,
                 m.end_time      as endTime,
                 coalesce(dtlsum.producedKg, 0) as producedKg,
                 coalesce(dtlsum.producedM,  0) as producedM,
                 coalesce(dtlsum.managedKg,  0) as managedKg,
                 coalesce(dtlsum.rollCount,  0) as rollCount
            from mes_work_result_tb m
            left join (
                 select d.result_sq,
                        sum(coalesce(d.gross_weight, d.net_weight)) as producedKg,
                        sum(coalesce(d.prod_length, i.length, isp.avg_length, 0)) as producedM,
                        sum(coalesce(wo.manage_weight, i.basis_weight, isp.avg_basis,
                                     i.weight, isp.avg_weight, d.real_basis_weight)
                            * coalesce(d.prod_width, i.width, isp.avg_width)
                            * coalesce(d.prod_length, i.length, isp.avg_length) / 1000000) as managedKg,
                        count(*) as rollCount
                   from mes_work_result_dtl_tb d
                   join mes_work_result_tb m2 on m2.result_sq = d.result_sq
                   left join mes_work_order_tb wo on wo.work_order_sq = m2.work_order_sq
                   left join mes_item_tb i on i.item_sq = m2.item_sq
                   left join (
                        select item_sq,
                               avg(width) as avg_width,
                               avg(length) as avg_length,
                               avg(basis_weight) as avg_basis,
                               avg(weight) as avg_weight
                          from mes_item_spec_tb
                         group by item_sq
                   ) isp on isp.item_sq = m2.item_sq
                  where coalesce(d.gross_weight, d.net_weight) > 0
                    and m2.work_date between :dateFrom and :dateTo
                  group by d.result_sq
            ) dtlsum on dtlsum.result_sq = m.result_sq
           where m.work_date between :dateFrom and :dateTo
             and coalesce(dtlsum.producedKg, 0) > 0
           order by m.work_date desc, m.result_sq desc
          """,
      nativeQuery = true)
  List<KpiRow> findKpiRowsByWorkDate(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo);

  interface KpiRow {
    Long getResultSq();
    Long getWorkOrderSq();   // 시드는 null 가능
    LocalDate getWorkDate();
    String getLineName();
    Long getItemSq();
    LocalDateTime getStartTime();
    LocalDateTime getEndTime();
    Double getProducedKg();
    Double getProducedM();      // 생산 길이(m) — d.prod_length 합 (fallback: item/spec)
    Double getManagedKg();
    Integer getRollCount();
  }

  /**
   * 진단 — KPI 가 0건일 때 어느 단계에서 막혔는지 한 쿼리로 5개 카운트.
   * inRange: 기간 안 work_result 행 / hasWorkOrderSq: 그 중 work_order_sq 있는 행
   * / hasDtl: dtl 1개 이상 / dtlHasWeight: gross 또는 net > 0 / dtlHasDims: prod_width & prod_length 둘 다 존재.
   */
  @Query(
      value = """
          select
            count(*) as inRange,
            sum(case when m.work_order_sq is not null then 1 else 0 end) as hasWorkOrderSq,
            sum(case when exists (select 1 from mes_work_result_dtl_tb d
                                   where d.result_sq = m.result_sq) then 1 else 0 end) as hasDtl,
            sum(case when exists (select 1 from mes_work_result_dtl_tb d
                                   where d.result_sq = m.result_sq
                                     and coalesce(d.gross_weight, d.net_weight) > 0) then 1 else 0 end) as dtlHasWeight,
            sum(case when exists (select 1 from mes_work_result_dtl_tb d
                                   where d.result_sq = m.result_sq
                                     and d.prod_width is not null
                                     and d.prod_length is not null) then 1 else 0 end) as dtlHasDims
          from mes_work_result_tb m
          where m.work_date between :dateFrom and :dateTo
          """,
      nativeQuery = true)
  KpiDiagRow getKpiDiagnostics(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo);

  interface KpiDiagRow {
    Integer getInRange();
    Integer getHasWorkOrderSq();
    Integer getHasDtl();
    Integer getDtlHasWeight();
    Integer getDtlHasDims();
  }
}
