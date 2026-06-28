package com.mes.domain.sales.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 매출현황 화면 페이로드 모음.
 *
 * <p>입력({@link SearchReq})과 네 종류의 출력을 하나의 네임스페이스로 묶는다.
 * 출력은 용도에 따라 나뉜다 — 상단 그룹표({@link GroupRes}),
 * 개별 출하 실적 행({@link Res}), 거래처 셀렉트박스({@link CustomerOption}),
 * 월별 추이 차트({@link TrendRes}).</p>
 */
public class SalesStatusDto {

    private SalesStatusDto() {
    }

    /**
     * 매출현황 조회 조건.
     * 기간/거래처 필터에 더해, 그룹 행 클릭 시 상세를 다시 끌어오기 위한
     * group* 키와 목록 페이징/정렬 파라미터를 함께 담는다.
     */
    @Getter
    @Setter
    @NoArgsConstructor
    @Schema(description = "매출현황 검색 조건")
    public static class SearchReq {
        // 기간 필터
        private LocalDate dateFrom;
        private LocalDate dateTo;

        // 거래처 필터 (PK 또는 화면 드롭다운 코드)
        private Long customerSq;
        private String customerCode;

        // 그룹 단위 페이징/정렬
        private Integer page;
        private Integer size;
        private String sortField;
        private String sortDirection; // ASC | DESC

        // 그룹 행 → 상세 팝업/거래명세서 조회용 키
        private String groupCustomerCode;
        private LocalDate groupShipDate;
        private String groupLotNo;
    }

    /**
     * 상단 표 한 행. (거래처코드, 출하일, LOT) 묶음의 매출 합계를 나타낸다.
     */
    @Getter
    @Setter
    @NoArgsConstructor
    @Schema(description = "매출현황 그룹 행")
    public static class GroupRes {
        private Long shipOrderSq;
        private String customerCode;
        private String customerName;
        private LocalDate shipDate;
        private String lotNo;
        private BigDecimal salesAmount;
    }

    /**
     * 출하 실적 1건에 대응하는 매출 상세 행(팝업/전체 목록).
     * 응답 필드명은 {@code Res} 와 동일하게 유지된다.
     */
    @Getter
    @Setter
    @NoArgsConstructor
    @Schema(description = "매출현황 응답 (개별 출하 실적 기반)")
    public static class Res {
        // 식별/거래처
        private Long shipResultSq;
        private Long shipOrderSq;
        private String lotNo;
        private String customerCode;
        private String customerName;
        private LocalDate shipDate;

        // 품목
        private String itemCode;
        private String itemName;
        private Double qty;

        // 금액
        private BigDecimal unitPrice;
        private BigDecimal supplyAmt;
        private BigDecimal vatAmt;
        private BigDecimal totalAmt;

        private String remark;
    }

    /**
     * 거래처 셀렉트박스 옵션.
     */
    @Getter
    @Setter
    @NoArgsConstructor
    @Schema(description = "매출현황 거래처 옵션")
    public static class CustomerOption {
        private String customerCode;
        private String customerName;
    }

    /**
     * 매출 추이 차트의 한 점 — 월별 합계.
     */
    @Getter
    @Setter
    @NoArgsConstructor
    @Schema(description = "매출 추이 응답")
    public static class TrendRes {
        private String yearMonth; // "YYYY-MM"
        private BigDecimal amount;
    }
}
