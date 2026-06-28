package com.mes.domain.facility.repository;

import com.mes.domain.facility.entity.FacilitySparePart;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface FacilitySparePartRepository extends JpaRepository<FacilitySparePart, Long> {

  /** 부품번호로 단건 조회. 첨부 재동기화 대상 존재 확인 등에 쓰인다. */
  @Query("select p from FacilitySparePart p where p.partNo = :partNo")
  Optional<FacilitySparePart> findByPartNo(@Param("partNo") String partNo);

  /**
   * 예비품 목록 조건 검색.
   *
   * <p>각 조건은 인자가 null 이면 무시한다. 키워드는 부품번호 또는 부품명 부분일치로 보고,
   * regDt 는 시각을 포함하므로 날짜 단위로 잘라 from/to 와 비교한다. 정렬은 PK 역순.</p>
   */
  @Query("""
      select p
      from FacilitySparePart p
      where p.useYn = true
        and (
          :keyword is null
          or p.partNo like concat('%', :keyword, '%')
          or p.partNm like concat('%', :keyword, '%')
        )
        and (:fromDate is null or cast(p.regDt as date) >= :fromDate)
        and (:toDate   is null or cast(p.regDt as date) <= :toDate)
      order by p.sparePartSq desc
      """)
  List<FacilitySparePart> findBySearchCondition(
      @Param("keyword") String keyword,
      @Param("fromDate") LocalDate dateFrom,
      @Param("toDate") LocalDate dateTo);

  /** 부품번호 기준 이미지 경로(JSON) 일괄 갱신. */
  @Modifying
  @Query("update FacilitySparePart p set p.imgPaths = :imgPaths where p.partNo = :partNo")
  int updateImgPathsByPartNo(@Param("partNo") String partNo, @Param("imgPaths") String imgPaths);
}
