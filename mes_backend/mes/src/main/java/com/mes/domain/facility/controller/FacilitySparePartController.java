package com.mes.domain.facility.controller;

import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mes.domain.facility.dto.FacilitySparePartDto;
import com.mes.domain.facility.service.FacilitySparePartService;
import com.mes.global.response.ApiCommonResponse;

import java.util.List;

/**
 * 설비 유지보수용 예비부품(스페어) 관리 엔드포인트.
 *
 * <p>설비 정비/교체 시 사용하는 예비 부품의 재고성 정보를
 * 등록·조회·삭제한다.</p>
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "29. 설비 예비품 관리", description = "설비 유지보수용 예비 부품 등록 및 조회 API")
@RequestMapping("/api/facility/spare-part")
public class FacilitySparePartController {

  private final FacilitySparePartService sparePartService;

  /* 조회 */
  @PostMapping("/list")
  @Operation(summary = "예비품 목록 조회", description = "검색 조건에 해당하는 예비품 정보를 조회한다. (Redis 경유)")
  public List<FacilitySparePartDto.Res> fetchSpareParts(
      @RequestBody FacilitySparePartDto.SearchReq condition) {
    return sparePartService.getSparePartList(condition);
  }

  /* 저장 */
  @PostMapping("/save")
  @Operation(summary = "예비품 일괄 저장", description = "예비품 정보를 한 건 또는 여러 건으로 신규/수정한다.")
  public ApiCommonResponse<Void> persistSpareParts(
      @RequestBody List<FacilitySparePartDto.SaveReq> payload) {
    if (payload == null || payload.isEmpty()) {
      throw new CustomException(ErrorCode.COMMON_BAD_REQUEST, "저장할 데이터가 없습니다.");
    }
    sparePartService.saveSpareParts(payload);
    return ApiCommonResponse.success("예비품 정보가 성공적으로 저장되었습니다.", null);
  }

  /* 삭제 */
  @PostMapping("/delete")
  @Operation(summary = "예비품 삭제", description = "선택한 예비품을 일괄 제거한다.")
  public ApiCommonResponse<Void> removeSpareParts(@RequestBody FacilitySparePartDto.DeleteReq command) {
    sparePartService.deleteSpareParts(command);
    return ApiCommonResponse.success("선택한 예비품이 삭제되었습니다.", null);
  }
}
