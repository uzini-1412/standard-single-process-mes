package com.mes.domain.item.controller;

import com.mes.domain.item.dto.ItemDto;
import com.mes.domain.item.dto.LotTraceDto;
import com.mes.domain.item.dto.LotTraceSearchDto;
import com.mes.domain.item.dto.MfgLotDetailDto;
import com.mes.domain.item.dto.PurchaseLotDetailDto;
import com.mes.domain.item.service.ItemService;
import com.mes.domain.item.service.LotTraceService;
import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;
import com.mes.global.response.ApiCommonResponse;
import com.mes.global.response.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.util.CollectionUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 품목 도메인 HTTP 진입점.
 *
 * <p>한 컨트롤러가 두 영역을 함께 노출한다.
 * <ul>
 *   <li>{@code /api/item/*} : 품목 마스터 CRUD — 타 화면의 공통 기준 데이터.</li>
 *   <li>{@code /api/item/lot-trace/*} : LOT 단위 제품 이력 추적/검색.</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/item")
@RequiredArgsConstructor
@Tag(name = "06. 품목 관리", description = "품목 정보 등록/수정/조회 API")
public class ItemController {

    private final ItemService itemService;
    private final LotTraceService lotTraceService;

    // ======================================================================
    //  품목 마스터 — 조회
    // ======================================================================

    @Operation(summary = "품목 목록 조회", description = "조건에 맞는 품목 목록을 조회합니다. (POST 방식)")
    @PostMapping("/list")
    public List<ItemDto.Res> getItemList(@RequestBody ItemDto.SearchReq condition) {
        List<ItemDto.Res> rows = itemService.getList(condition);
        return rows;
    }

    @Operation(summary = "품목 상세 조회", description = "PK를 통해 품목 상세 정보를 조회합니다.")
    @PostMapping("/detail")
    public ItemDto.Res getItemDetail(@RequestBody ItemDto.DetailReq key) {
        ItemDto.Res detail = itemService.getDetail(key.getItemSq());
        return detail;
    }

    // ======================================================================
    //  품목 마스터 — 등록 / 수정 / 삭제
    // ======================================================================

    @Operation(summary = "품목 일괄 등록", description = "여러 품목을 한 번에 등록합니다. (이미지는 경로 배열로 전송)")
    @PostMapping("/save")
    public ApiCommonResponse<Void> saveItemList(@RequestBody @Valid List<ItemDto.SaveReq> payloads) {
        requireNotEmpty(payloads, "저장할 데이터가 없습니다.");
        itemService.saveItemList(payloads);
        return ApiCommonResponse.success("품목 정보가 등록되었습니다.", null);
    }

    @Operation(summary = "품목 일괄 수정", description = "체크된 품목을 일괄 수정합니다.")
    @PutMapping("/update")
    public ApiCommonResponse<Void> updateItemList(@RequestBody @Valid List<ItemDto.UpdateReq> payloads) {
        requireNotEmpty(payloads, "수정할 데이터가 없습니다.");
        itemService.updateItemList(payloads);
        return ApiCommonResponse.success("품목 정보가 수정되었습니다.", null);
    }

    @Operation(summary = "품목 일괄 삭제", description = "선택한 품목을 삭제합니다.")
    @PostMapping("/delete")
    public ApiCommonResponse<Void> deleteItemList(@RequestBody ItemDto.DeleteReq target) {
        itemService.deleteItemList(target);
        return ApiCommonResponse.success("품목 정보가 삭제되었습니다.", null);
    }

    // ======================================================================
    //  LOT 추적 (제품이력관리)
    // ======================================================================

    @Operation(summary = "LOT 추적 조회", description = "LOT 번호로 제품 이력을 종합 조회합니다. (태블릿 제품식별)")
    @PostMapping("/lot-trace")
    public LotTraceDto.Res lotTrace(@RequestBody LotTraceDto.SearchReq req) {
        return lotTraceService.trace(req.getLotNo());
    }

    @Operation(summary = "LOT 추적 검색 리스트 (페이징)",
        description = "searchType(PURCHASE/MFG/SHIP) 필수. page(0-based), size(기본 50). 응답은 PageResponse<T>")
    @PostMapping("/lot-trace/search")
    public PageResponse<LotTraceSearchDto.SearchItem> lotTraceSearch(
        @RequestBody LotTraceSearchDto.SearchReq req) {
        return lotTraceService.searchLotsPaged(req);
    }

    @Operation(summary = "구매 LOT 상세 조회", description = "구매 LOT 번호로 상세 정보를 조회합니다.")
    @PostMapping("/lot-trace/purchase-detail")
    public PurchaseLotDetailDto.Res purchaseLotDetail(
        @RequestBody PurchaseLotDetailDto.Req req) {
        return lotTraceService.getPurchaseLotDetail(req.getLotNo());
    }

    @Operation(summary = "제조 LOT 상세 조회", description = "제조 LOT 번호로 상세 정보를 조회합니다.")
    @PostMapping("/lot-trace/mfg-detail")
    public MfgLotDetailDto.Res mfgLotDetail(
        @RequestBody MfgLotDetailDto.Req req) {
        return lotTraceService.getMfgLotDetail(req.getLotNo());
    }

    @Operation(summary = "수주 역참조 정보", description = "출하 LOT에 연계된 수주 정보를 조회합니다.")
    @PostMapping("/lot-trace/sales-order-ref")
    public List<LotTraceSearchDto.SalesOrderRefItem> salesOrderRef(
        @RequestBody LotTraceSearchDto.SearchReq req) {
        return lotTraceService.getSalesOrderRefs(req);
    }

    @Operation(summary = "LOT 연계 LOT 일괄 조회",
        description = "엑셀 출력용. 입력 LOT 목록에 대해 연계된 LOT 목록(구매→제조, 제조→출하)을 1회 호출로 반환합니다.")
    @PostMapping("/lot-trace/linked-lots")
    public List<LotTraceSearchDto.LinkedLotsItem> linkedLotsBulk(
        @RequestBody LotTraceSearchDto.LinkedLotsReq req) {
        return lotTraceService.getLinkedLotsBulk(req);
    }

    // ======================================================================
    //  내부 헬퍼
    // ======================================================================

    /**
     * 일괄 처리 요청이 비어 있으면 BAD_REQUEST 예외를 던진다.
     * GlobalExceptionHandler 가 받아 400 + COM-002 로 응답한다.
     */
    private void requireNotEmpty(List<?> payloads, String message) {
        if (CollectionUtils.isEmpty(payloads)) {
            throw new CustomException(ErrorCode.COMMON_BAD_REQUEST, message);
        }
    }
}
