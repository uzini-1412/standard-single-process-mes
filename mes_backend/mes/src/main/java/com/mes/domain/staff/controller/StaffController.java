package com.mes.domain.staff.controller;

import com.mes.domain.staff.dto.StaffDto;
import com.mes.domain.staff.service.StaffService;
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
 * 직원정보관리(/api/staff): 인사 정보 등록/수정/조회.
 * 로그인 계정·메뉴 권한은 별도로 UserAuthController(/api/user)가 담당한다.
 */
@RestController
@RequestMapping("/api/staff")
@RequiredArgsConstructor
@Tag(name = "03. 직원 관리", description = "직원 정보 등록/수정/조회 API")
public class StaffController {

  private final StaffService staffService;

  @Operation(summary = "다음 사번 조회", description = "SW-XXX 형식의 다음 사번을 반환합니다.")
  @GetMapping("/next-no")
  public String getNextStaffNo() {
    return staffService.getNextStaffNo();
  }

  @Operation(summary = "직원 목록 조회", description = "조건에 맞는 직원 목록을 조회합니다. (POST 방식)")
  @PostMapping("/list")
  public List<StaffDto.Res> getStaffList(@RequestBody StaffDto.SearchReq requestDto) {
    return staffService.getList(requestDto);
  }

  @Operation(summary = "직원 일괄 등록", description = "여러 직원의 정보를 한 번에 등록합니다.")
  @PostMapping("/save")
  public ApiCommonResponse<Void> saveStaffList(@RequestBody @Valid List<StaffDto.SaveReq> requestDtos) {
    requireNonEmpty(requestDtos, "저장할 데이터가 없습니다.");
    staffService.saveStaffList(requestDtos);
    return ApiCommonResponse.success("직원 정보가 등록되었습니다.", null);
  }

  @Operation(summary = "직원 일괄 수정", description = "체크된 직원의 정보를 일괄 수정합니다.")
  @PutMapping("/update")
  public ApiCommonResponse<Void> updateStaffList(@RequestBody @Valid List<StaffDto.UpdateReq> requestDtos) {
    requireNonEmpty(requestDtos, "수정할 데이터가 없습니다.");
    staffService.updateStaffList(requestDtos);
    return ApiCommonResponse.success("직원 정보가 수정되었습니다.", null);
  }

  @Operation(summary = "직원 일괄 삭제", description = "선택한 직원을 삭제합니다.")
  @PostMapping("/delete")
  public ApiCommonResponse<Void> deleteStaffList(@RequestBody StaffDto.DeleteReq requestDto) {
    staffService.deleteStaffList(requestDto);
    return ApiCommonResponse.success("직원 정보가 삭제되었습니다.", null);
  }

  /** 일괄 처리용 본문이 비어 있으면 400. */
  private void requireNonEmpty(List<?> rows, String message) {
    if (rows == null || rows.isEmpty()) {
      throw new CustomException(ErrorCode.COMMON_BAD_REQUEST, message);
    }
  }
}
