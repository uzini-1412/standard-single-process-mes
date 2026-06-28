package com.mes.domain.stock.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 자재 재고(원/부자재) 화면에서 오가는 전송 객체 모음.
 *
 * <p>요청·응답 모두 Jackson 이 기본 생성자 + setter 로 채우므로 {@link Data} 한 장으로
 * 접근자를 만든다. 단순 데이터 캐리어라 클래스마다 별도 동작은 두지 않는다.
 */
public final class MaterialStockDto {

    private MaterialStockDto() {
    }

    /* ============================ 요청 ============================ */

    /** 현황·상세·수불부 조회에 공통으로 쓰는 검색 필터. */
    @Data
    public static class SearchReq {
        private String itemCode;
        private String itemName;
        /** 상세/이력 조회 시 대상 재고를 가리키는 키. */
        private Long stockSq;
    }

    /**
     * 재고 등록·수정 payload.
     *
     * <p>{@code stockSq} 가 비어 있으면 신규 등록, 채워져 있으면 수정이다.
     * {@code changeType}/{@code reason}/{@code writerId} 는 저장과 함께 적재할
     * 입출고 이력의 부속 정보다.
     */
    @Data
    public static class SaveReq {
        @Schema(description = "재고 PK (신규=null / 수정=값)")
        private Long stockSq;

        @NotNull(message = "품목은 필수 입력값입니다.")
        private Long itemSq;

        @NotBlank(message = "LOT번호는 필수 입력값입니다.")
        private String lotNo;

        private Double currentQty;
        private Double itemWeight;
        private String warehouseLoc;
        private LocalDate lastInDate;
        private Long customerSq;
        private String remark;

        // 함께 남길 이력 정보
        private String changeType;
        private String reason;
        private String writerId;
    }

    /** 선택한 재고들을 한 번에 지우는 요청. */
    @Data
    public static class DeleteReq {
        private List<Long> stockIds;
    }

    /* ============================ 응답 ============================ */

    /**
     * 자재 재고 현황 그리드의 한 행.
     *
     * <p>현재고 대비 예약/가용 수량과 적정재고 비교 상태({@code stockStatus})를 함께 싣는다.
     */
    @Data
    public static class Res {
        private Long stockSq;
        private String lotNo;

        // 품목 식별/표시
        private String itemCode;
        private String itemName;
        private String itemColor;
        private String accountType;
        private String customerName;

        // 수량 (Kg)
        private Double itemWeight;
        private Double currentQty;
        private Double reservedQty;
        private Double availableQty;
        private Double optimalStock;
        private String stockStatus;

        // 보관/감사
        private String warehouseLoc;
        private LocalDate lastInDate;
        private String writerId;
        private String remark;
    }

    /**
     * 입출고 수불부의 한 행.
     *
     * <p>{@code changeQty} 는 이번 변동량, {@code currQty} 는 변동 직후의 누적 재고(Kg)다.
     */
    @Data
    public static class HistoryRes {
        private Long historySq;
        private Long stockSq;
        private String lotNo;

        private String changeType;
        private Double changeQty;
        private Double currQty;

        private String warehouseLoc;
        private String reason;
        private String workerId;
        private LocalDateTime regDt;
    }
}
