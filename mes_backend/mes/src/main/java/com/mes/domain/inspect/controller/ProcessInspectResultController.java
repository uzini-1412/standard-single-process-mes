package com.mes.domain.inspect.controller;

import com.mes.domain.inspect.dto.ProcessInspectProgressDto;
import com.mes.domain.inspect.dto.ProcessInspectResultDto;
import com.mes.domain.inspect.service.ProcessInspectResultService;
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
 * 공정 자주검사 결과 저장/조회 — /api/inspect/result.
 * 프론트의 공정검사현황 화면(processInspectionApi.ts)에서 호출한다.
 */
@RestController
@RequestMapping("/api/inspect/result")
@RequiredArgsConstructor
@Tag(name = "10. 검사기준 관리", description = "자주검사 결과 저장/조회 API")
public class ProcessInspectResultController {

  private final ProcessInspectResultService service;

  @Operation(summary = "공정검사 진척현황 조회", description = "작업지시별 자주검사 진행상황을 조회합니다.")
  @PostMapping("/progress-list")
  public List<ProcessInspectProgressDto.HeaderRes> getProgressList() {
    return service.getProgressList();
  }

  @Operation(summary = "공정검사 결과 상세", description = "작업지시 기준 검사항목 + 초품/종품 결과를 조회합니다.")
  @PostMapping("/detail")
  public List<ProcessInspectProgressDto.DetailRes> getDetail(
      @RequestBody ProcessInspectProgressDto.DetailReq req) {
    return service.getDetail(req.getWorkOrderSq());
  }

  @Operation(summary = "자주검사 결과 조회", description = "작업지시 기준 자주검사 결과를 조회합니다.")
  @PostMapping("/list")
  public List<ProcessInspectResultDto.Res> getList(@RequestBody ProcessInspectResultDto.ListReq req) {
    return service.getList(req.getWorkOrderSq());
  }

  @Operation(summary = "자주검사 결과 저장", description = "초품/종품 검사 결과를 저장합니다.")
  @PostMapping("/save")
  public ApiCommonResponse<Void> save(@RequestBody @Valid ProcessInspectResultDto.SaveReq req) {
    service.save(req);
    return ApiCommonResponse.success("저장되었습니다.", null);
  }
}
