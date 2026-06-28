package com.mes.domain.material.controller;
import com.mes.global.exception.CustomException;

import com.mes.domain.material.dto.MaterialInboundDto;
import com.mes.domain.material.service.MaterialInboundService;
import com.mes.global.exception.ErrorCode;
import com.mes.global.response.ApiCommonResponse;
import com.mes.global.response.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.io.OutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * /api/material/inbound 하나로 세 화면을 동시에 떠받치는 컨트롤러.
 *
 * <p>가입고관리·입고현황·자재재고현황은 UI 상 별개 메뉴지만, 실제로는 mes_material_inbound_tb
 * 한 테이블을 어떤 관점(원본/집계/이력)으로 풀어 보느냐의 차이일 뿐이다. 프런트는 preReceivingApi.ts 가 매핑한다.
 */
@RestController
@RequestMapping("/api/material/inbound")
@RequiredArgsConstructor
@Tag(name = "13. 자재 입고 관리", description = "가입고 등록 및 현황 조회 API")
public class MaterialInboundController {

  private final MaterialInboundService inboundService;

  //region 조회 계열

  @Operation(summary = "가입고 목록 조회", description = "검색 조건에 해당하는 가입고 내역을 반환합니다. 입고현황 메뉴도 동일 엔드포인트를 사용합니다.")
  @PostMapping("/list")
  public List<MaterialInboundDto.Res> getList(
      @RequestBody MaterialInboundDto.SearchReq req) {
    return inboundService.getList(req);
  }

  @Operation(
      summary = "자재재고현황 페이징 조회",
      description = "품목 단위 합계와 안전재고 비교 결과를 페이지 단위로 돌려줍니다. excludeAccountTypes 로 완제품을 걸러낼 수 있습니다.")
  @PostMapping("/inventory-list-paged")
  public PageResponse<MaterialInboundDto.InventoryGroupRes> getInventoryListPaged(
      @RequestBody MaterialInboundDto.SearchReq req) {
    return inboundService.getInventoryListPaged(req);
  }

  @Operation(summary = "자재재고현황 전체 조회 (엑셀 export)", description = "페이징을 적용하지 않고 그룹 전체를 한 번에 반환합니다.")
  @PostMapping("/inventory-list-all")
  public List<MaterialInboundDto.InventoryGroupRes> getInventoryListAll(
      @RequestBody MaterialInboundDto.SearchReq req) {
    return inboundService.getInventoryListAll(req);
  }

  @Operation(
      summary = "자재재고현황 이력 페이징 조회",
      description = "행을 클릭한 품목(itemSq)에 대해 시간 순서대로 누적된 잔량 이력을 페이지 단위로 반환합니다.")
  @PostMapping("/inventory-history-paged")
  public PageResponse<MaterialInboundDto.InventoryHistoryRes> getInventoryHistoryPaged(
      @RequestBody MaterialInboundDto.InventoryHistoryReq req) {
    return inboundService.getInventoryHistoryPaged(req);
  }

  @Operation(
      summary = "특정 품목 inbound 원본 조회 (재고수정 팝업용)",
      description = "재고수정 팝업의 REGISTER 입고 라디오 선택에 쓰입니다. 한 품목의 inbound 전부를 페이징 없이 반환합니다(보통 소량).")
  @PostMapping("/inbounds-by-item")
  public List<MaterialInboundDto.Res> getInboundsByItem(
      @RequestBody MaterialInboundDto.InventoryHistoryReq req) {
    return inboundService.getInboundsByItemSq(req.getItemSq());
  }

  //endregion

  //region 엑셀 스트리밍

  @Operation(
      summary = "자재재고현황 엑셀 다운로드 (스트리밍)",
      description = "SXSSF 스트리밍 방식으로 서버에서 .xlsx 를 바로 만들어 내려보냅니다. 적용되는 검색 필터는 목록 조회와 같습니다.")
  @PostMapping("/inventory-export")
  public void exportInventoryExcel(@RequestBody MaterialInboundDto.SearchReq req,
      HttpServletResponse response) throws IOException {
    attachXlsxHeaders(response, "자재재고현황");
    try (OutputStream out = response.getOutputStream()) {
      inboundService.streamInventoryExcel(req, out);
    }
  }

  /**
   * 응답에 xlsx 다운로드용 Content-Type 과 Content-Disposition 을 건다.
   * 파일명은 "{오늘}-{baseName}.xlsx" 이며, 한글 깨짐 방지를 위해 RFC 5987 filename* 까지 같이 내린다.
   */
  private static void attachXlsxHeaders(HttpServletResponse response, String baseName) {
    String today = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
    String rawName = today + "-" + baseName + ".xlsx";
    String encoded = URLEncoder.encode(rawName, StandardCharsets.UTF_8).replace("+", "%20");

    StringBuilder disposition = new StringBuilder("attachment; ")
        .append("filename=\"").append(encoded).append("\"; ")
        .append("filename*=UTF-8''").append(encoded);

    response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    response.setHeader(HttpHeaders.CONTENT_DISPOSITION, disposition.toString());
  }

  //endregion

  //region 등록 / 수정 / 삭제 / 채번

  @Operation(summary = "구매 LOT-No 미리보기", description = "발주상세 PK 를 받아 다음에 부여될 구매 LOT-No 를 미리 만들어 보여 줍니다.")
  @PostMapping("/generate-purchase-lot-no")
  public Map<String, String> generatePurchaseLotNo(
      @RequestBody MaterialInboundDto.GeneratePurchaseLotNoReq req) {
    String nextLotNo = inboundService.generatePurchaseLotNo(req.getOrderDtlSq());
    return Collections.singletonMap("purchaseLotNo", nextLotNo);
  }

  @Operation(summary = "가입고 일괄 등록", description = "발주 품목을 가입고(임시입고) 상태로 등록하면서 LOT 번호를 함께 채번합니다.")
  @PostMapping("/save")
  public ApiCommonResponse<Void> save(@RequestBody @Valid List<MaterialInboundDto.SaveReq> req) {
    if (req == null || req.isEmpty()) {
      throw new CustomException(ErrorCode.COMMON_BAD_REQUEST, "저장할 데이터가 없습니다.");
    }
    inboundService.saveInboundList(req);
    return ApiCommonResponse.success("가입고 정보가 저장되었습니다.", null);
  }

  @Operation(summary = "가입고 삭제", description = "검사 전 상태인 가입고 내역만 선택 삭제합니다.")
  @PostMapping("/delete")
  public ApiCommonResponse<Void> delete(@RequestBody MaterialInboundDto.DeleteReq req) {
    inboundService.deleteInboundList(req);
    return ApiCommonResponse.success("가입고 정보가 삭제되었습니다.", null);
  }

  //endregion
}
