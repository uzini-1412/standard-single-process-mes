package com.mes.domain.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** 인증(/api/auth) 로그인·로그아웃 요청/응답 묶음. */
public class AuthDto {

  /** 로그인 요청(아이디/비밀번호). */
  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "로그인 요청 DTO")
  public static class LoginReq {
    @NotBlank(message = "아이디를 입력해주세요.")
    @Schema(description = "사용자 ID", example = "mesadmin")
    private String userId;

    @NotBlank(message = "비밀번호를 입력해주세요.")
    @Schema(description = "비밀번호", example = "ChangeMe!2026")
    private String password;
  }

  /**
   * 로그아웃 요청. reason 으로 수동/타임아웃/토큰만료를 구분한다.
   * 토큰이 이미 만료되면 SecurityContext 에서 사용자를 못 잡으므로,
   * 프론트가 보관 중인 userId/staffSq/staffName 을 fallback 으로 함께 보낸다.
   */
  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "로그아웃 요청 DTO")
  public static class LogoutReq {
    @Schema(description = "사유: MANUAL/SESSION_TIMEOUT/TOKEN_EXPIRED", example = "MANUAL")
    private String reason;

    @Schema(description = "사용자 ID (토큰 만료 시 fallback)")
    private String userId;

    @Schema(description = "직원 SQ (fallback)")
    private Long staffSq;

    @Schema(description = "직원명 (fallback)")
    private String staffName;
  }

  /** 로그인 응답(불변 record) — 발급 토큰 + 화면 표시에 필요한 직원 식별 정보. */
  @Schema(description = "로그인 응답 DTO")
  public record LoginRes(
      @Schema(description = "JWT 액세스 토큰") String token,
      @Schema(description = "사용자 ID") String userId,
      @Schema(description = "사용자 이름") String userName,
      @Schema(description = "권한 등급") String role,
      @Schema(description = "직원 PK") Long staffSq,
      @Schema(description = "직원 번호") String staffNo) {
  }
}