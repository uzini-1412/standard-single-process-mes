package com.mes.domain.inspect.controller;

import com.mes.domain.inspect.dto.InspectStandardDto;
import com.mes.domain.inspect.service.InspectStandardService;
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

/*
 * 검사 기준값(입고/공정/출하/자주) 통합 엔드포인트 — /api/inspect.
 * 입고/출하/자주 검사 화면이 모두 이 API 로 기준값을 가져온다.
 */
@RestController
@RequestMapping("/api/inspect")
@RequiredArgsConstructor
@Tag(name = "10. 검사기준 관리", description = "입고/공정 검사 기준 통합 관리 API")
public class InspectStandardController {

  private final InspectStandardService service;

  @Operation(summary = "검사기준 목록 조회", description = "검사유형(INCOMING/PROCESS)에 따른 목록을 조회합니다.")
  @PostMapping("/list")
  public List<InspectStandardDto.Res> getList(@RequestBody InspectStandardDto.SearchReq req) {
    return service.getList(req);
  }

  @Operation(summary = "검사기준 상세 조회", description = "PK로 검사기준 상세(항목, 개정이력 포함)를 조회합니다.")
  @PostMapping("/detail")
  public InspectStandardDto.Res getDetail(@RequestBody InspectStandardDto.DetailReq req) {
    return service.getDetail(req.getInspectStdSq());
  }

  @Operation(summary = "검사기준 저장", description = "검사기준서(항목, 개정이력)를 저장합니다.")
  @PostMapping("/save")
  public ApiCommonResponse<Void> save(@RequestBody @Valid InspectStandardDto.SaveReq req) {
    service.save(req);
    return ApiCommonResponse.success("검사기준이 저장되었습니다.", null);
  }

  @Operation(summary = "검사기준 삭제", description = "선택한 검사기준서를 삭제합니다.")
  @PostMapping("/delete")
  public ApiCommonResponse<Void> delete(@RequestBody InspectStandardDto.DeleteReq req) {
    service.delete(req);
    return ApiCommonResponse.success("검사기준이 삭제되었습니다.", null);
  }
}
