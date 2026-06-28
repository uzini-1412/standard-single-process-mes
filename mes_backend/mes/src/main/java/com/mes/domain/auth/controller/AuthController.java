package com.mes.domain.auth.controller;

import com.mes.domain.auth.dto.AuthDto;
import com.mes.domain.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/** 인증 API(/api/auth): 로그인 시 JWT 발급, 로그아웃 시 활동 로그 기록. 토큰 검증/폐기는 클라이언트·필터 책임. */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Auth (인증)", description = "로그인 및 토큰 관리 API")
public class AuthController {

  private final AuthService authService;

  @PostMapping("/login")
  @Operation(summary = "로그인", description = "ID/PW로 로그인하여 JWT 토큰을 발급받습니다.")
  public AuthDto.LoginRes login(@RequestBody AuthDto.LoginReq request) {
    // 인증·토큰 발급은 서비스에 위임하고, 응답 봉투는 ApiResponseAdvice 가 입힌다.
    return authService.login(request);
  }

  @PostMapping("/logout")
  @Operation(summary = "로그아웃",
      description = "활동 로그에 로그아웃 이력을 남깁니다. reason=MANUAL/SESSION_TIMEOUT/TOKEN_EXPIRED. JWT는 클라이언트에서 폐기합니다.")
  public Void logout(@RequestBody(required = false) AuthDto.LogoutReq request) {
    authService.logout(request);
    return null;
  }
}