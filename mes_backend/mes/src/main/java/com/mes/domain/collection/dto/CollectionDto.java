package com.mes.domain.collection.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * 수금/자금관리 화면의 요청·응답 묶음. 외부(JSON) 필드명은 프론트 계약이라
 * 그대로 두고, 내부 그룹핑만 금액/거래처/명세 단위로 정리했다.
 */
public class CollectionDto {

    @Getter @Setter @NoArgsConstructor
    @Schema(description = "수금 전표 검색 조건 (수금일자 구간)")
    public static class SearchReq {
        private LocalDate dateFrom;
        private LocalDate dateTo;
    }

    @Getter @Setter @NoArgsConstructor
    @Schema(description = "수금 전표 저장 요청 (등록/수정 공용)")
    public static class SaveReq {
        private Long collectionSq;

        // 거래처
        @NotNull(message = "거래처를 선택해 주세요.")
        private Long customerSq;
        private String customerCode;
        private String customerName;

        // 전표 본문
        @NotNull(message = "수금일자를 입력해 주세요.")
        private LocalDate collectionDate;
        private String paymentTerms;
        private String registrant;
        private String remark;

        // 금액
        private BigDecimal supplyAmt;
        private BigDecimal vatAmt;
        @NotNull(message = "합계금액을 입력해 주세요.")
        private BigDecimal totalAmt;
        private BigDecimal totalCollectionAmt;
        private BigDecimal balance;

        // 명세
        @Valid
        private List<DetailData> details;
    }

    @Getter @Setter @NoArgsConstructor
    @Schema(description = "수금 명세 입력 행")
    public static class DetailData {
        private Long shipResultSq;
        private String lotNo;
        private LocalDate shipDate;
        private BigDecimal salesAmt;
        private BigDecimal salesAccum;
        private BigDecimal collectionAmt;
        private BigDecimal collectionAccum;
        private BigDecimal balance;
        private String remark;
    }

    @Getter @Setter @NoArgsConstructor
    @Schema(description = "수금 전표 목록 행")
    public static class ListRes {
        private Long collectionSq;
        private String customerCode;
        private String customerName;
        private LocalDate collectionDate;
        private String paymentTerms;
        private BigDecimal supplyAmt;
        private BigDecimal vatAmt;
        private BigDecimal totalAmt;
        private BigDecimal totalCollectionAmt;
        private BigDecimal balance;
        private String registrant;
        private String remark;
    }

    @Getter @Setter @NoArgsConstructor
    @Schema(description = "수금 전표 상세")
    public static class Res {
        private Long collectionSq;
        private Long customerSq;
        private String customerCode;
        private String customerName;
        private LocalDate collectionDate;
        private String paymentTerms;
        private BigDecimal supplyAmt;
        private BigDecimal vatAmt;
        private BigDecimal totalAmt;
        private BigDecimal totalCollectionAmt;
        private BigDecimal balance;
        private String registrant;
        private String remark;
        private List<DetailRes> details;
    }

    @Getter @Setter @NoArgsConstructor
    @Schema(description = "수금 명세 응답 행")
    public static class DetailRes {
        private Long collectionDtlSq;
        private Long shipResultSq;
        private String lotNo;
        private LocalDate shipDate;
        private BigDecimal salesAmt;
        private BigDecimal salesAccum;
        private BigDecimal collectionAmt;
        private BigDecimal collectionAccum;
        private BigDecimal balance;
        private String remark;
    }

    @Getter @Setter @NoArgsConstructor
    @Schema(description = "출하실적 선택 모달 옵션")
    public static class ShipResultOption {
        private Long shipResultSq;
        private String lotNo;
        private LocalDate shipDate;
        private String itemCode;
        private String itemName;
        private BigDecimal shippedQty;
        private BigDecimal unitPrice;
        private BigDecimal salesAmt;
    }
}
