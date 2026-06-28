package com.mes.domain.stock.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.mes.domain.stock.dto.ProductStockDto;
import com.mes.domain.stock.service.ProductStockService;
import com.mes.global.response.ApiCommonResponse;
import com.mes.global.response.PageResponse;

import java.io.IOException;
import java.io.OutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * REST 진입점(/api/product-stock)으로 완제품 재고 현황과 보관위치를 다룬다.
 *
 * <p>제품재고현황·제품재고분석·제품창고입고현황 화면, 그리고 기준정보관리의 재고조정 화면이
 * 이 컨트롤러를 공유한다. FE 호출 모듈은 productInventoryApi / productLocationApi /
 * inventoryAdjustmentApi 세 가지다. 모든 요청은 서비스 계층으로 위임만 한다.</p>
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/product-stock")
@Tag(name = "23. 완제품 재고 관리", description = "완제품 재고 현황 및 보관위치 관리 API")
public class ProductStockController {

  private final ProductStockService productStockService;

  // ----- 현황 / 보관위치 조회 -----

  @Operation(summary = "제품재고/보관위치 현황 조회", description = "품목 단위 현재고와 월별 통계를 함께 반환합니다.")
  @PostMapping("/list")
  public List<ProductStockDto.StatusRes> getStockStatusList(
      @RequestBody ProductStockDto.SearchReq req) {
    return productStockService.getStockStatusList(req);
  }

  @Operation(summary = "제품재고/보관위치 현황 페이징 조회",
      description = "제품재고현황 상단 그리드를 페이지 단위로 끊어서 조회합니다.")
  @PostMapping("/list-paged")
  public PageResponse<ProductStockDto.StatusRes> getStockStatusListPaged(
      @RequestBody ProductStockDto.SearchReq req) {
    return productStockService.getStockStatusListPaged(req);
  }

  @Operation(summary = "품목별 현재고 요약 (최경량)",
      description = "월별 통계·규격·보관위치를 뺀, DB 집계만으로 만든 품목별 현재고(m,EA) 요약.")
  @GetMapping("/current-map")
  public List<ProductStockDto.CurrentStockRes> getCurrentStockMap() {
    return productStockService.getCurrentStockList();
  }

  @Operation(summary = "제품창고입고현황 조회 (경량)",
      description = "품목별 재고 합계에 규격 기반 창고구분/보관위치를 붙여 반환합니다. 월별 통계는 제외됩니다.")
  @PostMapping("/location-list")
  public List<ProductStockDto.LocationRes> getLocationList(
      @RequestBody ProductStockDto.SearchReq req) {
    return productStockService.getLocationList(req);
  }

  @Operation(summary = "개별 LOT 단위 완제품 재고 조회 (페이징)",
      description = "태블릿 재고실사 화면용 LOT별 재고 목록을 페이지 단위로 조회합니다. page 는 0부터, size 미지정 시 50.")
  @PostMapping("/lot-list")
  public PageResponse<ProductStockDto.LotRes> getStockLotList(
      @RequestBody ProductStockDto.SearchReq req) {
    return productStockService.getStockLotListPaged(req);
  }

  @Operation(summary = "품목별 가용 LOT 목록 조회",
      description = "출하지시 폼 전용. itemCode 또는 itemSq 둘 중 하나는 반드시 필요하며, 잔량이 남은 LOT과 생산일보의 측정 롤중량을 함께 내려준다.")
  @GetMapping("/available-lots")
  public List<ProductStockDto.AvailableLotRes> getAvailableLots(
      @RequestParam(value = "itemSq", required = false) Long itemSq,
      @RequestParam(value = "itemCode", required = false) String itemCode) {
    return productStockService.getAvailableLots(itemSq, itemCode);
  }

  // ----- 입출고 이력 -----

