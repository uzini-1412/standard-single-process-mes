package com.mes.domain.sales.dto;

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
 * 수주 화면 입출력 페이로드.
 *
 * <p>요청 계열(조회·저장·삭제)과 응답 계열(헤더 + 라인)을 한 클래스에 모은다.
 * 폭/길이/평량/m² 규격 필드는 생산소요량 산출 등 후속 도메인이 그대로 읽어 가므로
 * 명칭을 유지한다.</p>
 */
public class SalesOrderDto {

  private SalesOrderDto() {
  }

  // ========================= 요청 =========================

  /** 수주 목록 조회 조건. 수주관리·생산소요량산출 화면이 공유한다. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class SearchReq {
    @Schema(description = "수주일자 시작 (YYYY-MM-DD)")
    private LocalDate dateFrom;
    @Schema(description = "수주일자 종료 (YYYY-MM-DD)")
    private LocalDate dateTo;
    @Schema(description = "거래처 PK")
    private Long customerSq;
    @Schema(description = "검색어(수주번호, 품명)")
    private String keyword;

    private Integer page;
    private Integer size;
    private String sortField;
    private String sortDirection;
  }

  /**
   * 수주 저장 요청(신규/수정 공용).
   * 헤더 정보 뒤에 품목 라인을 최소 1건 동봉해야 통과한다.
   */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class SaveReq {
    @Schema(description = "수주 PK (신규: null)")
    private Long orderSq;
    @Schema(description = "수주번호 (신규: 자동생성되므로 null, 수정: 필수)")
    private String orderNo;

    @NotNull(message = "거래처는 필수 입력값입니다.")
    private Long customerSq;
    @NotNull(message = "수주일자는 필수 입력값입니다.")
    private LocalDate orderDate;

    private LocalDate deliveryReqDate;
    private String deliveryPlace;
    private String paymentTerms;
    private String remark;
    private String writerId;

    @Schema(description = "부가세 적용 여부 (기본 true)")
    private Boolean taxApplyYn;
    @Schema(description = "부가세율(%) (기본 10.00)")
    private BigDecimal taxRate;

    @NotEmpty(message = "수주품목은 1건 이상 필요합니다.")
    @Valid
    private List<DetailDto> details;
  }

  /** 저장 요청에 담기는 품목 한 줄. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class DetailDto {
    private Long orderDtlSq;

    @NotNull(message = "품목은 필수 입력값입니다.")
    private Long itemSq;

    // 규격 (화면 직접 수정 가능)
    private String spec;
    private Double width;
    private Double length;
    private Double weight;
    private Double basisWeight;

    // 수량
    private Integer orderQty;
    private Integer orderQtyEa;
    private Double orderQtyM2;
    private String orderUnit;

    // 금액 (프론트 계산값; 누락 시 서버 재산정)
    private BigDecimal unitPrice;
    @Schema(description = "m2당 부가세 금액 (기본 0)")
    private BigDecimal unitVatAmt;
    private BigDecimal supplyAmt;
    private BigDecimal vatAmt;
    private BigDecimal totalAmt;

    private String remark;
  }

  /** 수주 일괄 삭제 키 목록. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class DeleteReq {
    private List<Long> orderIds;
  }

  // ========================= 응답 =========================

  /** 수주 헤더 1건과 그 품목 라인 목록. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class Res {
    private Long orderSq;
    private String orderNo;
    private String orderStatus;
    private LocalDate orderDate;
    private LocalDate deliveryReqDate;

    // 거래처 (조인 결과)
    private Long customerSq;
    private String customerCode;
    private String customerName;

    private String deliveryPlace;
    private String paymentTerms;
    private String remark;

    // 금액/세금
    private BigDecimal totalOrderAmt;
    private Boolean taxApplyYn;
    private BigDecimal taxRate;

    private LocalDateTime regDt;
    private List<DetailRes> details;
  }

  /** 응답에 실리는 품목 한 줄. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class DetailRes {
    private Long orderDtlSq;
    private Long itemSq;
    private String itemCode;
    private String itemName;

    // 규격
    private String spec;
    private Double width;
    private Double length;
    private Double weight;
    private Double basisWeight;

    // 수량
    private Integer orderQty;
    private Integer orderQtyEa;
    private Double orderQtyM2;
    private String orderUnit;

    // 단가/금액
    private BigDecimal unitPrice;
    private BigDecimal unitVatAmt;
    private BigDecimal supplyAmt;
    private BigDecimal vatAmt;
    private BigDecimal totalAmt;

    private String remark;
    private Double plannedQty; // 기 등록된 출하계획 수량 합계
  }
}
