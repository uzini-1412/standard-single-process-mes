package com.mes.domain.shipment.controller;

import com.mes.domain.shipment.dto.ShipmentDto;
import com.mes.domain.shipment.service.ShipmentService;
import com.mes.global.response.ApiCommonResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 출하 영역의 단일 컨트롤러. 출하계획 화면과 출하지시관리 화면이 같은 베이스(/api/shipment)를
 * 공유하므로, 경로 접두사 /plan · /order 로 두 메뉴를 구분해 처리한다.
 * 그 밖에 재고 조회·Lot 채번 같은 보조 API 도 여기에 함께 둔다.
 */
@RestController
@RequestMapping("/api/shipment")
@RequiredArgsConstructor
@Tag(name = "21. 출하 관리", description = "출하 계획 및 지시 관리 API")
public class ShipmentController {

  private final ShipmentService shipmentService;

  // ===== 보조 API: 재고/채번 =====

  @Operation(summary = "품목별 재고·보관위치 조회", description = "품목코드로 현재 완제품 재고량과 보관위치를 조회합니다.")
  @GetMapping("/item-stock")
  public ApiCommonResponse<ShipmentDto.ItemStockRes> getItemStock(@RequestParam String itemCode) {
    return ApiCommonResponse.success("조회 성공", shipmentService.getItemStock(itemCode));
  }

  @Operation(summary = "다음 출하계획 Lot-No 미리 조회", description = "저장하지 않고 다음 부여될 Lot-No를 조회합니다.")
  @GetMapping("/plan/next-lot-no")
  public ApiCommonResponse<String> getNextLotNo() {
    return ApiCommonResponse.success("조회 성공", shipmentService.generateNextLotNo());
  }

  // ===== 출하지시 (/order) =====

  @Operation(summary = "출하지시 목록 조회")
  @PostMapping("/order/list")
  public ApiCommonResponse<List<ShipmentDto.OrderListItemRes>> getOrderList(
      @RequestBody(required = false) ShipmentDto.OrderSearchReq req) {
    // 본문을 생략한 호출(전체 조회)도 허용하므로 빈 조건으로 보정한다.
    ShipmentDto.OrderSearchReq cond = (req != null) ? req : new ShipmentDto.OrderSearchReq();
    return ApiCommonResponse.success("출하지시 목록 조회 성공", shipmentService.getOrderList(cond));
  }

  // FE 가 평탄화해 보낸 여러 행을 한 번에 지시로 등록한다.
  @Operation(summary = "출하지시 저장 (평탄화 목록)")
  @PostMapping("/order/save-list")
  public ApiCommonResponse<Void> saveFlatOrderList(@RequestBody List<ShipmentDto.FlatOrderSaveReq> req) {
    shipmentService.saveFlatOrderList(req);
    return ApiCommonResponse.success("출하지시가 등록되었습니다.", null);
  }

  // 경로의 PK 와 본문을 함께 넘겨 기존 지시 한 건을 갱신한다.
  @Operation(summary = "출하지시 수정")
  @PutMapping("/order/{shipOrderSq}")
  public ApiCommonResponse<Void> updateOrder(@PathVariable Long shipOrderSq,
                                             @RequestBody ShipmentDto.FlatOrderSaveReq req) {
    shipmentService.updateOrder(shipOrderSq, req);
    return ApiCommonResponse.success("출하지시가 수정되었습니다.", null);
  }

  // PK 로 지시 한 건을 제거한다.
  @Operation(summary = "출하지시 삭제")
  @DeleteMapping("/order/{shipOrderSq}")
  public ApiCommonResponse<Void> deleteOrder(@PathVariable Long shipOrderSq) {
    shipmentService.deleteOrder(shipOrderSq);
    return ApiCommonResponse.success("출하지시가 삭제되었습니다.", null);
  }

  // ===== 출하계획 (/plan) =====

  @Operation(summary = "출하계획 목록 조회")
  @PostMapping("/plan/list")
  public ApiCommonResponse<List<ShipmentDto.PlanRes>> getPlanList(
      @RequestBody(required = false) ShipmentDto.PlanSearchReq req) {
    // 검색 조건이 비어 들어오면 기본 조건 객체로 대체해 전체를 조회한다.
    ShipmentDto.PlanSearchReq cond = (req != null) ? req : new ShipmentDto.PlanSearchReq();
    return ApiCommonResponse.success("출하계획 목록 조회 성공", shipmentService.getPlanList(cond));
  }

  // 계획 한 건을 신규로 저장한다.
  @Operation(summary = "출하계획 저장 (단건)")
  @PostMapping("/plan/save")
  public ApiCommonResponse<Void> savePlan(@RequestBody ShipmentDto.PlanSaveReq req) {
    shipmentService.savePlan(req);
    return ApiCommonResponse.success("출하계획이 저장되었습니다.", null);
  }

  // 여러 계획을 한 요청으로 묶어 저장한다.
  @Operation(summary = "출하계획 저장 (다건)")
  @PostMapping("/plan/save-list")
  public ApiCommonResponse<Void> savePlanList(@RequestBody List<ShipmentDto.PlanSaveReq> req) {
    shipmentService.savePlanList(req);
    return ApiCommonResponse.success("출하계획이 저장되었습니다.", null);
  }

  // 수정은 경로 PK 를 본문에 주입한 뒤 단건 저장 로직을 그대로 재사용한다.
  @Operation(summary = "출하계획 수정")
  @PutMapping("/plan/{planSq}")
  public ApiCommonResponse<Void> updatePlan(@PathVariable Long planSq,
                                            @RequestBody ShipmentDto.PlanSaveReq req) {
    req.setPlanSq(planSq);
    shipmentService.savePlan(req);
    return ApiCommonResponse.success("출하계획이 수정되었습니다.", null);
  }

  // PK 로 계획 한 건을 제거한다.
  @Operation(summary = "출하계획 삭제")
  @DeleteMapping("/plan/{planSq}")
  public ApiCommonResponse<Void> deletePlan(@PathVariable Long planSq) {
    shipmentService.deletePlan(planSq);
    return ApiCommonResponse.success("출하계획이 삭제되었습니다.", null);
  }
}
