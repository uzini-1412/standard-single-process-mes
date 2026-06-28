package com.mes.domain.facility.repository;

import com.mes.domain.facility.entity.FacilityHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface FacilityHistoryRepository extends JpaRepository<FacilityHistory, Long> {

  /**
   * 한 설비의 활성 이력을 발생일 최신순으로. 설비이력카드 B영역 채우기용.
   */
  @Query("select h from FacilityHistory h "
      + "where h.facilitySq = :facilitySq and h.useYn = true "
      + "order by h.occurDate desc")
  List<FacilityHistory> findByFacilitySqAndUseYnTrueOrderByOccurDateDesc(
      @Param("facilitySq") Long facilitySq);

  /**
   * 이력 현황 그리드 조건 검색. 설비/발생일 양끝은 모두 선택 조건이라
   * null 이면 건너뛴다. 발생일 → PK 내림차순 정렬.
   */
  @Query("""
      select h from FacilityHistory h
      where h.useYn = true
        and (:facilitySq is null or h.facilitySq = :facilitySq)
        and (:start is null or h.occurDate >= :start)
        and (:end   is null or h.occurDate <= :end)
      order by h.occurDate desc, h.historySq desc
      """)
  List<FacilityHistory> findBySearchCondition(
      @Param("facilitySq") Long facilitySq,
      @Param("start") LocalDate dateFrom,
      @Param("end") LocalDate dateTo);

  /**
   * 대시보드 신뢰성 지표용 기간 활성 이력. 양끝 날짜는 선택 조건이고
   * 집계는 애플리케이션단에서 수행한다.
   */
  @Query("""
      select h from FacilityHistory h
      where h.useYn = true
        and (:start is null or h.occurDate >= :start)
        and (:end   is null or h.occurDate <= :end)
      order by h.occurDate desc, h.historySq desc
      """)
  List<FacilityHistory> findInPeriod(
      @Param("start") LocalDate dateFrom,
      @Param("end") LocalDate dateTo);
}
