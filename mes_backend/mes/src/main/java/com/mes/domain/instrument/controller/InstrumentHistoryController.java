package com.mes.domain.instrument.controller;

import com.mes.domain.instrument.dto.InstrumentHistoryDto;
import com.mes.domain.instrument.service.InstrumentHistoryService;
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

/**
 * 계측기 검교정/수리 이력 엔드포인트 (기준 경로 {@code /api/instrument/history}).
 * "검교정이력등록"과 "계측기이력카드" 두 화면이 공유하며 FE 의 instrumentApi.ts 와 연동된다.
 */
@RestController
@RequestMapping("/api/instrument/history")
@RequiredArgsConstructor
@Tag(name = "31. 계측기 이력 관리", description = "계측기/검사구 검교정 및 수리 이력 API")
public class InstrumentHistoryController {

    private final InstrumentHistoryService historyService;

    @Operation(summary = "계측기 이력 일괄 저장",
            description = "다건의 계측기 이력(검교정성적서 파일 포함)을 일괄 저장/수정합니다.")
    @PostMapping("/save")
    public ApiCommonResponse<Void> saveHistories(
            @RequestBody @Valid List<InstrumentHistoryDto.SaveReq> reqList) {
        historyService.saveHistories(reqList);
        return ApiCommonResponse.success("계측기 이력이 저장되었습니다.", null);
    }

    @Operation(summary = "계측기 이력 삭제", description = "선택한 이력을 삭제합니다.")
    @PostMapping("/delete")
    public ApiCommonResponse<Void> deleteHistories(
            @RequestBody InstrumentHistoryDto.DeleteReq req) {
        historyService.deleteHistories(req);
        return ApiCommonResponse.success("이력 정보가 삭제되었습니다.", null);
    }

    @Operation(summary = "계측기 이력 목록 조회", description = "계측기별 검교정 및 수리 이력을 조회합니다.")
    @PostMapping("/list")
    public List<InstrumentHistoryDto.Res> getHistoryList(
            @RequestBody InstrumentHistoryDto.SearchReq req) {
        return historyService.getHistoryList(req);
    }

    @Operation(summary = "계측기 이력카드 출력 조회",
            description = "키워드(기기명/번호)로 계측기를 검색하여 마스터+이력 데이터를 카드 형태로 조회합니다.")
    @PostMapping("/card")
    public List<InstrumentHistoryDto.CardRes> getHistoryCardList(
            @RequestBody InstrumentHistoryDto.SearchReq req) {
        return historyService.getHistoryCardList(req);
    }
}
