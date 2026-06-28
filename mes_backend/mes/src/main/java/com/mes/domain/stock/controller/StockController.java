package com.mes.domain.stock.controller;

import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.mes.domain.stock.dto.MaterialStockDto;
import com.mes.domain.stock.service.MaterialStockService;
import com.mes.global.response.ApiCommonResponse;

import java.util.List;

/**
 * 자재(원/부자재) 재고의 현황·이력 조회와 등록/삭제를 노출하는 REST 진입점(/api/material/stock).
 * 실제 로직은 전부 {@link MaterialStockService} 에 맡기고 컨트롤러는 위임만 한다.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/material/stock")
@Tag(name = "15. 자재 재고/불량 현황", description = "자재 재고 조회, 이력 및 불량 현황 API")
public class StockController {

  private final MaterialStockService stockService;

  @Operation(summary = "자재 재고 현황 목록 조회", description = "현재고를 적정재고와 견준 상태 값까지 담아 목록으로 반환합니다.")
  @PostMapping("/list")
  public List<MaterialStockDto.Res> getStockList(
      @RequestBody MaterialStockDto.SearchReq req) {
    return stockService.getStockList(req);
  }

  @Operation(summary = "자재 재고 상세 조회", description = "재고 PK 한 건의 상세 정보를 조회합니다.")
  @PostMapping("/detail")
  public MaterialStockDto.Res getStockDetail(
      @RequestBody MaterialStockDto.SearchReq req) {
    return stockService.getStockDetail(req.getStockSq());
  }

  @Operation(summary = "자재 입출고 이력 조회", description = "지정한 재고(LOT)의 수불부를 최신 건부터 조회합니다.")
  @PostMapping("/history/list")
  public List<MaterialStockDto.HistoryRes> getStockHistoryList(
      @RequestBody MaterialStockDto.SearchReq req) {
    return stockService.getStockHistoryList(req.getStockSq());
  }

  @Operation(summary = "자재 재고 일괄 저장(등록/수정)", description = "시스템 재고를 신규 등록하거나 임의 조정하며, 이력은 자동으로 남깁니다.")
  @PostMapping("/save")
  public ApiCommonResponse<Void> saveStockList(
      @RequestBody @Valid List<MaterialStockDto.SaveReq> reqList) {
    if (reqList == null || reqList.isEmpty()) {
      throw new CustomException(ErrorCode.COMMON_BAD_REQUEST, "저장할 데이터가 없습니다.");
    }
    stockService.saveStockList(reqList);
    return ApiCommonResponse.success("재고가 성공적으로 반영되었습니다.", null);
  }

  @Operation(summary = "자재 재고 일괄 삭제", description = "선택된 재고 행들을 일괄 제거합니다.")
  @PostMapping("/delete")
  public ApiCommonResponse<Void> deleteStockList(@RequestBody MaterialStockDto.DeleteReq req) {
    stockService.deleteStockList(req);
    return ApiCommonResponse.success("재고 정보가 삭제되었습니다.", null);
  }
}
