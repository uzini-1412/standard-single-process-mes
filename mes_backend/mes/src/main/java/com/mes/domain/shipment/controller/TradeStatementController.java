package com.mes.domain.shipment.controller;

import com.mes.domain.shipment.dto.TradeStatementDto;
import com.mes.domain.shipment.service.TradeStatementService;
import com.mes.global.response.ApiCommonResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 거래명세표 출력 데이터를 제공하는 컨트롤러.
 *
 * 출하지시 한 건(shipOrderSq)을 기준으로 명세표 초기값을 만들고,
 * 사용자가 손본 내용을 저장한 뒤, 인쇄 시 다시 읽어 가는 구조다.
 * 모든 매핑은 /api/shipment/trade-statement 하위에 둔다.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/shipment/trade-statement")
public class TradeStatementController {

  private final TradeStatementService tradeStatementService;

  // 출하지시 식별자(shipOrderSq)를 출발점으로 명세표 초기 데이터를 조립한다.
  @PostMapping("/init-data")
  public TradeStatementDto.InitRes initData(@RequestBody TradeStatementDto.SearchReq req) {
    Long orderSq = req.getShipOrderSq();
    TradeStatementDto.InitRes init = tradeStatementService.getInitDataByShipOrderSq(orderSq);
    return init;
  }

  // 저장돼 있던 명세표 한 건을 읽어 인쇄용 형태로 돌려준다.
  @PostMapping("/get")
  public TradeStatementDto.Res get(@RequestBody TradeStatementDto.SearchReq req) {
    TradeStatementDto.Res stored = tradeStatementService.get(req);
    return stored;
  }

  // 사용자가 편집한 명세표 본문을 영속화한다.
  @PostMapping("/save")
  public ApiCommonResponse<Void> save(@RequestBody TradeStatementDto.SaveReq req) {
    tradeStatementService.save(req);
    return ApiCommonResponse.success("거래명세표가 저장되었습니다.", null);
  }
}
