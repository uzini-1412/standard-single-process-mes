package com.mes.domain.collection.controller;

import com.mes.domain.collection.dto.CollectionDto;
import com.mes.domain.collection.service.CollectionService;
import com.mes.global.response.ApiCommonResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 수금/자금관리 전표 API. 전표 CRUD 와, 수금 등록 시 거래처별 출하실적을
 * 고르는 모달용 조회를 제공한다.
 */
@RestController
@RequestMapping("/api/collection")
@RequiredArgsConstructor
@Tag(name = "27. 자금관리", description = "수금관리 및 자금관리 API")
public class CollectionController {

    private final CollectionService service;

    @Operation(summary = "자금관리 목록 조회")
    @PostMapping("/list")
    public List<CollectionDto.ListRes> list(@RequestBody CollectionDto.SearchReq condition) {
        return service.getList(condition);
    }

    @Operation(summary = "자금관리 상세 조회")
    @GetMapping("/{collectionSq}")
    public CollectionDto.Res detail(@PathVariable Long collectionSq) {
        return service.getDetail(collectionSq);
    }

    @Operation(summary = "거래처별 출하실적 목록 (모달용)")
    @GetMapping("/ship-results")
    public List<CollectionDto.ShipResultOption> shipResults(@RequestParam String customerCode) {
        return service.getShipResultsByCustomerCode(customerCode);
    }

    @Operation(summary = "자금관리 저장 (등록/수정)")
    @PostMapping("/save")
    public ApiCommonResponse<Long> save(@RequestBody @Valid CollectionDto.SaveReq body) {
        return ApiCommonResponse.success("저장되었습니다.", service.save(body));
    }

    @Operation(summary = "자금관리 삭제")
    @DeleteMapping("/{collectionSq}")
    public ApiCommonResponse<Void> delete(@PathVariable Long collectionSq) {
        service.delete(collectionSq);
        return ApiCommonResponse.success("삭제되었습니다.", null);
    }
}
