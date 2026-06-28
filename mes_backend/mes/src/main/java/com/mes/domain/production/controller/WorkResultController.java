package com.mes.domain.production.controller;

import com.mes.domain.production.dto.DowntimeDto;
import com.mes.domain.production.dto.WorkResultDto;
import com.mes.domain.production.service.DowntimeService;
import com.mes.domain.production.service.WorkResultService;
import com.mes.global.response.ApiCommonResponse;
import com.mes.global.response.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/*
 * /api/production/result — 생산 결과 계열 읽기 화면이 공유하는 진입점.
 * 한 컨트롤러가 생산일보 · 기간별불량현황 · 기간별비가동현황 · 설비가동관리 · 생산추이도를
 * 경로 접미사(/defect · /downtime · /trend …)로 갈라서 처리한다. 실적 '입력'은 mes_op 쪽이다.
 * 실적/불량/추이는 WorkResultService 가, 비가동은 DowntimeService 가 담당한다.
 * FE 연결: workResultApi.ts
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/production/result")
@Tag(name = "19. 생산 실적/불량/비가동", description = "생산 결과 및 분석 API")
public class WorkResultController {

  private final WorkResultService workResultService;
  private final DowntimeService downtimeService;

  /* 실적 등록 (롤 단위 저장) */

  @Operation(summary = "작업실적 등록", description = "생산된 롤 단위의 실적을 저장합니다.")
  @PostMapping("/save")
  public ApiCommonResponse<Void> saveResult(@RequestBody @Valid WorkResultDto.SaveReq req) {
    workResultService.saveResult(req);
    return ApiCommonResponse.success("작업실적이 저장되었습니다.", null);
  }

  /* 실적 현황 (전체 / 페이징 / 작업지시 단위 LOT 펼침) */

  @Operation(summary = "작업실적 현황 조회", description = "생산 실적 목록을 조회합니다.")
  @PostMapping("/list")
  public List<WorkResultDto.ResultListRes> getResultStatus(
      @RequestBody WorkResultDto.SearchReq req) {
    return workResultService.getResultStatus(req);
  }

  @Operation(summary = "작업실적 현황 조회 (페이징)",
      description = "생산일보 대용량 대응. page(0-based), size(기본 50). 응답은 PageResponse<T>")
  @PostMapping("/list-paged")
  public PageResponse<WorkResultDto.ResultListRes> getResultStatusPaged(
      @RequestBody WorkResultDto.SearchReq req) {
    return workResultService.getResultStatusPaged(req);
  }

  @Operation(summary = "작업지시 단위 LOT 펼침 조회",
      description = "제품중량 상세 화면 진입 시 형제 LOT 전체 조회. 페이지 경계 무관.")
  @GetMapping("/by-work-order/{workOrderSq}")
  public List<WorkResultDto.ResultListRes> getByWorkOrder(
      @PathVariable Long workOrderSq) {
    return workResultService.getExpandedRowsByWorkOrderSq(workOrderSq);
  }

  /* 불량 (요약 / 상세) */

  @Operation(summary = "기간별 불량현황 조회 (경량)",
      description = "totalBadQty > 0 인 행만 DB 측에서 필터. 품목 정보만 일괄 매핑. LOT 전개 없음.")
  @PostMapping("/defect-summary")
  public List<WorkResultDto.ResultListRes> getDefectSummary(
      @RequestBody WorkResultDto.SearchReq req) {
    return workResultService.getDefectSummary(req);
  }

  @Operation(summary = "제품 불량 현황 조회", description = "불량(NG) 판정을 받은 롤 목록을 조회합니다.")
  @PostMapping("/defect/list")
  public List<WorkResultDto.DetailRes> getDefectStatus(@RequestBody WorkResultDto.SearchReq req) {
    return workResultService.getDefectStatus(req);
  }

  /* 추이 차트 */

  @Operation(summary = "라인×월별 생산길이 합계 (생산추이도용)",
      description = "기간 내 라인×월별 prodLength 합계. work_result 전체 로드 없이 GROUP BY 응답. NG 포함.")
  @PostMapping("/trend/line-monthly")
  public ApiCommonResponse<List<WorkResultDto.LineMonthlySum>> getLineMonthlyTrend(
      @RequestBody WorkResultDto.SearchReq req) {
    return ApiCommonResponse.success(
        workResultService.getLineMonthlyTrend(req.getDateFrom(), req.getDateTo()));
  }

  /* 비가동 (등록 / 조회) — DowntimeService 위임 */

  @Operation(summary = "비가동 등록", description = "설비 비가동 내역을 등록합니다. 신규 등록 시 downtimeSq 반환, 수정 시 동일 PK 반환.")
  @PostMapping("/downtime/save")
  public ApiCommonResponse<Long> saveDowntime(@RequestBody @Valid DowntimeDto.SaveReq req) {
    Long persistedSq = downtimeService.save(req);
    return ApiCommonResponse.success("비가동 내역이 저장되었습니다.", persistedSq);
  }

  @Operation(summary = "비가동 목록 조회", description = "비가동 내역을 조회합니다.")
  @PostMapping("/downtime/list")
  public List<DowntimeDto.Res> getDowntimeList(@RequestBody DowntimeDto.SearchReq req) {
    return downtimeService.getList(req);
  }
}
