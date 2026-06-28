package com.mes.domain.auth.service;

import com.mes.domain.activitylog.service.UserActivityLogService;
import com.mes.domain.auth.dto.AuthDto;
import com.mes.domain.staff.entity.Staff;
import com.mes.domain.staff.repository.StaffRepository;
import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;
import com.mes.global.security.jwt.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthService {

  private final StaffRepository staffRepository;
  private final JwtTokenProvider jwtTokenProvider;
  private final PasswordEncoder passwordEncoder;
  private final UserActivityLogService activityLogService;

  /**
   * 로그인 비즈니스 로직
   */
  @Transactional
  public AuthDto.LoginRes login(AuthDto.LoginReq request) {

    // 1. ID 조회 — 동일 user_id 중복 행이 있을 수 있어 가장 최근 행을 사용
    Staff staff = staffRepository.findFirstByUserIdOrderByStaffSqDesc(request.getUserId())
        .orElse(null);
    if (staff == null) {
      recordFailure(request.getUserId(), null, "가입되지 않은 아이디");
      throw new CustomException(ErrorCode.AUTH_UNAUTHORIZED, "가입되지 않은 아이디입니다.");
    }

    // 2. 비밀번호 검증
    if (!passwordEncoder.matches(request.getPassword(), staff.getUserPw())) {
      recordFailure(request.getUserId(), staff, "비밀번호 불일치");
      throw new CustomException(ErrorCode.AUTH_UNAUTHORIZED, "비밀번호가 일치하지 않습니다.");
    }

    // 2-1. 계정 활성 여부 검증 — 막혀 있으면 사유를 로그로 남기고 차단
    String blockReason = loginBlockReason(staff);
    if (blockReason != null) {
      recordFailure(request.getUserId(), staff, blockReason);
      throw new CustomException(ErrorCode.AUTH_ACCOUNT_DISABLED);
    }

    // 3. 토큰 발급 후 성공 로그 기록 (role 은 String 그대로 사용)
    String token = jwtTokenProvider.createToken(staff.getUserId(), staff.getRole());
    activityLogService.recordLogin(staff.getUserId(), staff.getStaffSq(),
        staff.getStaffName(), true, null);

    // 4. 응답 반환
    return new AuthDto.LoginRes(
        token,
        staff.getUserId(),
        staff.getStaffName(),
        staff.getRole(),
        staff.getStaffSq(),
        staff.getStaffNo());
  }

  /**
   * 로그인을 막아야 하면 그 사유 문구를, 통과면 null 을 반환.
   *  - useGb 가 명시적 false 면 "사용 중지된 계정"(null 은 잠금으로 보지 않음).
   *  - leaveDate 가 오늘보다 이후가 아니면(=오늘 포함 과거) "퇴사 처리된 계정".
   * 사용 중지를 퇴사보다 우선 판정한다(기존 동작 유지).
   */
  private String loginBlockReason(Staff staff) {
    if (Boolean.FALSE.equals(staff.getUseGb())) {
      return "사용 중지된 계정";
    }
    LocalDate leaveDate = staff.getLeaveDate();
    if (leaveDate != null && !leaveDate.isAfter(LocalDate.now())) {
      return "퇴사 처리된 계정";
    }
    return null;
  }

  /** 로그인 실패 활동 로그를 남긴다. staff 가 null 이면(미존재 아이디) 식별자 없이 기록. */
  private void recordFailure(String userId, Staff staff, String reason) {
    activityLogService.recordLogin(
        userId,
        staff != null ? staff.getStaffSq() : null,
        staff != null ? staff.getStaffName() : null,
        false,
        reason);
  }

  /**
   * 로그아웃 — JWT는 stateless라 서버 측 무효화는 없음. 활동 로그 기록만 남긴다.
   * reason에 따라 action_type을 LOGOUT/LOGOUT_TIMEOUT/LOGOUT_EXPIRED로 분기.
   * SecurityContext에서 user를 못 잡으면(토큰 만료) req의 fallback userId/staff 정보로 기록한다.
   *
   * 클래스 @Transactional(readOnly=true)을 덮어쓰지 않으면 활동 로그 INSERT가 실패하므로 명시.
   */
  @Transactional
  public void logout(AuthDto.LogoutReq req) {
    String reason = req != null ? req.getReason() : null;
    String actionType;
    if ("SESSION_TIMEOUT".equals(reason)) {
      actionType = com.mes.domain.activitylog.entity.ActivityActionType.LOGOUT_TIMEOUT;
    } else if ("TOKEN_EXPIRED".equals(reason)) {
      actionType = com.mes.domain.activitylog.entity.ActivityActionType.LOGOUT_EXPIRED;
    } else {
      actionType = com.mes.domain.activitylog.entity.ActivityActionType.LOGOUT;
    }

    String fallbackUserId = req != null ? req.getUserId() : null;
    Long fallbackStaffSq = req != null ? req.getStaffSq() : null;
    String fallbackStaffName = req != null ? req.getStaffName() : null;

    activityLogService.recordLogout(actionType, fallbackUserId, fallbackStaffSq, fallbackStaffName);
  }
}