  @Operation(summary = "입출고이력 조회",
      description = "지정 품목(+폭)의 INBOUND/SHIP/ADJUST 변동을 시간 순서대로 누적재고와 함께 돌려줍니다. (재고현황 하단 표)")
  @PostMapping("/history")
  public List<ProductStockDto.HistoryRes> getStockHistory(
      @RequestBody ProductStockDto.HistorySearchReq req) {
    return productStockService.getStockHistoryList(req);
  }

  @Operation(summary = "입출고이력 페이징 조회",
      description = "재고현황 하단 이력을 페이지 단위로 조회합니다. 누적량은 전체를 기준으로 산출한 뒤 해당 페이지만 잘라 보냅니다.")
  @PostMapping("/history-paged")
  public PageResponse<ProductStockDto.HistoryRes> getStockHistoryPaged(
      @RequestBody ProductStockDto.HistorySearchReq req) {
    return productStockService.getStockHistoryListPaged(req);
  }

  // ----- 재고실사 (태블릿) -----

  @Operation(summary = "태블릿 재고실사 대상 LOT (자재+완제품 통합)",
      description = "활성 품목 중 잔량>0 인 LOT만 DB에서 추려낸 슬림 응답. 한 번 호출로 재고실사 화면 전체 데이터를 채운다.")
  @PostMapping("/audit/targets")
  public List<ProductStockDto.AuditTargetRes> getAuditTargets() {
    return productStockService.getAuditTargets();
  }

  @Operation(summary = "태블릿 재고실사 대상 LOT 페이징 조회",
      description = "자재·완제품 LOT를 DB에서 통합한 뒤 계정구분 필터와 페이징을 함께 적용합니다.")
  @PostMapping("/audit/targets/page")
  public PageResponse<ProductStockDto.AuditTargetRes> getAuditTargetsPaged(
      @RequestBody ProductStockDto.AuditTargetPageReq req) {
    return productStockService.getAuditTargetsPaged(req);
  }

  @Operation(summary = "태블릿 재고실사 LOT 스캔 조회",
      description = "현재 페이지에 로딩됐는지와 상관없이, 주어진 LOT번호에 해당하는 재고실사 대상을 찾아 반환합니다.")
  @GetMapping("/audit/targets/lookup")
  public List<ProductStockDto.AuditTargetRes> lookupAuditTargets(
      @RequestParam String lotNo) {
    return productStockService.lookupAuditTargets(lotNo);
  }

  @Operation(summary = "재고실사 결과 저장", description = "태블릿에서 측정한 재고실사 결과를 한꺼번에 저장합니다.")
  @PostMapping("/audit/save")
  public ApiCommonResponse<Void> saveInventoryAudit(@RequestBody @Valid ProductStockDto.InventoryAuditSaveReq req) {
    productStockService.saveInventoryAudit(req);
    return ApiCommonResponse.success("재고실사 결과가 저장되었습니다.", null);
  }

  @Operation(summary = "오늘 등록된 재고실사 내역 조회", description = "오늘 날짜로 저장된 실사 내역을 품목별 최신 1건씩 추려 반환합니다.")
  @GetMapping("/audit/today")
  public List<ProductStockDto.InventoryAuditRes> getTodayInventoryAudit() {
    return productStockService.getTodayInventoryAudit();
  }

  @Operation(summary = "재고차이 발생 실사 내역 조회", description = "측정재고와 시스템재고가 어긋나는 실사 내역을 품목+LOT 최신 1건 단위로 반환합니다.")
  @GetMapping("/audit/diff-list")
  public List<ProductStockDto.InventoryAuditRes> getInventoryAuditWithDiff() {
    return productStockService.getInventoryAuditWithDiff();
  }

  // ----- 재고조정 -----

  @Operation(summary = "재고실사 → 재고조정 반영",
      description = "선택한 실사 결과를 실재고(자재/완제품)에 반영하고 그 변동을 이력으로 남깁니다.")
  @PostMapping("/audit/apply")
  public ApiCommonResponse<Void> applyInventoryAdjustment(
      @RequestBody ProductStockDto.InventoryAuditApplyReq req) {
    productStockService.applyInventoryAdjustment(req);
    return ApiCommonResponse.success("재고조정이 반영되었습니다.", null);
  }

