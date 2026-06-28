package com.mes.domain.production.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Wire payloads around work results (작업실적): the shared search filter, the
 * master+roll save request, the list/detail responses and the monthly chart
 * aggregate.
 */
public class WorkResultDto {

  /* ============ 요청 ============ */

  // Shared filter for the 실적 / 불량 / 중량 현황 screens.
  @Getter
  @Setter
  @NoArgsConstructor
  public static class SearchReq {
    private LocalDate dateFrom;
    private LocalDate dateTo;

    private Long lineSq;
    private String lineName;
    private String lotNo;

    // Item filter, applied server-side together with paging.
    private String itemCode;
    private String itemName;

    // Paging for the 생산실적 현황 grid.
    private Integer page;
    private Integer size;

    // Server-side sort driven by header clicks. direction is ASC | DESC.
    private String sortField;
    private String sortDirection;
  }

  // One roll line inside a save request.
  @Getter
  @Setter
  @NoArgsConstructor
  public static class DetailDto {
    private Long resultDtlSq;

    @NotBlank(message = "LOT번호를 입력해 주세요.")
    private String lotNo;
    private Integer rollNo;

    private Double prodWidth;
    private Double prodLength;
    private Double realBasisWeight;
    private Double netWeight;    // 실중량
    private Double grossWeight;  // 롤중량

    private LocalDateTime workStartDt;
    private LocalDateTime workEndDt;

    private String judgeCode;   // OK / NG
    private String defectType;
    private String remark;
  }

  // Result registration: master header plus its roll-level detail rows.
  @Getter
  @Setter
  @NoArgsConstructor
  public static class SaveReq {
    @NotNull(message = "작업지시 정보가 필요합니다.")
    private Long workOrderSq;

    private Long resultSq; // present only when editing

    @NotNull(message = "작업일자를 입력해 주세요.")
    private LocalDate workDate;

    @NotNull(message = "품목을 선택해 주세요.")
    private Long itemSq;

    private Long lineSq;
    private String lineName;
    private String writerId;

    // Full working window for the run.
    private LocalDateTime startTime;
    private LocalDateTime endTime;

    // Quality totals, keyed in on completion.
    private Integer totalProdQty;
    private Integer goodQty;
    private Integer badQty;
    private String appearanceDefect; // 외관불량
    private String dimensionDefect;  // 치수불량

    @Valid
    private List<DetailDto> details;
  }

  /* ============ 응답 ============ */

  // Per-line monthly produced length (m); feeds the 생산추이 chart.
  @Getter
  @Setter
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class LineMonthlySum {
    private String lineName;
    private Integer month;
    private Double qty;
  }

  // Roll-level detail used by the 중량 / 불량 현황 views.
  @Getter
  @Setter
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class DetailRes {
    private Long resultDtlSq;
    private String lotNo;
    private Integer rollNo;

    private Double prodWidth;
    private Double prodLength;
    private Double realBasisWeight;
    private Double netWeight;
    private Double grossWeight;

    private String judgeCode;
    private String defectType;
    private String defectTypeName; // 공통코드 표시명

    private LocalDateTime workStartDt;
    private LocalDateTime workEndDt;
  }

  // One row of the 작업실적 현황 list.
  @Getter
  @Setter
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class ResultListRes {
    private Long resultSq;
    private Long workOrderSq;
    private LocalDate workDate;

    private Long lineSq;
    private String lineName;

    private Long itemSq;
    private String itemCode;
    private String itemName;
    private Double basisWeight;
    private Double width;
    private Double length;

    private Integer targetQty;     // planned quantity from the work order
    private Integer totalProdQty;
    private Integer totalGoodQty;
    private Integer totalBadQty;

    private Double realBasisWeight;     // measured per-roll grammage (g/m²); same meaning as WorkResultDetail.realBasisWeight
    private Double plannedManageWeight; // work-order master 관리평량 (g/m²), a single width-independent value
    private Double manageLength;        // 관리길이
    private Double grossWeight;         // total roll weight

    private String appearanceDefect; // 외관불량
    private String dimensionDefect;  // 치수불량

    private LocalDateTime startTime;
    private LocalDateTime endTime;

    private String lotNo;
    private String productionLotNo;

    private List<DetailRes> details;
  }
}
