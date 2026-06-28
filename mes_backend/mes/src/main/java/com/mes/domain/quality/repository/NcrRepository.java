package com.mes.domain.quality.repository;

import com.mes.domain.quality.entity.Ncr;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * 부적합(NCR) 영속 계층.
 */
@Repository
public interface NcrRepository extends JpaRepository<Ncr, Long> {

  /**
   * 발생분류 + LOT번호 매칭. 출하검사 연동 자동 삭제/재등록에서 사용.
   */
  List<Ncr> findByOccurTypeAndLotNo(String occurType, String lotNo);

  /**
   * 발생분류 + 품목 매칭.
   */
  List<Ncr> findByOccurTypeAndItemSq(String occurType, Long itemSq);

  /**
   * 특정 LOT에 묶인 부적합 이력.
   */
  List<Ncr> findByLotNo(String lotNo);

  /**
   * 부적합 현황 검색. 발생일자 구간은 시작/종료 각각 단독 지정도 허용하며,
   * occurType이 null이면 유형 무관 전체, 값이 있으면 해당 유형만 조회한다.
   */
  @Query("""
      SELECT n FROM Ncr n
      WHERE (:dateFrom IS NULL OR n.occurDate >= :dateFrom)
        AND (:dateTo IS NULL OR n.occurDate <= :dateTo)
        AND (:occurType IS NULL OR n.occurType = :occurType)
      ORDER BY n.occurDate DESC, n.ncrSq DESC
      """)
  List<Ncr> findBySearchCondition(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo,
      @Param("occurType") String occurType);
}
