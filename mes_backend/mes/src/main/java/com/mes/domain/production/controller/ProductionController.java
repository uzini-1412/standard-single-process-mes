package com.mes.domain.production.controller;
import com.mes.global.exception.CustomException;

import com.mes.domain.production.dto.ProductionDto;
import com.mes.domain.production.service.ProductionService;
import com.mes.global.exception.ErrorCode;
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
import java.util.Map;

/*
 * 생산 관리 REST 엔드포인트(/api/production).
 *
 * 두 종류의 책임을 한 곳에 모았다.
 *   1) plan/*        — 등록·조회·삭제가 가능한 월/일 단위 생산계획 (DB 영속)
 *   2) requirement/* — 매 호출마다 수주·재고·출하실적을 합산해 그 자리에서 계산하는 소요량 (영속화하지 않음)
 *
 * 화면 측에서는 productionPlanApi 와 productionRequirementApi 가 각각 대응한다.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/production")
@Tag(name = "17. 생산 관리", description = "소요량 산출 및 생산계획 API")
public class ProductionController {

  private final ProductionService prodService;

  // ---------------------------------------------------------------- 생산계획 CRUD

  @Operation(summary = "생산 계획 조회", description = "일자별, 라인별 생산 계획을 조회합니다.")
  @PostMapping("/plan/list")
  public List<ProductionDto.PlanRes> getPlanList(@RequestBody ProductionDto.PlanSearchReq req) {
    return prodService.getPlanList(req);
  }

  @Operation(summary = "생산 계획 저장", description = "생산 계획을 등록하거나 수정합니다.")
  @PostMapping("/plan/save")
  public ApiCommonResponse<Void> savePlan(@RequestBody @Valid List<ProductionDto.PlanSaveReq> req) {
    // 내려온 항목이 하나도 없으면 서비스를 호출하지 않고 곧장 400 으로 응답한다.
    boolean nothingToSave = (req == null) || req.isEmpty();
    if (nothingToSave) {
      throw new CustomException(ErrorCode.COMMON_BAD_REQUEST, "저장할 데이터가 없습니다.");
    }
    prodService.savePlanList(req);
    return ApiCommonResponse.success("생산 계획이 저장되었습니다.", null);
  }

  @Operation(summary = "생산 계획 삭제", description = "선택한 생산 계획을 삭제합니다.")
  @PostMapping("/plan/delete")
  public ApiCommonResponse<Void> deletePlan(@RequestBody ProductionDto.PlanDeleteReq req) {
    prodService.deletePlanList(req);
    return ApiCommonResponse.success("생산 계획이 삭제되었습니다.", null);
  }

  // ---------------------------------------------------------------- 소요량 산출(실시간)

  @Operation(summary = "생산 소요량 산출 내역 조회",
      description = "수주/재고/출하실적 기반으로 실시간 산출한 생산 소요량 목록을 반환합니다.")
  @PostMapping("/requirement/list")
  public List<ProductionDto.ReqRes> getRequirementList(
      @RequestBody ProductionDto.ReqCalcReq req) {
    return prodService.getRequirementList(req);
  }

  @Operation(summary = "출하예정량 Map 조회",
      description = "품번별 출하예정량(저번달 기준 직전 3개월 평균 출하량 - 당월 출하량) Map을 반환합니다.")
  @PostMapping("/requirement/expected-shipment-map")
  public Map<String, Double> getExpectedShipmentMap() {
    return prodService.getExpectedShipmentByItemCode();
  }
}
