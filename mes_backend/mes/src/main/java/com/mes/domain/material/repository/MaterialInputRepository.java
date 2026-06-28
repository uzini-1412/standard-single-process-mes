package com.mes.domain.material.repository;

import com.mes.domain.material.entity.MaterialInput;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * 원소재 투입 실적(헤더) 저장소. 목록/연집계 조회와 저장 시 교체용 단건 lookup을 제공한다.
 */
@Repository
public interface MaterialInputRepository extends JpaRepository<MaterialInput, Long> {

  /**
   * 저장 시 동일 (작업일·라인·품목) 실적이 이미 있으면 교체하기 위한 단건 lookup.
   * 파생 쿼리라 메서드명이 곧 조건이다.
   */
  Optional<MaterialInput> findByWorkDateAndLineSqAndItemSq(LocalDate workDate, Long lineSq, Long itemSq);

  /**
   * 연도별 사용량 집계용 — 한 해치를 품목·작업일 순으로 끌어와 서비스단에서 월별로 접는다.
   * 품목은 선택 필터(null이면 전체).
   */
  @Query("""
      SELECT inp
      FROM MaterialInput inp
      WHERE FUNCTION('YEAR', inp.workDate) = :year
        AND (:itemSq IS NULL OR inp.itemSq = :itemSq)
      ORDER BY inp.itemSq, inp.workDate
      """)
  List<MaterialInput> findByYearAndItem(@Param("year") Integer year,
                                        @Param("itemSq") Long itemSq);

  /**
   * 투입 실적(Raw) 목록. 기간·라인·품목은 전부 선택 필터이고,
   * 정렬은 작업일 내림차순 후 라인 오름차순으로 고정한다.
   */
  @Query("""
      SELECT inp
      FROM MaterialInput inp
      WHERE (:dateFrom IS NULL OR inp.workDate >= :dateFrom)
        AND (:dateTo   IS NULL OR inp.workDate <= :dateTo)
        AND (:lineSq   IS NULL OR inp.lineSq = :lineSq)
        AND (:itemSq   IS NULL OR inp.itemSq = :itemSq)
      ORDER BY inp.workDate DESC, inp.lineSq ASC
      """)
  List<MaterialInput> findRawDataList(@Param("dateFrom") LocalDate dateFrom,
                                      @Param("dateTo") LocalDate dateTo,
                                      @Param("lineSq") Long lineSq,
                                      @Param("itemSq") Long itemSq);
}
