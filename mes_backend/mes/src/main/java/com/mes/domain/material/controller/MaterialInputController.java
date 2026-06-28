package com.mes.domain.material.controller;

import com.mes.domain.material.dto.MaterialInputDto;
import com.mes.domain.material.service.MaterialInputService;
import com.mes.global.response.ApiCommonResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 원소재 투입(/api/material/input) HTTP 진입점.
 *
 * <p>한 컨트롤러 안에 성격이 다른 두 종류의 엔드포인트가 섞여 있다.
 * 하나는 현장 PLC 가 토출 때마다 직접 호출하는 외부 수신구(/plc/ingest)이고,
 * 나머지는 적재된 raw 데이터를 목록·분석·집계로 가공해 내부 화면에 돌려주는 조회용이다.
 * FE 연결은 plcRawApi.ts 가 담당한다.
 */
@RestController
@RequestMapping("/api/material/input")
@RequiredArgsConstructor
@Tag(name = "16. 원소재 투입 관리", description = "PLC Raw Data 연동 및 투입량 분석 현황 API")
public class MaterialInputController {

  private final MaterialInputService inputService;

  /* === (a) 외부 PLC 연동 === */

  @Operation(
      summary = "[PLC → MES] 원소재 PLC Raw 수신",
      description = """
          현장 PLC 가 호기를 열 때마다 보내오는 적재 전용 진입점이다.
          넘어온 본문은 별도 변환 없이 그대로 raw 로그 테이블(mes_plc_raw_log_tb)에 쌓아 두며,
          어떤 자재/LOT 인지에 대한 해석은 이후 조회 로직이 담당한다.

          요청 본문 형태:
          {
            "datetime": "2026-06-24 09:12:30",
            "devices": [
              { "device": "P2F3", "value": 3820.5 }
            ]
          }
          """)
  @PostMapping("/plc/ingest")
  public ApiCommonResponse<MaterialInputDto.PlcIngestRes> ingestPlcRaw(
      @RequestBody MaterialInputDto.PlcIngestReq req) {
    return ApiCommonResponse.success("PLC raw 수신 완료", inputService.ingestPlcRaw(req));
  }

  /* === (b) 적재 데이터 조회/분석/집계 === */

  @Operation(summary = "원소재 투입 현황 (Raw Data)",
      description = "PLC 연동으로 적재된 시간대별 raw 데이터를 목록으로 돌려줍니다.")
  @PostMapping("/list")
  public List<MaterialInputDto.RawRes> getRawList(
      @RequestBody MaterialInputDto.RawSearchReq req) {
    return inputService.getRawList(req);
  }

  @Operation(
      summary = "PLC Raw 로그 조회 (원소재투입분석 화면)",
      description = "라인과 기간 조건으로 mes_plc_raw_log_tb 를 직접 읽어 호기별 토출 이벤트를 collected_dt 내림차순으로 반환합니다.")
  @PostMapping("/plc/raw-list")
  public List<MaterialInputDto.PlcRawRes> getPlcRawList(
      @RequestBody MaterialInputDto.PlcRawSearchReq req) {
    return inputService.getPlcRawList(req);
  }

  @Operation(summary = "월별 원소재 투입 현황",
      description = "지정 연도의 총 투입량을 품목 × 월 단위로 묶어 추세 분석용 기초 데이터로 제공합니다.")
  @PostMapping("/status")
  public List<MaterialInputDto.StatusRes> getStatus(
      @RequestBody MaterialInputDto.StatusReq req) {
    return inputService.getStatus(req);
  }

  @Operation(summary = "원소재 투입량 분석",
      description = "적재된 raw 데이터를 레시피 표준값과 견주어 실적 차이를 분석해 돌려줍니다.")
  @PostMapping("/analysis")
  public MaterialInputDto.AnalysisRes analyze(
      @RequestBody MaterialInputDto.AnalysisReq req) {
    return inputService.analyzeInput(req);
  }

  /* === (b') 시뮬레이션/수동 등록 === */

  @Operation(summary = "원소재 투입 실적 저장 (테스트/수동용)",
      description = "Raw Data 시뮬레이션을 위해 데이터를 등록합니다.")
  @PostMapping("/save")
  public ApiCommonResponse<Void> saveData(@RequestBody MaterialInputDto.SaveReq req) {
    inputService.saveData(req);
    return ApiCommonResponse.success("원소재 투입 데이터가 저장되었습니다.", null);
  }
}
