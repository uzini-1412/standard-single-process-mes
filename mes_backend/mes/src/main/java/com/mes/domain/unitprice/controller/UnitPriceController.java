package com.mes.domain.unitprice.controller;

import com.mes.domain.unitprice.dto.UnitPriceDto;
import com.mes.domain.unitprice.service.UnitPriceService;
import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;
import com.mes.global.response.ApiCommonResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 단가 기준정보·이력 관리 API (/api/unit-price).
 * 단가 한 건의 키는 거래처 + 품목 + 폭 + 길이 조합으로 본다.
 */
@RestController
@RequestMapping("/api/unit-price")
@RequiredArgsConstructor
@Tag(name = "09. 단가 관리", description = "품목별 단가 기준정보 및 이력 관리 API")
public class UnitPriceController {

  private final UnitPriceService unitPriceService;

  @Operation(summary = "단가 목록 조회", description = "조건(품목, 날짜 등)에 맞는 단가 이력을 조회합니다. baseDate가 있으면 해당일에 유효한 단가만 나옵니다.")
  @PostMapping("/list")
  public List<UnitPriceDto.Res> getList(@RequestBody UnitPriceDto.SearchReq condition) {
    return unitPriceService.getList(condition);
  }

  @Operation(summary = "활성 단가 목록 조회", description = "(품목+거래처+구분+폭) 조합별로 적용일자 ≤ 오늘 중 가장 최신 1건만 반환합니다.")
  @PostMapping("/active-list")
  public List<UnitPriceDto.Res> getActiveList(@RequestBody UnitPriceDto.SearchReq condition) {
    return unitPriceService.getActiveList(condition);
  }

  @Operation(summary = "거래처별 판매가능 품목 조회", description = "선택한 거래처에 단가가 등록되고 오늘 유효한 품목만 단가와 함께 반환합니다. priceType 미지정 시 SALE. priceUnits 미지정 시 SALE→m2, BUY→ea/kg.")
  @GetMapping("/salable-items")
  public List<UnitPriceDto.SalableItemRes> getSalableItems(
      @RequestParam Long customerSq,
      @RequestParam(required = false) String priceType,
      @RequestParam(required = false) List<String> priceUnits) {
    return unitPriceService.getSalableItemsByCustomer(customerSq, priceType, priceUnits);
  }

  @Operation(summary = "단가 일괄 저장", description = "단가 정보를 등록하거나 수정합니다. (이력 관리)")
  @PostMapping("/save")
  public ApiCommonResponse<Void> save(@RequestBody @Valid List<UnitPriceDto.SaveReq> rows) {
    if (rows == null || rows.isEmpty()) {
      throw new CustomException(ErrorCode.COMMON_BAD_REQUEST, "저장할 데이터가 없습니다.");
    }
    unitPriceService.saveUnitPriceList(rows);
    return ApiCommonResponse.success("단가 정보가 저장되었습니다.", null);
  }

  @Operation(summary = "단가 삭제", description = "선택한 단가 이력을 삭제합니다.")
  @PostMapping("/delete")
  public ApiCommonResponse<Void> delete(@RequestBody UnitPriceDto.DeleteReq req) {
    unitPriceService.deleteUnitPriceList(req);
    return ApiCommonResponse.success("단가 정보가 삭제되었습니다.", null);
  }
}
