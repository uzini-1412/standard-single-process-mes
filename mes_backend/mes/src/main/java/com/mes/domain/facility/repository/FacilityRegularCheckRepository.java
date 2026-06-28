package com.mes.domain.facility.repository;

import com.mes.domain.facility.entity.FacilityRegularCheck;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FacilityRegularCheckRepository extends JpaRepository<FacilityRegularCheck, Long> {

  /**
   * 폐기되지 않은 정기점검 내역을 계획일 기준 최신순으로 조회한다.
   * 설비 PK 를 넘기지 않으면(null) 전체 설비의 정기점검을 한꺼번에 본다.
   * 같은 계획일이 여럿이면 PK 역순으로 가장 최근 등록 건을 위로 올린다.
   */
  @Query("""
      SELECT rc
      FROM FacilityRegularCheck rc
      WHERE rc.useYn = true
        AND (:facilitySq IS NULL OR rc.facilitySq = :facilitySq)
      ORDER BY rc.planDate DESC, rc.regularCheckSq DESC
      """)
  List<FacilityRegularCheck> findBySearchCondition(@Param("facilitySq") Long facilitySq);
}
