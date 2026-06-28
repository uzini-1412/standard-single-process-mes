package com.mes.domain.sales.controller;

import com.mes.domain.sales.dto.SalesOrderDto;
import com.mes.domain.sales.service.SalesOrderService;
import com.mes.global.response.ApiCommonResponse;
import com.mes.global.response.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/*
 * 수주(Sales Order) 등록/조회 엔드포인트.
 * 화면 외에도 생산소요량 산출, 출하계획, 출하수주이력 모달, LOT 추적 등에서 공용으로 사용된다.
 */
@RestController
@RequestMapping("/api/sales-order")
@RequiredArgsConstructor
@Tag(name = "11. 수주 관리", description = "영업 수주(Sales Order) 등록/조회 API")
public class SalesOrderController {

  private final SalesOrderService salesOrderService;

  @Operation(summary = "수주 저장", description = "수주 정보(헤더+품목)를 등록하거나 수정합니다.")
  @PostMapping("/save")
  public ApiCommonResponse<Void> save(@RequestBody @Valid SalesOrderDto.SaveReq req) {
    salesOrderService.save(req);
    return ApiCommonResponse.success("수주 정보가 저장되었습니다.", null);
  }

  @Operation(summary = "수주 삭제", description = "선택한 수주 건을 삭제합니다.")
  @PostMapping("/delete")
  public ApiCommonResponse<Void> delete(@RequestBody SalesOrderDto.DeleteReq req) {
    salesOrderService.delete(req);
    return ApiCommonResponse.success("수주 정보가 삭제되었습니다.", null);
  }

  @Operation(summary = "수주 목록 조회", description = "조건에 맞는 수주 목록을 조회합니다.")
  @PostMapping("/list")
  public List<SalesOrderDto.Res> getList(@RequestBody SalesOrderDto.SearchReq req) {
    return salesOrderService.getList(req);
  }

  @Operation(summary = "수주 목록 페이징 조회",
      description = "수주관리/생산소요량산출 화면용. page(0-based), size(기본 50).")
  @PostMapping("/list-paged")
  public PageResponse<SalesOrderDto.Res> getListPaged(@RequestBody SalesOrderDto.SearchReq req) {
    return salesOrderService.getListPaged(req);
  }

  @Operation(summary = "수주 상세 조회", description = "수주 PK로 상세 정보(품목 리스트 포함)를 조회합니다.")
  @PostMapping("/detail")
  public SalesOrderDto.Res getDetail(@RequestBody SalesOrderDto.SaveReq req) {
    return salesOrderService.getDetail(req.getOrderSq());
  }

  @Operation(summary = "수주번호 채번", description = "신규 수주번호를 자동 생성합니다.")
  @PostMapping("/generate-order-no")
  public Map<String, String> generateOrderNo() {
    Map<String, String> result = Map.of("orderNo", salesOrderService.generateOrderNo());
    return result;
  }
}
