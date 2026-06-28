package com.mes.domain.item.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 구매(원소재) LOT 상세 패널의 페이로드.
 *
 * <p>{@link Req} 로 구매 LOT 번호를 보내면 {@link Res} 가 매입/입고 헤더와 함께
 * 세 가지 하위 목록(입고검사 이력 · 제조 투입 연계 · LOT 재고 현황)을 한 번에 돌려준다.
 *
 * <p>서비스가 무인자 생성 후 setter 로 값을 채우는 패턴이므로 {@code @Data} 로
 * 접근자를 열어두되 {@code @NoArgsConstructor} 를 명시한다.
 */
public final class PurchaseLotDetailDto {

    private PurchaseLotDetailDto() {
    }

    /** 구매 LOT 번호 입력 키. */
    @Data
    @NoArgsConstructor
    public static class Req {
        private String lotNo;
    }

    /** 구매 LOT 헤더 + 하위 목록 3종. */
    @Data
    @NoArgsConstructor
    public static class Res {
        /* 품목 식별 */
        private String lotNo;
        private String itemCode;
        private String itemName;

        /* 매입처 */
        private String vendorCode;
        private String vendorName;

        /* 발주 및 입고 */
        private String purchaseOrderNo;
        private String orderedQty;
        private String receivedQty;
        private String receiptDate;
        private String storageLocation;

        /* 하위 목록 */
        private List<InspectionItem> inspections;
        private List<MfgLinkItem> mfgLinks;
        private List<StockItem> stockByLot;
    }

    /* ====================== 하위 목록 행 ====================== */

    /** 입고검사 이력 한 줄. */
    @Data
    @NoArgsConstructor
    public static class InspectionItem {
        private String inspectNo;
        private String inspectDate;
        private String inspectorName;
        private Integer sampleCount;
        private String result;
    }

    /** 이 구매 LOT 이 투입된 제조 LOT 연계 한 줄. {@code over} 는 표준배합 초과 플래그. */
    @Data
    @NoArgsConstructor
    public static class MfgLinkItem {
        private String mfgLotNo;
        private String inputTime;
        private String inputQty;
        private String standardRatio;
        private String overRate;
        private boolean over;
    }

    /** LOT 기준 재고 현황 한 줄(입고/소진/현재고). */
    @Data
    @NoArgsConstructor
    public static class StockItem {
        private String lotNo;
        private String inboundDate;
        private String vendorName;
        private String receivedQty;
        private String consumedQty;
        private String currentQty;
        private String status;
        private String location;
    }
}
