package com.mes.domain.production.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * Wire payloads for the production-planning flow: requirement calculation
 * (수주 기반 소요량) and the resulting daily plans (생산계획).
 */
public class ProductionDto {

  /* ---- 생산계획 등록/삭제/조회 요청 ---- */

  @Getter
  @Setter
  @NoArgsConstructor
  public static class PlanSearchReq {
    private Long lineSq;
    private LocalDate dateFrom;
    private LocalDate dateTo;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  public static class PlanDeleteReq {
    private List<Long> planIds;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  public static class PlanSaveReq {
    @Schema(description = "계획 식별자, 신규 등록 시 비워 둔다")
    private Long planSq;

    @NotNull(message = "계획일자를 입력해 주세요.")
    private LocalDate planDate;

    @NotNull(message = "품목을 선택해 주세요.")
    private Long itemSq;
    private String itemCode;

    private Long lineSq;
    private String lineName;
    private Long reqSq;

    private Integer planQty;
    private Integer currentStock;
    private Double weight;
    private Double productionSpeed;
    private Double estimatedProductionTime;

    private LocalTime startTime;
    private LocalTime endTime;
    private String remark;
    private String writerId;
  }

  /* ---- 소요량 산출 요청 ---- */

  @Getter
  @Setter
  @NoArgsConstructor
  public static class ReqCalcReq {
    @Schema(description = "수주 조회 시작일")
    private LocalDate dateFrom;
    @Schema(description = "수주 조회 종료일")
    private LocalDate dateTo;
  }

  /* ---- 응답 ---- */

  // 소요량 산출 결과 한 행. 서비스가 빈 객체를 만든 뒤 setter 로 채워 넣는다.
  @Getter
  @Setter
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class ReqRes {
    // 주문/거래처 식별 정보
    private Long reqSq;
    private Long orderDtlSq;
    private String orderNo;
    private String orderDate;
    private String customerCode;
    private String customerName;

    // 품목 및 규격
    private Long itemSq;
    private String itemCode;
    private String itemName;
    private Double basisWeight;
    private Double width;
    private Double length;

    // 수량/재고/산출치
    private Integer orderQty;
    private Integer currentStock;
    private Integer safetyStock;
    private Integer shortageQty;
    private Integer deliveryPlannedQty;
    private Integer productionReqQty;
    private Integer planQty;

    private Double productionSpeed;
    private Double productionPerHourM2;
    private Double estimatedProductionTime;

    private LocalDate reqDate;
    private LocalDateTime regDt;
  }

  // 생산계획 목록 응답 한 행.
  @Getter
  @Setter
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class PlanRes {
    private Long planSq;
    private LocalDate planDate;

    private Long lineSq;
    private String lineName;

    private Long itemSq;
    private String itemCode;
    private String itemName;
    private String itemSpec;

    private Double basisWeight;
    private Double width;
    private Double length;

    private Integer planQty;
    private Integer currentStock;
    private Double weight;
    private Double productionSpeed;
    private Double estimatedProductionTime;

    private LocalTime startTime;
    private LocalTime endTime;

    private String planStatus;
    private String orderDate;
    private String remark;

    private LocalDateTime regDt;
    private LocalDateTime modDt;
  }
}