  @Operation(summary = "제품 재고 조정", description = "재고 실사 뒤 시스템 보유 수량을 강제 보정합니다.")
  @PostMapping("/adjust")
  public ApiCommonResponse<Void> adjustStock(@RequestBody @Valid ProductStockDto.SaveReq req) {
    productStockService.adjustStock(req);
    return ApiCommonResponse.success("재고가 조정되었습니다.", null);
  }

  @Operation(summary = "재고조정 이력 목록 조회",
      description = "이미 재고에 반영된 실사 이력(applied_yn='Y')을 조회합니다. (기준정보관리 / 재고조정관리 화면)")
  @PostMapping("/audit/applied-list")
  public List<ProductStockDto.AppliedAuditRes> getAppliedAuditList(
      @RequestBody ProductStockDto.AppliedAuditSearchReq req) {
    return productStockService.getAppliedAuditList(req);
  }

  @Operation(summary = "재고조정 이력 상세 조회", description = "audit_sq 를 키로 재고조정 이력 한 건을 조회합니다.")
  @PostMapping("/audit/applied-detail")
  public ProductStockDto.AppliedAuditRes getAppliedAuditDetail(
      @RequestBody ProductStockDto.InventoryAuditApplyReq req) {
    return productStockService.getAppliedAuditDetail(req.getAuditSq());
  }

  @Operation(summary = "재고조정 이력 일괄 삭제",
      description = "선택한 재고조정 이력(audit) 행만 제거하며, 실재고 자체는 손대지 않습니다.")
  @PostMapping("/audit/applied-delete")
  public ApiCommonResponse<Void> deleteAppliedAudit(
      @RequestBody ProductStockDto.AppliedAuditDeleteReq req) {
    productStockService.deleteAppliedAuditList(req.getAuditSqs());
    return ApiCommonResponse.success("재고조정 이력이 삭제되었습니다.", null);
  }

  // ----- 엑셀 스트리밍 다운로드 -----

  @Operation(summary = "제품재고현황 엑셀 다운로드 (스트리밍)",
      description = "SXSSF 백엔드 스트리밍 방식. 현황 화면용 14개 컬럼.")
  @PostMapping("/export-status")
  public void exportStockStatusExcel(@RequestBody ProductStockDto.SearchReq req,
      HttpServletResponse response) throws IOException {
    streamXlsx(response, "제품재고현황.xlsx",
        sink -> productStockService.streamStockStatusExcel(req, sink));
  }

  @Operation(summary = "제품재고분석 엑셀 다운로드 (스트리밍)",
      description = "SXSSF 백엔드 스트리밍 방식. 분석 화면용 18개 컬럼(3개월 추세·예정량 포함).")
  @PostMapping("/export-analysis")
  public void exportStockAnalysisExcel(@RequestBody ProductStockDto.SearchReq req,
      HttpServletResponse response) throws IOException {
    streamXlsx(response, "제품재고분석.xlsx",
        sink -> productStockService.streamStockAnalysisExcel(req, sink));
  }

  /**
   * 파일명 앞에 오늘 날짜를 붙여 첨부파일 응답 헤더를 구성한 뒤, 콜백에 응답 OutputStream 을
   * 그대로 넘겨 xlsx 바이트를 흘려보낸다.
   */
  private static void streamXlsx(HttpServletResponse response, String baseName,
      XlsxStreamSink sink) throws IOException {
    String fileName = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE) + "-" + baseName;
    String encoded = URLEncoder.encode(fileName, StandardCharsets.UTF_8).replace("+", "%20");

    response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    response.setHeader(HttpHeaders.CONTENT_DISPOSITION,
        "attachment; filename=\"" + encoded + "\"; filename*=UTF-8''" + encoded);

    try (OutputStream out = response.getOutputStream()) {
      sink.write(out);
    }
  }

  @FunctionalInterface
  private interface XlsxStreamSink {
    void write(OutputStream out) throws IOException;
  }
}
