package com.mes.domain.user.repository;

import com.mes.domain.user.entity.StaffMenuAuth;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 직원-메뉴 접근권한(mes_staff_menu_auth_tb) 영속화.
 * 한 직원의 권한행 전체를 한 번에 읽어 menuSq 기준으로 다루는 upsert 패턴을 쓴다.
 */
@Repository
public interface StaffMenuAuthRepository extends JpaRepository<StaffMenuAuth, Long> {

  /** 직원 1명의 전체 권한행 — 상세조회/저장 시 menuSq 맵으로 인덱싱해 사용. */
  List<StaffMenuAuth> findByStaffSq(Long staffSq);

  /** 선택한 직원들의 권한행을 일괄 제거(계정 삭제 시). */
  void deleteByStaffSqIn(List<Long> staffSqs);
}
