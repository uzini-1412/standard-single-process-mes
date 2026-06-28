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

import com.mes.domain.facility.dto.FacilityRegularCheckDto;
import com.mes.domain.facility.service.FacilityRegularCheckService;
import com.mes.global.response.ApiCommonResponse;

import java.util.List;

/**
 * 설비 정기점검(계획 수립 및 실시 결과) 관리 엔드포인트.
 *
 * <p>주기적으로 수행하는 정기점검의 계획과 그 실시 내역을
 * 조회·저장·삭제한다.</p>
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "27. 설비 정기점검", description = "설비 정기점검 계획 및 결과 관리 API")
@RequestMapping("/api/facility/regular-check")
public class FacilityRegularCheckController {

  private final FacilityRegularCheckService regularCheckService;

  // == 조회 ==
  @PostMapping("/list")
  @Operation(summary = "정기점검 목록 조회", description = "등록되어 있는 정기점검 내역을 조회한다. (Redis 경유)")
  public List<FacilityRegularCheckDto.Res> fetchChecks(
      @RequestBody FacilityRegularCheckDto.SearchReq condition) {
    return regularCheckService.getRegularChecks(condition);
  }

  // == 저장 ==
  @PostMapping("/save")
  @Operation(summary = "정기점검 일괄 저장", description = "정기점검 내역을 한 건 또는 여러 건으로 신규/수정한다.")
  public ApiCommonResponse<Void> persistChecks(
      @RequestBody @Valid List<FacilityRegularCheckDto.SaveReq> payload) {
    if (isBlank(payload)) {
      throw new CustomException(ErrorCode.COMMON_BAD_REQUEST, "저장할 데이터가 없습니다.");
    }
    regularCheckService.saveRegularChecks(payload);
    return ApiCommonResponse.success("정기점검 정보가 저장되었습니다.", null);
  }

  // == 삭제 ==
  @PostMapping("/delete")
  @Operation(summary = "정기점검 삭제", description = "선택한 정기점검 내역을 일괄 제거한다.")
  public ApiCommonResponse<Void> removeChecks(@RequestBody FacilityRegularCheckDto.DeleteReq command) {
    regularCheckService.deleteRegularChecks(command);
    return ApiCommonResponse.success("선택한 점검 내역이 삭제되었습니다.", null);
  }

  /** 전달된 저장 본문이 비어 있는지(null 이거나 원소가 하나도 없는지) 확인한다. */
  private boolean isBlank(List<?> items) {
    return items == null || items.isEmpty();
  }
}
