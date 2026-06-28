package com.mes.domain.shipment.controller;

import com.mes.domain.shipment.dto.ShipmentReportDto;
import com.mes.domain.shipment.service.ShipmentReportService;
import com.mes.global.response.ApiCommonResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 출하성적서 출력 화면에 데이터를 공급하는 엔드포인트 모음.
 *
 * 세 가지 동작만 노출한다:
 *   1) 신규 작성용 기본값을 만들어 주는 init-data
 *   2) 편집 결과를 저장하는 save
 *   3) 저장본을 인쇄용으로 되돌려 주는 get
 * 공통 prefix 는 /api/shipment/report 이다.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/shipment/report")
public class ShipmentReportController {

  private final ShipmentReportService reportService;

  /** 저장돼 있던 성적서 한 건을 조회한다. */
  @PostMapping("/get")
  public ShipmentReportDto.Res get(@RequestBody ShipmentReportDto.SearchReq req) {
    ShipmentReportDto.Res found = reportService.get(req);
    return found;
  }

  /** 신규 발행 시 거래처·품목 등 기본값으로 폼을 채운다. */
  @PostMapping("/init-data")
  public ShipmentReportDto.InitRes initData(@RequestBody ShipmentReportDto.SearchReq req) {
    return reportService.getInitData(req);
  }

  /** 작성·수정된 성적서를 영속화한다. */
  @PostMapping("/save")
  public ApiCommonResponse<Void> save(@RequestBody ShipmentReportDto.SaveReq req) {
    reportService.save(req);
    return ApiCommonResponse.success("출하성적서가 저장되었습니다.", null);
  }
}
