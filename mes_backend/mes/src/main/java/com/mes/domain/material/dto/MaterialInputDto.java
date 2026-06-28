package com.mes.domain.material.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 원소재 투입 도메인의 입출력 DTO 모음.
 *
 * <p>아래 중첩 타입은 "들어오는 요청" 묶음과 "내려보내는 응답" 묶음으로 나눠 배치했다.
 * 각 필드 이름은 프론트 JSON 및 외주 PLC 페이로드 규약과 1:1로 묶여 있어 이름은 손대지 않는다.
 */
public class MaterialInputDto {

  // ==================================================================
  // 1) 요청(Request) 계열
  // ==================================================================

  /**
   * 외주 PLC가 호기 개방 시점마다 전송하는 적재 페이로드.
   * 측정시각은 epoch 초({@code sent})를 1순위로 사용하고, 구형 설비의 {@code datetime} 도 함께 받는다.
   * 보기: {@code { "sent": 1780559804, "devices": [ { "device": "P1F1", "value": 1110, "unit": "g" } ] }}
   */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class PlcIngestReq {
    @Schema(description = "디바이스별 측정값 목록")
    private List<PlcDeviceValue> devices;

    @Schema(description = "PLC 측정 시각 (Unix epoch seconds, KST 기준 변환)", example = "1780559804")
    private Long sent;

    @Schema(description = "PLC 측정 시각 (yyyy-MM-dd HH:mm:ss) - 레거시 호환", example = "2026-05-13 17:49:01")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime datetime;
  }

  /** PLC 페이로드 안에 담기는 단위 측정값 한 건. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class PlcDeviceValue {
    @Schema(description = "디바이스 코드 (라인+호기, 예: P1F1)", example = "P1F1")
    private String device;

    @Schema(description = "value 단위 (예: g, kg)", example = "g")
    private String unit;

    @Schema(description = "이번 사이클 토출량")
    private Double value;
  }

  /** 원소재투입분석 화면에서 라인·기간으로 PLC Raw 를 조회할 때의 요청. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class PlcRawSearchReq {
    @Schema(description = "라인 코드 (예: P1)", example = "P1")
    private String lineCode;

    @Schema(description = "조회 시작일 (포함)")
    private LocalDate dateFrom;

    @Schema(description = "조회 종료일 (포함)")
    private LocalDate dateTo;
  }

  /** 저장된 투입 실적 목록을 거를 때의 검색 조건. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class RawSearchReq {
    private Long lineSq;
    private Long itemSq;
    private LocalDate dateFrom;
    private LocalDate dateTo;
  }

  /** 투입량 분석 1건을 요청할 때의 키 + 기준 중량. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class AnalysisReq {
    private Long lineSq;
    private Long itemSq;
    private LocalDate workDate;

    @Schema(description = "관리자가 입력하는 총 생산 중량 (기준)")
    private Double totalWeight;
  }

  /** 연도별 사용량 집계 요청. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class StatusReq {
    private Integer year;
    private String itemCode;
  }

  /** 투입 실적을 수동/테스트로 직접 적재할 때의 본문. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class SaveReq {
    private Long lineSq;
    private Long itemSq;
    private LocalDate workDate;
    private Double totalTargetWeight;
    private List<DetailSaveDto> details;
  }

  /** {@link SaveReq} 안의 시간대별 투입 상세 한 줄. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class DetailSaveDto {
    private String timeRange;
    private Double matA;
    private Double matB;
    private Double matC;
    private Double matD;
  }

  // ==================================================================
  // 2) 응답(Response) 계열
  // ==================================================================

  /** PLC 적재 처리 결과 — 받은 건수와 반영 시각. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class PlcIngestRes {
    private Integer receivedCount;
    private LocalDateTime datetime;
  }

  /** PLC Raw 로그 한 줄. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class PlcRawRes {
    private String deviceCode;
    private String lineCode;
    private String feederNo;
    private String unit;
    private Double value;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime collectedDt;
  }

  /** 투입 실적 헤더 1건 — 하단에 시간대별 Raw 상세를 동봉한다. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class RawRes {
    private Long inputSq;
    private Long lineSq;
    private Long itemSq;
    private String facilityName;
    private LocalDate workDate;
    private Double totalTargetWeight;
    private Double totalActualWeight;

    // 화면 하단 그리드에 깔리는 시간대별 PLC Raw
    private List<RawDetailRes> rawDetails;
  }

  /** 투입 실적의 시간대별 상세(원소재 A~D 사용량). */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class RawDetailRes {
    private String workTimeRange;
    private Double matAUsage;
    private Double matBUsage;
    private Double matCUsage;
    private Double matDUsage;
    private Double rowTotalUsage;
  }

  /** 투입량 분석 응답 — 표준 비율/중량 헤더와 시간대별 상세. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class AnalysisRes {
    private String facilityName;
    private String itemCode;
    private String itemName;
    private Double totalWeight;

    private Double stdRatioA;
    private Double stdRatioB;
    private Double stdRatioC;
    private Double stdRatioD;

    private Double stdWeightA;
    private Double stdWeightB;
    private Double stdWeightC;
    private Double stdWeightD;

    private List<AnalysisDetailRes> details;
  }

  /** 투입량 분석 상세 — 시간대별 실적값과 표준값을 나란히 둔다. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class AnalysisDetailRes {
    private String timeRange;

    private Double actualA;
    private Double actualB;
    private Double actualC;
    private Double actualD;

    private Double standardA;
    private Double standardB;
    private Double standardC;
    private Double standardD;

    private Double rowTotal;
  }

  /** 품목별 1~12월 사용량과 연 합계. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class StatusRes {
    private Long itemSq;
    private String itemCode;
    private String itemName;

    private Double mon1;
    private Double mon2;
    private Double mon3;
    private Double mon4;
    private Double mon5;
    private Double mon6;
    private Double mon7;
    private Double mon8;
    private Double mon9;
    private Double mon10;
    private Double mon11;
    private Double mon12;

    private Double totalYear;
  }
}
