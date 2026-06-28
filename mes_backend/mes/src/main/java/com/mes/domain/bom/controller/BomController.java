package com.mes.domain.bom.controller;
import com.mes.global.exception.CustomException;

import com.mes.domain.bom.dto.BomDto;
import com.mes.domain.bom.service.BomService;
import com.mes.global.exception.ErrorCode;
import com.mes.global.response.ApiCommonResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/bom")
@RequiredArgsConstructor
@Tag(name = "07. 품목구성(BOM) 관리", description = "제품별 구성품(BOM) 등록/조회 API. bom.mode 로 코어/배합형 분기")
public class BomController {

  private final BomService bomService;

  @Operation(summary = "BOM 목록 조회", description = "특정 제품(productItemSq)의 구성품 라인 목록을 조회합니다.")
  @PostMapping("/list")
  public List<BomDto.Res> getBomList(@RequestBody BomDto.SearchReq requestDto) {
    return bomService.getBomList(requestDto);
  }

  @Operation(summary = "BOM 일괄 저장", description = "그리드에 입력된 구성품 라인을 등록하거나 수정합니다.")
  @PostMapping("/save")
  public ApiCommonResponse<Void> saveBomList(@RequestBody @Valid List<BomDto.SaveReq> requestDtos) {
    if (requestDtos == null || requestDtos.isEmpty()) {
      throw new CustomException(ErrorCode.COMMON_BAD_REQUEST, "저장할 데이터가 없습니다.");
    }
    bomService.saveBomList(requestDtos);
    return ApiCommonResponse.success("BOM 정보가 저장되었습니다.", null);
  }

  @Operation(summary = "BOM 일괄 삭제", description = "선택한 구성품 라인을 삭제합니다.")
  @PostMapping("/delete")
  public ApiCommonResponse<Void> deleteBomList(@RequestBody BomDto.DeleteReq requestDto) {
    bomService.deleteBomList(requestDto);
    return ApiCommonResponse.success("BOM 정보가 삭제되었습니다.", null);
  }
}
