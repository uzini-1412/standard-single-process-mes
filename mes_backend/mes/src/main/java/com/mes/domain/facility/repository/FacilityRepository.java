package com.mes.domain.facility.repository;

import com.mes.domain.facility.entity.Facility;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FacilityRepository extends JpaRepository<Facility, Long> {

  /**
   * 설비 목록 검색(폐기되지 않은 설비만, use_yn=1).
   *
   * <p>정렬 의도는 설비를 라인 단위로 보기 좋게 묶는 것이다.</p>
   * <ol>
   *   <li>라인명(line_nm) 접두 그룹: 'P*' 먼저, 그 다음 'C*', 나머지는 마지막.</li>
   *   <li>같은 그룹 안에서는 접두 알파벳 뒤의 숫자를 정수로 해석해 오름차순(P2 가 P10 보다 앞).</li>
   *   <li>라인까지 같으면 관리번호(manage_no) 오름차순으로 안정 정렬.</li>
   * </ol>
   * 라인이 P4·C3 식으로 늘어나도 CASE 분기를 손대지 않고 그대로 정렬된다.
   * 키워드는 관리번호/설비명을 대소문자 무시로 부분 매칭한다.
   */
  @Query(value = """
      SELECT f.*
      FROM mes_facility_tb f
      WHERE f.use_yn = 1
        AND (:facilityType IS NULL OR f.facility_type = :facilityType)
        AND (:lineSq IS NULL OR f.line_sq = :lineSq)
        AND (
          :keyword IS NULL
          OR LOWER(f.manage_no)     LIKE LOWER(CONCAT('%', :keyword, '%'))
          OR LOWER(f.facility_name) LIKE LOWER(CONCAT('%', :keyword, '%'))
        )
      ORDER BY
        CASE
          WHEN f.line_nm LIKE 'P%' THEN 1
          WHEN f.line_nm LIKE 'C%' THEN 2
          ELSE 3
        END,
        CAST(SUBSTRING(f.line_nm, 2) AS UNSIGNED),
        f.manage_no ASC
      """,
      nativeQuery = true)
  List<Facility> findBySearchCondition(
      @Param("facilityType") String facilityType,
      @Param("lineSq") Long lineSq,
      @Param("keyword") String keyword);

  /** 관리번호로 설비 단건을 조회한다(업로드 정합성 보정 등 외부 도메인에서도 사용). */
  Optional<Facility> findByManageNo(String manageNo);

  /** 이미지 경로(JSON)를 관리번호 기준으로 일괄 갱신. 첨부 재동기화 배치에서 호출된다. */
  @Modifying
  @Query("update Facility f set f.imgPaths = :imgPaths where f.manageNo = :manageNo")
  int updateImgPathsByManageNo(@Param("manageNo") String manageNo, @Param("imgPaths") String imgPaths);
}
