package com.mes.domain.facility.repository;

import com.mes.domain.facility.entity.FacilityDailyCheck;
import com.mes.domain.quality.entity.InspectionResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface FacilityDailyCheckRepository extends JpaRepository<FacilityDailyCheck, Long> {

  /**
   * 일상점검 현황 검색.
   *
   * <p>네 가지 조건(점검일 시작/끝, 설비, 판정결과)은 모두 독립적으로 적용 가능한 선택 필터이며,
   * 인자가 null 이면 그 조건은 무시한다. from·to 는 한쪽만 들어와도 동작한다.
   * 정렬은 점검일 최신 → 설비 → 점검항목 순서로 그리드 가독성을 맞춘다.</p>
   */
  @Query("""
      SELECT d
      FROM FacilityDailyCheck d
      WHERE (:fromDate   IS NULL OR d.checkDate    >= :fromDate)
        AND (:toDate     IS NULL OR d.checkDate    <= :toDate)
        AND (:facilitySq IS NULL OR d.facilitySq    = :facilitySq)
        AND (:result     IS NULL OR d.checkResult   = :result)
      ORDER BY d.checkDate DESC, d.facilitySq ASC, d.checkItemSq ASC
      """)
  List<FacilityDailyCheck> findBySearchCondition(
      @Param("facilitySq") Long facilitySq,
      @Param("fromDate") LocalDate dateFrom,
      @Param("toDate") LocalDate dateTo,
      @Param("result") InspectionResult checkResult);

  /**
   * (설비, 점검일, 점검항목) 세 값을 합친 자연키로 단건을 찾는다.
   * Upsert 저장 시 같은 날 같은 항목의 중복 행을 막으려고 먼저 호출한다.
   */
  Optional<FacilityDailyCheck> findByFacilitySqAndCheckDateAndCheckItemSq(
      Long facilitySq, LocalDate checkDate, Long checkItemSq);
}
