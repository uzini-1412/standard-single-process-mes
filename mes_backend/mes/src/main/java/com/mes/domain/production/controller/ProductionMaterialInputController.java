package com.mes.domain.production.controller;

import com.mes.domain.production.dto.MaterialInputDto;
import com.mes.domain.production.service.ProductionMaterialInputService;
import com.mes.global.response.ApiCommonResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/*
 * 작업지시 한 건에 묶이는 원소재 투입 기록 엔드포인트(/api/production/material-input).
 *
 * 흐름은 현장 작업자앱(mes_op)에서 "조회 → 저장(예약분 기록) → 확정(재고 실차감)" 순으로 진행된다.
 * 컨트롤러는 요청을 풀어 서비스로 넘기는 역할만 하고, 판단 로직은 서비스 계층이 전담한다.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/production/material-input")
public class ProductionMaterialInputController {

  private final ProductionMaterialInputService materialInputService;

  @PostMapping("/save")
  public ApiCommonResponse<Void> save(@RequestBody MaterialInputDto.SaveReq req) {
    materialInputService.saveInputRecords(req);
    return ApiCommonResponse.success("원료투입이 저장되었습니다.", null);
  }

  @PostMapping("/confirm")
  public ApiCommonResponse<Void> confirm(@RequestBody MaterialInputDto.ConfirmReq req) {
    Long workOrderSq = req.getWorkOrderSq();
    materialInputService.confirmInputRecords(workOrderSq);
    return ApiCommonResponse.success("원료투입이 확정되었습니다.", null);
  }

  @PostMapping("/list")
  public List<MaterialInputDto.Res> list(@RequestBody MaterialInputDto.ListReq req) {
    return materialInputService.getInputRecords(req.getWorkOrderSq());
  }
}
