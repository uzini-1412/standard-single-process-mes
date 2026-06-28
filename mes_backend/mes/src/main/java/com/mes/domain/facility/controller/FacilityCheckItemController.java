package com.mes.domain.facility.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mes.domain.facility.dto.FacilityCheckItemDto;
import com.mes.domain.facility.service.FacilityCheckItemService;
import com.mes.global.response.ApiCommonResponse;

import java.util.List;

/**
 * 설비별 일상점검 기준(점검항목) 정의 엔드포인트.
 *
 * <p>일상점검정의서 화면에서 설비마다 어떤 항목을 어떻게 점검할지
 * 그 템플릿을 등록/조회/삭제하는 역할을 한다. 실제 점검 결과 입력은
 * 별도의 일상점검 결과 컨트롤러가 담당한다.</p>
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "25. 설비 일상점검항목", description = "설비별 점검항목(기준) 정의 API")
@RequestMapping("/api/facility/check-item")
public class FacilityCheckItemController {

  private final FacilityCheckItemService checkItemService;

  // [조회] 점검항목 목록
  @PostMapping("/list")
  @Operation(summary = "점검항목 목록 조회", description = "특정 설비에 정의된 점검항목 목록을 가져온다.")
  public List<FacilityCheckItemDto.Res> fetchItems(
      @RequestBody FacilityCheckItemDto.SearchReq condition) {
    return checkItemService.getCheckItems(condition);
  }

  // [저장] 점검항목 신규/수정
  @PostMapping("/save")
  @Operation(summary = "점검항목 일괄 저장", description = "설비 점검항목을 여러 건 한 번에 신규/수정한다.")
  public ApiCommonResponse<Void> persistItems(
      @RequestBody @Valid List<FacilityCheckItemDto.SaveReq> payload) {
    checkItemService.saveCheckItems(payload);
    return ApiCommonResponse.success("일상점검항목이 저장되었습니다.", null);
  }

  // [삭제] 점검항목 제거
  @PostMapping("/delete")
  @Operation(summary = "점검항목 삭제", description = "선택한 점검항목을 제거한다.")
  public ApiCommonResponse<Void> removeItems(@RequestBody FacilityCheckItemDto.DeleteReq command) {
    checkItemService.deleteCheckItems(command);
    return ApiCommonResponse.success("점검항목이 삭제되었습니다.", null);
  }
}
