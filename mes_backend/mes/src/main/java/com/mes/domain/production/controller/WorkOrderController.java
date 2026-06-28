package com.mes.domain.production.controller;

import java.util.List;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mes.domain.production.dto.WorkOrderDto;
import com.mes.domain.production.service.WorkOrderService;
import com.mes.global.response.ApiCommonResponse;
import com.mes.global.response.PageResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * 작업지시 HTTP 진입점.
 *
 * 등록·상태전이·조회를 한곳에서 처리한다. 생산 화면뿐 아니라 원소재사용현황과
 * 작업자앱(mes_op)도 같은 작업지시 데이터를 참조하므로, 이 컨트롤러를 단일 출처로 유지한다.
 * 모든 핸들러는 {@link ApiCommonResponse} 봉투로 응답을 감싼다.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/production/work-order")
@Tag(name = "18. 작업지시 관리", description = "생산 작업지시 등록 및 현황 조회 API")
public class WorkOrderController {

  private final WorkOrderService workOrderService;

  /* =========================== 변경(쓰기) =========================== */

  @Operation(summary = "작업지시 저장", description = "작업지시 헤더와 세부 LOT 행을 신규 등록하거나 수정합니다.")
  @PostMapping("/save")
  public ApiCommonResponse<Void> saveWorkOrder(@RequestBody @Valid WorkOrderDto.SaveReq req) {
    workOrderService.save(req);
    return ApiCommonResponse.success("작업지시가 저장되었습니다.", null);
  }

  @Operation(summary = "작업지시 상태 변경", description = "지시 상태를 전이합니다. (READY, IN_PROGRESS, COMPLETED, STOPPED)")
  @PostMapping("/update-status")
  public ApiCommonResponse<Void> changeStatus(@RequestBody WorkOrderDto.StatusUpdateReq req) {
    workOrderService.updateStatus(req);
    return ApiCommonResponse.success("작업지시 상태가 변경되었습니다.", null);
  }

  @Operation(summary = "작업지시 삭제", description = "선택한 작업지시를 삭제합니다. 대기 상태만 삭제할 수 있습니다.")
  @PostMapping("/delete")
  public ApiCommonResponse<Void> removeWorkOrders(@RequestBody WorkOrderDto.DeleteReq req) {
    workOrderService.delete(req);
    return ApiCommonResponse.success("작업지시가 삭제되었습니다.", null);
  }

  /* =========================== 조회(읽기) =========================== */

  @Operation(summary = "작업지시 목록 조회", description = "검색 조건에 맞는 작업지시 전체 목록을 반환합니다.")
  @PostMapping("/list")
  public List<WorkOrderDto.Res> listWorkOrders(@RequestBody WorkOrderDto.SearchReq req) {
    return workOrderService.getList(req);
  }

  @Operation(summary = "작업지시 목록 조회 (페이징)",
      description = "대용량 대응 버전. page 는 0-based, size 기본 50. 응답은 PageResponse<T> 형태.")
  @PostMapping("/list-paged")
  public PageResponse<WorkOrderDto.Res> listWorkOrdersPaged(@RequestBody WorkOrderDto.SearchReq req) {
    return workOrderService.getListPaged(req);
  }

  @Operation(summary = "작업지시 라인+날짜 라이프사이클 조회",
      description = "원소재 투입분석 상세용. 기준일에 지시·시작·완료 중 하나라도 걸리는 LOT 목록을 모아 반환합니다.")
  @PostMapping("/list-by-date")
  public List<WorkOrderDto.Res> listByLineAndDate(@RequestBody WorkOrderDto.LineDateSearchReq req) {
    return workOrderService.getListByLineAndDateAcrossLifecycle(req);
  }
}
