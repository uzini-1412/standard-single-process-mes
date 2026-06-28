package com.mes.domain.production.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 작업지시 도메인의 입출력 페이로드 모음.
 * 응답 계열(Res / DetailRes)을 먼저 두고, 그 뒤에 조회·저장·상태변경 요청을 배치한다.
 */
public class WorkOrderDto {

  // ────────────────────────────── 응답 ──────────────────────────────

  /** 작업지시 헤더 1건과 그에 딸린 상세 행 목록. */
  @Data
  @NoArgsConstructor
  public static class Res {
    private Long workOrderSq;
    private LocalDate workOrderDate;
    private String priority;
    private String workStatus;

    // 라인
    private Long lineSq;
    private String lineName;

    // 품목 식별 및 규격
    private Long itemSq;
    private String itemCode;
    private String itemName;
    private String itemSpec;
    private String itemType;

    // 평량·치수·생산 파라미터
    private Double basisWeight;
    private Double manageWeight;
    private Double plcWeight;
    private Double width;
    private Double length;
    private Integer targetQty;
    private Double prodSpeed;
    private Double totalWidth;
    private Double totalWeight;
    private Double effectiveWidth;
    private Double estimatedProductionTime;

    // LOT / 레시피 / 비고
    private String lotNo;
    private String productionLotNo;
    private String recipe;
    private String remark;

    // 가동시간 산출용 시각. IN_PROGRESS 진입에 시작이, COMPLETED 진입에 종료가 자동 세팅된다.
    // 작업자앱의 가동시간 표시와 기간별 비가동(투입/실동시간) 집계가 이 값을 참조한다.
    private LocalDateTime workStartTime;
    private LocalDateTime workEndTime;
    private LocalDateTime regDt;

    private List<DetailRes> details;
  }

  /** 응답에 포함되는 작업지시 상세 한 줄. */
  @Data
  @NoArgsConstructor
  public static class DetailRes {
    private Long woDtlSq;
    private String lotNo;
    private Long itemSq;
    private String itemCode;
    private String itemName;
    private Double width;
    private Double length;
    private Double effectiveWidth;
    private Integer orderQty;
  }

  // ────────────────────────────── 조회 요청 ──────────────────────────────

  /** 작업지시 현황 검색 조건(서버 페이징/필터 포함). */
  @Data
  @NoArgsConstructor
  public static class SearchReq {
    @Schema(description = "작업지시일 시작")
    private LocalDate dateFrom;
    @Schema(description = "작업지시일 종료")
    private LocalDate dateTo;

    @Schema(description = "라인 PK")
    private Long lineSq;
    @Schema(description = "라인 이름 (정확일치, 페이징 서버 필터)")
    private String lineName;

    @Schema(description = "품목 코드(부분일치, 페이징 서버 필터)")
    private String itemCode;
    @Schema(description = "품목 이름(부분일치, 페이징 서버 필터)")
    private String itemName;

    @Schema(description = "페이지 (0-based, 미지정 시 0)")
    private Integer page;
    @Schema(description = "페이지 크기 (미지정 시 50)")
    private Integer size;
  }

  /**
   * 원소재 투입분석 상세에서 사용. 지정 라인의 LOT 중 기준일이
   * 지시일·시작일·종료일 가운데 어느 하나라도 일치하면 잡아낸다.
   */
  @Data
  @NoArgsConstructor
  public static class LineDateSearchReq {
    @Schema(description = "라인 이름 (정확일치)")
    private String lineName;
    @Schema(description = "기준일 — 이날 지시 OR 이날 시작 OR 이날 종료된 LOT 모두 포함")
    private LocalDate date;
  }

  // ────────────────────────────── 변경 요청 ──────────────────────────────

  /** 작업지시 저장(신규/수정) 본문. 상세 목록을 함께 받는다. */
  @Data
  @NoArgsConstructor
  public static class SaveReq {
    @Schema(description = "작업지시 PK (신규: null)")
    private Long workOrderSq;

    @NotNull(message = "작업지시일은 필수 입력값입니다.")
    private LocalDate workOrderDate;

    // FE의 4-grid reset 과정에서 lineSq가 비워질 수 있으므로 lineName으로도 식별이 가능하도록 둔다.
    private Long lineSq;
    @NotNull(message = "라인구분은 필수 입력값입니다.")
    private String lineName;
    @NotNull(message = "우선순위는 필수 입력값입니다.")
    private String priority;

    // itemSq가 null이면 service가 itemCode로 폴백 조회하므로 여기에는 @NotNull을 걸지 않는다.
    private Long itemSq;
    private String itemCode;
    private Long recipeSq;

    private Integer targetQty;
    private Double prodSpeed;
    private Double basisWeight;
    @NotNull(message = "관리평량은 필수 입력값입니다.")
    private Double manageWeight;
    @NotNull(message = "중량은 필수 입력값입니다.")
    private Double plcWeight;
    private Double totalWidth;
    private Double totalWeight;
    private Double effectiveWidth;
    private Double estimatedProductionTime;

    private String lotNo;
    private String recipe;
    private String remark;
    private String writerId;

    @NotEmpty(message = "작업지시 상세는 1건 이상 필요합니다.")
    @Valid
    private List<DetailDto> details;
  }

  /** 저장 요청에 실리는 작업지시 상세 한 줄. */
  @Data
  @NoArgsConstructor
  public static class DetailDto {
    private Long woDtlSq;

    // itemSq가 비면 itemCode로 폴백 조회하므로 @NotNull을 걸지 않는다.
    private Long itemSq;
    private String itemCode;

    // LOT No는 서버 자동 채번 대상이며, 수정 시에는 표시 목적으로만 들어온다.
    private String lotNo;

    private Integer orderQty;
    private Double width;
    private Double length;
    private Double effectiveWidth;
    private String remark;
  }

  /** 작업지시 상태 단건 변경. */
  @Data
  @NoArgsConstructor
  public static class StatusUpdateReq {
    @Schema(description = "작업지시 PK")
    private Long workOrderSq;
    @Schema(description = "변경할 상태 (READY, IN_PROGRESS, COMPLETED, STOPPED)")
    private String workStatus;
  }

  /** 작업지시 일괄 삭제 키 목록. */
  @Data
  @NoArgsConstructor
  public static class DeleteReq {
    private List<Long> workOrderIds;
  }
}
