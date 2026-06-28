package com.mes.domain.purchase.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 거래처원장(매입현황)에서 오가는 요청/응답 묶음. 필드명은 프론트 JSON 계약이라 고정.
 */
public class PurchaseStatusDto {

  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "거래처원장 검색 조건")
  public static class SearchReq {
    private LocalDate dateFrom;
    private LocalDate dateTo;
    private Long customerSq;
    private String customerCode;

    // 상단 표 그룹 페이징/정렬
    private Integer page;
    private Integer size;
    private String sortField;
    private String sortDirection;

    // 그룹 상세(팝업) 식별 키 (계정/거래처/입고일)
    private String groupAccountType;
    private String groupCustomerCode;
    private LocalDate groupInboundDate;
  }

  /** 거래처 드롭다운 옵션. */
  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "거래처원장 거래처 옵션")
  public static class CustomerOption {
    private String customerCode;
    private String customerName;
  }

  /** 상단 표의 한 행 — (계정과목, 거래처, 입고일) 그룹별 매입금액 합계. */
  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "거래처원장 그룹 행")
  public static class GroupRes {
    private String accountType;
    private String customerCode;
    private String customerName;
    private LocalDate inboundDate;
    private BigDecimal purchaseAmount;
  }

  /** 월별 매입 합계 한 점. yearMonth 는 "YYYY-MM". */
  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "매입 추이 응답")
  public static class TrendRes {
    private String yearMonth;
    private BigDecimal amount;
  }

  /** 합격 입고 실적 한 건을 펼친 상세 응답. */
  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "거래처원장 응답 (합격 입고 실적 기반)")
  public static class Res {
    private Long inboundSq;
    private LocalDate inboundDate;
    private String accountType;
    private String customerCode;
    private String customerName;
    private String itemCode;
    private String itemName;
    private Integer qty;
    private BigDecimal unitPrice;
    private BigDecimal supplyAmt;
    private BigDecimal vatAmt;
    private BigDecimal totalAmt;
    private String remark;
  }
}
