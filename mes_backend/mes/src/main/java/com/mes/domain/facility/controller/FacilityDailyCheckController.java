package com.mes.domain.facility.controller;

import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mes.domain.facility.dto.FacilityDailyCheckDto;
import com.mes.domain.facility.service.FacilityDailyCheckService;
import com.mes.global.response.ApiCommonResponse;

import java.util.List;

/**
 * 설비 일상점검 결과 입력 및 현황 엔드포인트.
 *
 * <p>현장에서 작성한 일상점검 결과를 누적 저장하고,
 * 기간/설비 단위로 그 결과를 다시 조회하는 두 가지 동작을 제공한다.</p>
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "26. 설비 일상점검 결과", description = "설비 일상점검 결과 등록 및 현황 조회 API")
@RequestMapping("/api/facility/daily-check")
public class FacilityDailyCheckController {

  private final FacilityDailyCheckService dailyCheckService;

  // 조회: 일상점검 현황
  @PostMapping("/list")
  @Operation(summary = "일상점검 현황 조회", description = "기간과 설비를 기준으로 누적된 일상점검 결과를 조회한다. (Redis 경유)")
  public List<FacilityDailyCheckDto.Res> fetchResults(
      @RequestBody FacilityDailyCheckDto.SearchReq condition) {
    return dailyCheckService.getCheckResults(condition);
  }

  // 변경: 일상점검 결과 저장
  @PostMapping("/save")
  @Operation(summary = "일상점검 결과 일괄 저장", description = "여러 건의 점검 결과를 리스트로 받아 신규/수정으로 반영한다.")
  public ApiCommonResponse<Void> persistResults(
      @RequestBody @Valid List<FacilityDailyCheckDto.SaveReq> payload) {
    if (payload != null && !payload.isEmpty()) {
      dailyCheckService.saveCheckResults(payload);
      return ApiCommonResponse.success("일상점검 결과가 저장되었습니다.", null);
    }
    throw new CustomException(ErrorCode.COMMON_BAD_REQUEST, "저장할 점검 결과 데이터가 없습니다.");
  }
}
