package com.mes.domain.user.controller;

import com.mes.domain.user.dto.UserAuthDto;
import com.mes.domain.user.service.UserAuthService;
import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;
import com.mes.global.response.ApiCommonResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 사용자정보관리(/api/user): 직원 계정(아이디/비밀번호)과 메뉴별 접근권한 관리.
 * 모든 엔드포인트가 PK를 본문으로 받는 POST 형태다.
 */
@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
@Tag(name = "04. 사용자 정보 관리", description = "계정 정보 및 메뉴 권한 관리 API")
public class UserAuthController {

  private final UserAuthService userAuthService;

  @Operation(summary = "사용자 계정 목록 조회", description = "전체 직원 목록(ROLE_ADMIN 제외)을 조회합니다.")
  @PostMapping("/list")
  public List<UserAuthDto.ListRes> getUserAuthList(@RequestBody UserAuthDto.SearchReq req) {
    return userAuthService.getUserAuthList(req.getKeyword());
  }

  @Operation(summary = "사용자 상세 조회", description = "직원의 계정 정보와 전체 메뉴별 권한 목록을 조회합니다.")
  @PostMapping("/detail")
  public UserAuthDto.Res getUserAuthDetail(@RequestBody UserAuthDto.DetailReq request) {
    return userAuthService.getUserAuthDetail(request.getStaffSq());
  }

  @Operation(summary = "사용자 정보 저장", description = "아이디/비밀번호 및 메뉴 권한을 저장합니다.")
  @PostMapping("/save")
  public ApiCommonResponse<Void> saveUserAuth(@RequestBody @Valid UserAuthDto.SaveReq request) {
    require(request.getStaffSq() != null, "직원 정보(PK)는 필수입니다.");
    userAuthService.saveUserAuth(request);
    return ApiCommonResponse.success("사용자 정보가 저장되었습니다.", null);
  }

  @Operation(summary = "사용여부 토글", description = "계정의 사용(로그인) 여부를 변경합니다. false 면 로그인이 차단됩니다.")
  @PostMapping("/use-status")
  public ApiCommonResponse<Void> updateUseStatus(@RequestBody UserAuthDto.UseStatusReq req) {
    require(req.getStaffSq() != null && req.getUseGb() != null, "직원 PK와 사용여부는 필수입니다.");
    userAuthService.updateUseStatus(req.getStaffSq(), req.getUseGb());
    return ApiCommonResponse.success("사용여부가 변경되었습니다.", null);
  }

  @Operation(summary = "사용자 계정 삭제", description = "선택한 직원의 계정 정보와 메뉴 권한을 삭제합니다.")
  @PostMapping("/delete")
  public ApiCommonResponse<Void> deleteUserAuth(@RequestBody UserAuthDto.DeleteReq req) {
    require(req.getStaffIds() != null && !req.getStaffIds().isEmpty(), "삭제할 데이터가 없습니다.");
    userAuthService.deleteUserAuth(req);
    return ApiCommonResponse.success("삭제되었습니다.", null);
  }

  /** 조건이 거짓이면 400(COMMON_BAD_REQUEST). */
  private void require(boolean condition, String message) {
    if (!condition) {
      throw new CustomException(ErrorCode.COMMON_BAD_REQUEST, message);
    }
  }
}
