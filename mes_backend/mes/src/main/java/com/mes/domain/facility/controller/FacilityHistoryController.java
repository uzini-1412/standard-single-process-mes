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

import com.mes.domain.facility.dto.FacilityHistoryDto;
import com.mes.domain.facility.service.FacilityHistoryService;
import com.mes.global.response.ApiCommonResponse;

import java.util.List;

/**
 * 설비 고장/수리 이력 엔드포인트 모음.
 *
 * <p>이 컨트롤러는 두 개의 화면이 함께 사용한다.
 * 하나는 이력을 그리드로 보여주는 일반 이력관리 화면이고,
 * 다른 하나는 설비 한 대를 기준으로 마스터 정보와 이력을 묶어
 * 카드 형태로 출력하는 이력카드 화면이다.</p>
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "28. 설비 이력 및 이력카드", description = "설비 고장/수리 이력 관리 및 이력카드 출력 API")
@RequestMapping("/api/facility/history")
public class FacilityHistoryController {

  private final FacilityHistoryService historyService;

  // ----- 조회 -----

  @PostMapping("/list")
  @Operation(summary = "설비이력 목록 조회", description = "이력 현황을 평면 그리드 형태로 조회한다.")
  public List<FacilityHistoryDto.Res> fetchHistoryRows(
      @RequestBody FacilityHistoryDto.SearchReq condition) {
    return historyService.getHistoryList(condition);
  }

  @PostMapping("/card")
  @Operation(
      summary = "설비이력카드 출력용 조회",
      description = "키워드로 설비를 추려, 설비 마스터와 해당 이력 목록을 한 묶음으로 만든 카드 데이터를 돌려준다.")
  public List<FacilityHistoryDto.CardRes> fetchHistoryCards(
      @RequestBody FacilityHistoryDto.SearchReq condition) {
    return historyService.getHistoryCardList(condition);
  }

  // ----- 변경 -----

  @PostMapping("/save")
  @Operation(summary = "설비이력 일괄 저장", description = "수리/교체 이력을 한 건이든 여러 건이든 한 요청으로 신규/수정 처리한다.")
  public ApiCommonResponse<Void> persistHistories(
      @RequestBody @Valid List<FacilityHistoryDto.SaveReq> payload) {
    boolean nothingToSave = payload == null || payload.isEmpty();
    if (nothingToSave) {
      throw new CustomException(ErrorCode.COMMON_BAD_REQUEST, "저장할 이력 데이터가 없습니다.");
    }
    historyService.saveHistories(payload);
    return ApiCommonResponse.success("설비 이력이 성공적으로 저장되었습니다.", null);
  }

  @PostMapping("/delete")
  @Operation(summary = "설비이력 삭제", description = "선택된 이력 항목들을 한꺼번에 지운다.")
  public ApiCommonResponse<Void> removeHistories(@RequestBody FacilityHistoryDto.DeleteReq command) {
    historyService.deleteHistories(command);
    return ApiCommonResponse.success("선택한 이력이 삭제되었습니다.", null);
  }
}
