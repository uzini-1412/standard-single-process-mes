package com.mes.domain.commoninfo.repository;

import com.mes.domain.commoninfo.entity.CommonDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 세부항목(CommonDetail) 영속 계층.
 * 목록/단건 조회 시 N+1 을 피하기 위해 분류·내용 값을 fetch join 으로 함께 끌어온다.
 */
@Repository
public interface CommonDetailRepository extends JpaRepository<CommonDetail, Long> {

  // ── 관리 화면용 조회 (commoninfo 내부 전용) ───────────────────────────

  /**
   * 분류코드 + 사용여부 조건으로 세부항목 목록을 가져온다.
   * groupCode 가 비어 있으면 전체, useYn 이 null 이면 사용여부 무관.
   */
  @Query("""
      SELECT DISTINCT d FROM CommonDetail d
      JOIN FETCH d.commonGroup grp
      LEFT JOIN FETCH d.values
      WHERE (:groupCode IS NULL OR :groupCode = '' OR grp.groupCode = :groupCode)
        AND (:useYn IS NULL OR d.useYn = :useYn)
      ORDER BY d.detailCode ASC, d.detailSq ASC
      """)
  List<CommonDetail> searchForGrid(@Param("groupCode") String groupCode,
                                   @Param("useYn") Boolean useYn);

  /** PK 로 세부항목 한 건을 분류·내용 값까지 한 번에 적재한다. */
  @Query("""
      SELECT DISTINCT d FROM CommonDetail d
      JOIN FETCH d.commonGroup
      LEFT JOIN FETCH d.values
      WHERE d.detailSq = :detailSq
      """)
  Optional<CommonDetail> fetchOneWithValues(@Param("detailSq") Long detailSq);

  // ── 타 도메인이 분류값을 소비할 때 쓰는 조회 (시그니처 동결) ──────────

  /**
   * 항목명(groupName) + 사용여부로 조회 (대시보드 드롭다운/라인구분 등).
   */
  @Query("SELECT DISTINCT d FROM CommonDetail d " +
          "JOIN FETCH d.commonGroup g " +
          "LEFT JOIN FETCH d.values " +
          "WHERE g.groupName = :groupName " +
          "AND d.useYn = :useYn " +
          "ORDER BY d.detailCode ASC, d.detailSq ASC")
  List<CommonDetail> findByGroupNameAndUseYn(
          @Param("groupName") String groupName,
          @Param("useYn") Boolean useYn);

  /**
   * 항목명(groupName) + 세부항목명(detailName)으로 단건 조회.
   * 비즈니스 규칙을 코드에 하드코딩하는 대신, 공통정보에 정의된 detailCode를
   * 읽어 쓰기 위한 용도. (예: "제품구분"의 "니들펀칭" → detailCode "NP")
   */
  @Query("SELECT d FROM CommonDetail d " +
          "JOIN d.commonGroup g " +
          "WHERE g.groupName = :groupName " +
          "AND d.detailName = :detailName")
  Optional<CommonDetail> findByGroupNameAndDetailName(
          @Param("groupName") String groupName,
          @Param("detailName") String detailName);
}
