package com.mes.global.init;

import com.mes.domain.staff.entity.Staff;
import com.mes.domain.staff.repository.StaffRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

  private final StaffRepository staffRepository;
  private final PasswordEncoder passwordEncoder;

  // 초기 관리자 계정 정보 — 운영에서는 환경변수로 주입(기본값은 로컬 데모용)
  @Value("${app.admin.default-id:mesadmin}")
  private String adminDefaultId;

  @Value("${app.admin.default-password:ChangeMe!2026}")
  private String adminDefaultPassword;

  @Override
  public void run(String... args) {
    // 부팅 시 기본 관리자 계정이 없으면 1회 시딩한다(이미 있으면 건너뜀).
    if (staffRepository.existsByUserId(adminDefaultId)) {
      log.info(">> [INIT] 기본 관리자 계정({}) 확인 — 이미 존재하여 시딩 생략", adminDefaultId);
      return;
    }

    staffRepository.save(buildDefaultAdmin());
    log.info(">> [INIT] 기본 관리자 계정 시딩 완료 (ID: {} / PW: ****)", adminDefaultId);
  }

  /** 로컬/데모 부팅용 기본 관리자 Staff 엔티티를 조립한다. ROLE_ADMIN 권한과 공통코드 기본값을 채운다. */
  private Staff buildDefaultAdmin() {
    return Staff.builder()
        .userId(adminDefaultId)
        .userPw(passwordEncoder.encode(adminDefaultPassword))
        .role("ROLE_ADMIN")
        .staffName("시스템최고관리자")
        .staffNo("ADMIN-001")
        // 공통코드 참조 컬럼 — 관리자용 기본값
        .jobType("ADMIN")
        .dept("ADMIN")
        .position("ADMIN")
        .nationality("KR")
        // 상태 플래그 / 가입일
        .signGb(false)
        .useGb(true)
        .joinDate(LocalDate.now())
        .build();
  }
}