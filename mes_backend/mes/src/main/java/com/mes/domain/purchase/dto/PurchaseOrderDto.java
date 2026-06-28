package com.mes.domain.purchase.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 발주 관리 화면의 요청/응답 묶음. 필드명은 프론트 JSON 계약이라 고정.
 */
public class PurchaseOrderDto {

  @Getter
  @Setter
  @NoArgsConstructor
  public static class SearchReq {
    @Schema(description = "거래처(매입처) PK")
    private Long customerSq;
    @Schema(description = "발주일자 시작")
    private LocalDate dateFrom;
    @Schema(description = "발주일자 종료")
    private LocalDate dateTo;
    @Schema(description = "검색어(발주번호)")
    private String keyword;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  public static class DeleteReq {
    private List<Long> orderIds;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  public static class SaveReq {
    @Schema(description = "발주 PK (신규 등록 시 null)")
    private Long orderSq;

    // 서버 채번이 기본. 수정 시 참고용으로만 전달된다.
    private String orderNo;

    @NotNull(message = "거래처는 필수 입력값입니다.")
    private Long customerSq;

    @NotNull(message = "발주일자는 필수 입력값입니다.")
    private LocalDate orderDate;

    private LocalDate inReqDate;

    @Schema(description = "결제조건 (공통코드 값)")
    private String paymentTerms;

    @Schema(description = "부가세 적용 여부 (기본 true)")
    private Boolean taxApplyYn;
    @Schema(description = "부가세율(%) (기본 10.00)")
    private BigDecimal taxRate;

    @Schema(description = "재료시험성적서 요구 여부")
    private Boolean reqMaterialCertYn;
    @Schema(description = "거래명세서 요구 여부")
    private Boolean reqTransSpecYn;

    @Schema(description = "재료시험성적서 파일 경로")
    private String materialCertFilePath;
    @Schema(description = "재료시험성적서 파일명")
    private String materialCertFileNm;
    @Schema(description = "거래명세서 파일 경로")
    private String transSpecFilePath;
    @Schema(description = "거래명세서 파일명")
    private String transSpecFileNm;

    private String submitDoc;
    private String remark;
    private String writerId;

    @NotEmpty(message = "발주품목은 1건 이상 필요합니다.")
    @Valid
    private List<DetailDto> details;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  public static class DetailDto {
    private Long orderDtlSq;

    @NotNull(message = "품목은 필수 입력값입니다.")
    private Long itemSq;
    private Integer orderQty;
    private String orderUnit;
    private BigDecimal unitPrice;

    // 금액은 프론트 계산값을 우선 받되, 미전달 시 서버에서 재계산한다.
    private BigDecimal supplyAmt;
    private BigDecimal vatAmt;
    private BigDecimal totalAmt;

    private String spec;
    private String remark;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  public static class Res {
    private Long orderSq;
    private String orderNo;
    private String orderStatus;

    private Long customerSq;
    private String customerCode;
    private String customerName;

    private LocalDate orderDate;
    private LocalDate inReqDate;
    private String paymentTerms;
    private BigDecimal totalOrderAmt;

    private Boolean taxApplyYn;
    private BigDecimal taxRate;

    private Boolean reqMaterialCertYn;
    private Boolean reqTransSpecYn;
    private String materialCertFilePath;
    private String materialCertFileNm;
    private String transSpecFilePath;
    private String transSpecFileNm;

    private String submitDoc;
    private String remark;
    private LocalDateTime regDt;

    @Schema(description = "가입고 등록 여부 (true면 삭제 불가)")
    private Boolean hasInbound;

    private List<DetailRes> details;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  public static class DetailRes {
    private Long orderDtlSq;
    private Long itemSq;
    private String itemCode;
    private String itemName;
    private Integer orderQty;
    private String orderUnit;
    private BigDecimal unitPrice;
    private BigDecimal supplyAmt;
    private BigDecimal vatAmt;
    private BigDecimal totalAmt;
    private String spec;
    private String remark;

    @Schema(description = "품목의 수입검사유무 (FE 혼재 경고/인수검사 분기용)")
    private Boolean importInspGb;
  }
}
