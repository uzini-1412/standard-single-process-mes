package com.mes.domain.sales.controller;

import com.mes.domain.sales.dto.SalesStatusDto;
import com.mes.domain.sales.service.SalesStatusService;
import com.mes.global.response.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/sales/status")
@RequiredArgsConstructor
@Tag(name = "25. 매출현황", description = "매출현황 조회 API")
public class SalesStatusController {

    private final SalesStatusService salesStatusService;

    @Operation(summary = "매출현황 그룹 페이징 조회",
            description = "(거래처+출하일+Lot) 단위 그룹 페이징. 화면 상단 표 전용.")
    @PostMapping("/list-paged")
    public PageResponse<SalesStatusDto.GroupRes> getSalesStatusListPaged(
            @RequestBody SalesStatusDto.SearchReq req) {
        return salesStatusService.getSalesStatusListPaged(req);
    }

    @Operation(summary = "매출현황 목록 조회", description = "출하실적 기반 매출현황을 조회합니다.")
    @PostMapping("/list")
    public List<SalesStatusDto.Res> getSalesStatusList(
            @RequestBody SalesStatusDto.SearchReq req) {
        return salesStatusService.getSalesStatusList(req);
    }

    @Operation(summary = "매출현황 그룹 상세(팝업)",
            description = "선택한 그룹 키(거래처/출하일/Lot)의 상세 항목 리스트.")
    @PostMapping("/items")
    public List<SalesStatusDto.Res> getSalesStatusItems(
            @RequestBody SalesStatusDto.SearchReq req) {
        return salesStatusService.getSalesStatusItemsByGroup(req);
    }

    @Operation(summary = "매출 추이(월별 합계)",
            description = "검색 기간 내 월별 매출 합계. customerCode 지정 시 해당 거래처, 미지정 시 전체 합계.")
    @PostMapping("/trend")
    public List<SalesStatusDto.TrendRes> getSalesTrend(
            @RequestBody SalesStatusDto.SearchReq req) {
        return salesStatusService.getSalesTrend(req);
    }

    @Operation(summary = "매출현황 거래처 옵션", description = "검색 기간 내 출하 실적이 있는 거래처 distinct 목록.")
    @PostMapping("/customers")
    public List<SalesStatusDto.CustomerOption> getCustomerOptions(
            @RequestBody SalesStatusDto.SearchReq req) {
        return salesStatusService.getCustomerOptions(req);
    }
}
