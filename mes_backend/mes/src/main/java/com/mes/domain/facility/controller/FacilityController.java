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

import com.mes.domain.facility.dto.FacilityDto;
import com.mes.domain.facility.service.FacilityService;
import com.mes.global.response.ApiCommonResponse;

import java.util.List;

/**
 * 설비 마스터(설비정보) 엔드포인트 모음.
 *
 * <p>여기에 적재된 설비 레코드는 일상점검/정기점검/이력/예비품 등
 * 설비 도메인 하위 화면 전반에서 기준 데이터로 끌어다 쓰기 때문에,
 * 사실상 설비관리의 루트 컨트롤러 역할을 한다.</p>
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "24. 설비 관리", description = "설비 마스터 정보 등록 및 조회 API")
@RequestMapping("/api/facility")
public class FacilityController {

  private final FacilityService facilityService;

  // ===== 조회 계열 =====

  @PostMapping("/list")
  @Operation(summary = "설비 정보 목록 조회", description = "검색 파라미터로 필터링한 설비 목록을 내려준다. (Redis 캐시 경유)")
  public List<FacilityDto.Res> fetchList(@RequestBody FacilityDto.SearchReq condition) {
    List<FacilityDto.Res> rows = facilityService.getFacilityList(condition);
    return rows;
  }

  @PostMapping("/detail")
  @Operation(summary = "설비 정보 상세 조회", description = "설비 식별키(PK) 한 건에 대한 상세 정보를 반환한다.")
  public FacilityDto.Res fetchOne(@RequestBody FacilityDto.DetailReq condition) {
    Long facilityKey = condition.getFacilitySq();
    return facilityService.getFacilityDetail(facilityKey);
  }

  // ===== 변경 계열 =====

  @PostMapping("/save")
  @Operation(summary = "설비 정보 일괄 저장", description = "배열로 전달된 설비 정보를 신규/수정 구분 없이 한 번에 반영한다.")
  public ApiCommonResponse<Void> upsert(@RequestBody @Valid List<FacilityDto.SaveReq> payload) {
    if (payload == null || payload.isEmpty()) {
      throw new CustomException(ErrorCode.COMMON_BAD_REQUEST, "저장할 데이터가 없습니다.");
    }
    facilityService.saveFacilities(payload);
    return ApiCommonResponse.success("설비 정보가 성공적으로 저장되었습니다.", null);
  }

  @PostMapping("/delete")
  @Operation(summary = "설비 정보 삭제", description = "사용자가 선택한 설비들을 일괄 제거한다.")
  public ApiCommonResponse<Void> remove(@RequestBody FacilityDto.DeleteReq command) {
    facilityService.deleteFacilities(command);
    return ApiCommonResponse.success("선택한 설비가 삭제되었습니다.", null);
  }
}
