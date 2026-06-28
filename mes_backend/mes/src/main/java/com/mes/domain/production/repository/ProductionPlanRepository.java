package com.mes.domain.production.repository;

import com.mes.domain.production.entity.ProductionPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * 생산계획 접근 계층.
 *
 * <p>두 묶음으로 나뉜다 — 계획 목록(기간/라인 검색)과 대시보드용 합계(라인별·월별).
 * 엔티티 별칭은 {@code plan} 으로 통일했다.
 */
@Repository
public interface ProductionPlanRepository extends JpaRepository<ProductionPlan, Long> {

  // ── 대시보드 집계 ─────────────────────────────────────────────

  /** 기간 내 월별 계획수량(planQty) 합계. 값이 없으면 0. */
  @Query("""
      select month(plan.planDate) as month,
             coalesce(sum(plan.planQty), 0) as qty
        from ProductionPlan plan
       where plan.planDate between :dateFrom and :dateTo
       group by month(plan.planDate)
      """)
  List<MonthlySum> sumPlanQtyGroupByMonth(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo);

  /** 기간 내 라인별 계획수량(planQty) 합계. 값이 없으면 0. */
  @Query("""
      select plan.lineName as lineName,
             coalesce(sum(plan.planQty), 0) as qty
        from ProductionPlan plan
       where plan.planDate between :dateFrom and :dateTo
       group by plan.lineName
      """)
  List<LineSum> sumPlanQtyGroupByLine(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo);

  // ── 목록 조회 ────────────────────────────────────────────────

  /** 검색 조건이 없는 기본 목록 — 계획일 내림차순(파생 쿼리). */
  List<ProductionPlan> findAllByOrderByPlanDateDesc();

  /**
   * 기간(dateFrom~dateTo)·라인(lineSq) 조건의 계획 목록.
   * 세 조건은 각각 null 이면 무시되므로 시작일/종료일을 한쪽만 넣어도 동작한다.
   * 결과는 계획일 → 라인 → 시작시각 순(모두 오름차순)으로 정렬한다.
   */
  @Query("""
      select plan
        from ProductionPlan plan
       where (:lineSq   is null or plan.lineSq = :lineSq)
         and (:dateFrom is null or plan.planDate >= :dateFrom)
         and (:dateTo   is null or plan.planDate <= :dateTo)
       order by plan.planDate asc, plan.lineSq asc, plan.startTime asc
      """)
  List<ProductionPlan> findBySearchCondition(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo,
      @Param("lineSq") Long lineSq);

  interface LineSum {
    String getLineName();
    Long getQty();
  }

  interface MonthlySum {
    Integer getMonth();
    Long getQty();
  }
}
