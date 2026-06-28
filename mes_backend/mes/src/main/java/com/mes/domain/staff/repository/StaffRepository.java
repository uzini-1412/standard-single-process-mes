package com.mes.domain.staff.repository;

import com.mes.domain.staff.entity.Staff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 직원(mes_staffinfo_tb) 영속화.
 * 검색은 최고관리자(seed) 계정을 항상 배제하고, 조건은 전부 "null 이면 무시"하는 동적 필터다.
 */
@Repository
public interface StaffRepository extends JpaRepository<Staff, Long> {

  /** 사번 중복 여부. */
  boolean existsByStaffNo(String staffNo);

  /** 로그인 아이디 중복 여부. */
  boolean existsByUserId(String userId);

  /**
   * 로그인용 아이디 단건 조회. user_id 에 UNIQUE 제약이 없어 시드 누적 등으로 같은 아이디가
   * 여러 행 존재할 수 있으므로, 가장 최근 staff_sq(=마지막 INSERT) 행 하나만 취해 충돌을 피한다.
   */
  Optional<Staff> findFirstByUserIdOrderByStaffSqDesc(String userId);

  /**
   * 조건부 직원 검색.
   *  - 최고관리자 시드(role=ROLE_ADMIN / userId=admin / staffNo=administrator)는 항상 제외.
   *  - includeRetired=true 일 때만 퇴사자(leaveDate 존재)를 포함, 그 외에는 재직자만.
   *  - keyword/부서/직급/직종/사용여부는 값이 있을 때만 AND 로 추가되는 선택 조건.
   */
  @Query("""
      SELECT s FROM Staff s
       WHERE (s.role   IS NULL OR s.role   <> 'ROLE_ADMIN')
         AND (s.userId IS NULL OR s.userId <> 'admin')
         AND (s.staffNo IS NULL OR LOWER(s.staffNo) <> 'administrator')
         AND (:includeRetired = TRUE OR s.leaveDate IS NULL)
         AND (:keyword  IS NULL OR s.staffName LIKE %:keyword% OR s.staffNo LIKE %:keyword%)
         AND (:dept     IS NULL OR s.dept     = :dept)
         AND (:position IS NULL OR s.position = :position)
         AND (:jobType  IS NULL OR s.jobType  = :jobType)
         AND (:useGb    IS NULL OR s.useGb    = :useGb)
       ORDER BY s.staffNo ASC
      """)
  List<Staff> findBySearchCondition(
      @Param("keyword") String keyword,
      @Param("dept") String dept,
      @Param("position") String position,
      @Param("jobType") String jobType,
      @Param("useGb") Boolean useGb,
      @Param("includeRetired") Boolean includeRetired);

  /** 'SW-%' 패턴 사번을 내림차순으로 — 다음 채번 시 최댓값을 뽑는 데 쓴다. */
  @Query("SELECT s.staffNo FROM Staff s WHERE s.staffNo LIKE 'SW-%' ORDER BY s.staffNo DESC")
  List<String> findAllSwStaffNos();
}
