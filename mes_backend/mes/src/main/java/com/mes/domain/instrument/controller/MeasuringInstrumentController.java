package com.mes.domain.instrument.controller;

import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;

import com.mes.domain.instrument.dto.MeasuringInstrumentDto;
import com.mes.domain.instrument.service.MeasuringInstrumentService;
import com.mes.global.response.ApiCommonResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.util.CollectionUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 계측기 마스터 등록/조회 엔드포인트.
 * 기준 경로 {@code /api/instrument}, FE 의 instrumentApi.ts 와 짝을 이룬다.
 */
@RestController
@RequestMapping("/api/instrument")
@RequiredArgsConstructor
@Tag(name = "30. 계측기 관리", description = "계측기 마스터 정보 등록 및 조회 API")
public class MeasuringInstrumentController {

    private final MeasuringInstrumentService instrumentService;

    @Operation(summary = "계측기 목록 조회", description = "계측기 목록 및 교정 잔여일을 조회합니다. (Redis 적용)")
    @PostMapping("/list")
    public List<MeasuringInstrumentDto.Res> getInstrumentList(
            @RequestBody MeasuringInstrumentDto.SearchReq req) {
        List<MeasuringInstrumentDto.Res> list = instrumentService.getInstrumentList(req);
        return list;
    }

    @Operation(summary = "계측기 일괄 저장", description = "단건 및 다건의 계측기 정보를 등록하거나 수정합니다.")
    @PostMapping("/save")
    public ApiCommonResponse<Void> saveInstruments(
            @RequestBody @Valid List<MeasuringInstrumentDto.SaveReq> reqList) {
        if (CollectionUtils.isEmpty(reqList)) {
            throw new CustomException(ErrorCode.COMMON_BAD_REQUEST, "저장할 데이터가 없습니다.");
        }
        instrumentService.saveInstruments(reqList);
        return ApiCommonResponse.success("계측기 정보가 저장되었습니다.", null);
    }

    @Operation(summary = "계측기 삭제", description = "선택한 계측기 정보를 일괄 삭제합니다.")
    @PostMapping("/delete")
    public ApiCommonResponse<Void> deleteInstruments(
            @RequestBody MeasuringInstrumentDto.DeleteReq req) {
        instrumentService.deleteInstruments(req);
        return ApiCommonResponse.success("선택한 계측기가 삭제되었습니다.", null);
    }
}
