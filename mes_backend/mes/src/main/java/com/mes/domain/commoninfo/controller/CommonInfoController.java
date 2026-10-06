package com.mes.domain.commoninfo.controller;

import com.mes.domain.commoninfo.dto.CommonInfoDto;
import com.mes.domain.commoninfo.service.CommonInfoService;
import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;
import com.mes.global.response.ApiCommonResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * [기준정보관리 > 공통정보관리] 공통코드(분류값) 관리 API (/api/common-info).
 * 거의 모든 화면의 드롭다운/필터 옵션 소스이므로, 분류값은 여기서 동적 로드한다(하드코딩 금지).
 */
@RestController
@RequestMapping("/api/common-info")
@RequiredArgsConstructor
@Tag(name = "00. 공통정보 관리", description = "기준정보(공통코드) 관리 API")
public class CommonInfoController {

  private final CommonInfoService commonInfoService;

  // ── 조회 ──────────────────────────────────────────────

  @Operation(summary = "공통정보 목록 조회", description = "항목, 세부항목 및 내용 값을 포함하여 조회합니다.")
  @PostMapping("/list")
  public List<CommonInfoDto.Res> getCommonInfoList(@RequestBody CommonInfoDto.SearchReq requestDto) {
    return commonInfoService.getCommonInfoList(requestDto);
  }

  @Operation(summary = "공통정보 상세 조회", description = "PK(ID)를 Body에 담아 상세 정보를 조회합니다. (POST 방식)")
  @PostMapping("/detail")
  public CommonInfoDto.Res getCommonDetail(@RequestBody CommonInfoDto.IdReq requestDto) {
    return commonInfoService.getCommonDetail(requestDto.getDetailSq());
  }

  @Operation(summary = "공통정보 값 찾기/등록", description = "그룹명 기준으로 값이 있으면 재사용하고 없으면 새로 등록합니다. (예: 직원등록 화면의 신규 부서명 입력)")
  @PostMapping("/value/find-or-create")
  public CommonInfoDto.FindOrCreateValueRes findOrCreateValue(@RequestBody @Valid CommonInfoDto.FindOrCreateValueReq requestDto) {
    return commonInfoService.findOrCreateValue(requestDto.getGroupName(), requestDto.getValueContent());
  }

  // ── 변경 ──────────────────────────────────────────────

  @Operation(summary = "공통정보 일괄 등록", description = "그리드 데이터를 한 번에 저장합니다.")
  @PostMapping("/save")
  public ApiCommonResponse<Void> saveCommonInfoList(@RequestBody @Valid List<CommonInfoDto.SaveReq> requestDtos) {
    requireNonEmpty(requestDtos != null && !requestDtos.isEmpty(), "저장할 데이터가 없습니다.");

    commonInfoService.saveCommonInfoList(requestDtos);
    return ApiCommonResponse.success("성공적으로 저장되었습니다.", null);
  }

  @Operation(summary = "공통정보 일괄 수정", description = "체크된 항목들을 일괄 수정합니다. (내용 값은 새로 입력된 리스트로 전체 교체됩니다.)")
  @PutMapping("/update")
  public ApiCommonResponse<Void> updateCommonInfoList(@RequestBody @Valid List<CommonInfoDto.UpdateReq> requestDtos) {
    requireNonEmpty(requestDtos != null && !requestDtos.isEmpty(), "수정할 데이터가 없습니다.");

    commonInfoService.updateCommonInfoList(requestDtos);
    return ApiCommonResponse.success("성공적으로 수정되었습니다.", null);
  }

  @Operation(summary = "공통정보 일괄 삭제", description = "선택한 항목들을 완전히 삭제합니다. (단, 다른 메뉴에서 사용 중인 경우 삭제되지 않습니다.)")
  @PostMapping("/delete")
  public ApiCommonResponse<Void> deleteCommonInfoList(@RequestBody CommonInfoDto.DeleteReq requestDto) {
    requireNonEmpty(
        requestDto.getDetailSqs() != null && !requestDto.getDetailSqs().isEmpty(),
        "삭제할 데이터가 선택되지 않았습니다.");

    commonInfoService.deleteCommonInfoList(requestDto);
    return ApiCommonResponse.success("성공적으로 삭제되었습니다.", null);
  }

  /** 요청 페이로드가 비어 있으면 BAD_REQUEST 예외로 끊는다. */
  private void requireNonEmpty(boolean present, String message) {
    if (!present) {
      throw new CustomException(ErrorCode.COMMON_BAD_REQUEST, message);
    }
  }
}
