package com.mes.domain.purchase.controller;

import com.mes.domain.purchase.dto.PurchaseStatusDto;
import com.mes.domain.purchase.service.PurchaseStatusService;
import com.mes.global.response.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 거래처원장(매입현황) 조회 API (/api/purchase/status). 모두 합격 입고 실적을 기반으로 한다.
 */
@RestController
@RequestMapping("/api/purchase/status")
@RequiredArgsConstructor
@Tag(name = "26. 거래처원장", description = "거래처원장(매입현황) 조회 API")
public class PurchaseStatusController {

  private final PurchaseStatusService statusService;

  @Operation(summary = "거래처원장 그룹 페이징 조회",
      description = "(계정과목+거래처+입고일) 단위 그룹 페이징. 화면 상단 표 전용.")
  @PostMapping("/list-paged")
  public PageResponse<PurchaseStatusDto.GroupRes> getPurchaseStatusListPaged(
      @RequestBody PurchaseStatusDto.SearchReq req) {
    return statusService.getPurchaseStatusListPaged(req);
  }

  @Operation(summary = "거래처원장 그룹 상세(팝업)",
      description = "선택한 그룹 키(계정/거래처/입고일)의 상세 항목 리스트.")
  @PostMapping("/items")
  public List<PurchaseStatusDto.Res> getPurchaseStatusItems(
      @RequestBody PurchaseStatusDto.SearchReq req) {
    return statusService.getPurchaseStatusItemsByGroup(req);
  }

  @Operation(summary = "거래처원장 목록 조회", description = "합격 입고 실적 기반 매입현황을 조회합니다.")
  @PostMapping("/list")
  public List<PurchaseStatusDto.Res> getPurchaseStatusList(
      @RequestBody PurchaseStatusDto.SearchReq req) {
    return statusService.getPurchaseStatusList(req);
  }

  @Operation(summary = "매입 추이(월별 합계)",
      description = "검색 기간 내 월별 매입 합계. customerCode 지정 시 해당 거래처, 미지정 시 전체 합계.")
  @PostMapping("/trend")
  public List<PurchaseStatusDto.TrendRes> getPurchaseTrend(
      @RequestBody PurchaseStatusDto.SearchReq req) {
    return statusService.getPurchaseTrend(req);
  }

  @Operation(summary = "거래처원장 거래처 옵션",
      description = "검색 기간 내 합격 입고 실적이 있는 거래처 distinct 목록.")
  @PostMapping("/customers")
  public List<PurchaseStatusDto.CustomerOption> getCustomerOptions(
      @RequestBody PurchaseStatusDto.SearchReq req) {
    return statusService.getCustomerOptions(req);
  }
}
