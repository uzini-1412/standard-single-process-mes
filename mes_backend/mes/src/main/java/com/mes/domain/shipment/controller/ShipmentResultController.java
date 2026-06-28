package com.mes.domain.shipment.controller;

import com.mes.domain.shipment.dto.ShipmentResultDto;
import com.mes.domain.shipment.service.ShipmentResultService;
import com.mes.global.response.ApiCommonResponse;
import com.mes.global.response.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 출하실적(실제 출하 처리) 화면용 엔드포인트.
 *
 * 흐름은 "QR 스캔 → 실적 저장 → 목록 확인" 순서다.
 * 목록 조회는 엑셀 추출용 전체 조회와 그리드용 페이징 조회 두 갈래를 모두 제공한다.
 * 베이스 경로는 /api/shipment/result.
 */
@RestController
@RequestMapping("/api/shipment/result")
@RequiredArgsConstructor
@Tag(name = "22. 출하 실적 관리", description = "실제 출하 처리 및 실적 조회 API")
public class ShipmentResultController {

  private final ShipmentResultService resultService;

  // 화면 메인 그리드가 쓰는 페이징 조회. 기본 페이지 크기는 서비스 측 기본값을 따른다.
  @Operation(summary = "출하실적 목록 조회 (페이징)",
      description = "출하관리 화면용. page(0-based), size(기본 50). 응답은 PageResponse<T>")
  @PostMapping("/list-paged")
  public PageResponse<ShipmentResultDto.Res> getResultListPaged(@RequestBody ShipmentResultDto.SearchReq req) {
    PageResponse<ShipmentResultDto.Res> page = resultService.getResultListPaged(req);
    return page;
  }

  // 엑셀 추출 등 전체 데이터를 한 번에 뽑는 비페이징 조회.
  @Operation(summary = "출하실적 목록 조회", description = "기간별 출하실적을 조회합니다.")
  @PostMapping("/list")
  public List<ShipmentResultDto.Res> getResultList(@RequestBody ShipmentResultDto.SearchReq req) {
    List<ShipmentResultDto.Res> rows = resultService.getResultList(req);
    return rows;
  }

  // 스캔으로 모은 LOT 와 실제 출하수량을 확정 저장한다(멱등 처리).
  @Operation(summary = "출하실적 등록", description = "출하지시 건에 대해 스캔된 LOT와 실제 출하 수량을 저장합니다.")
  @PostMapping("/save")
  public ApiCommonResponse<Void> saveResult(@RequestBody @Valid List<ShipmentResultDto.SaveReq> req) {
    resultService.saveResult(req);
    return ApiCommonResponse.success("출하실적이 확정되었습니다.", null);
  }

  // 태블릿에서 QR 을 찍는 순간 LOT 단건 정보를 미리 보여 주는 진입점.
  @Operation(summary = "LOT QR 스캔 조회", description = "스캔된 LOT 번호로 완제품 재고/품목 정보를 조회합니다.")
  @GetMapping("/scan")
  public ShipmentResultDto.ScanLotRes scanLot(@RequestParam String lotNo) {
    ShipmentResultDto.ScanLotRes scanned = resultService.scanLot(lotNo);
    return scanned;
  }
}
