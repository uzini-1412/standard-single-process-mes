package com.mes.domain.item.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 단일 LOT 종합 추적 화면의 입출력 컨테이너.
 *
 * <p>요청은 LOT 번호 하나({@link SearchReq})이고, 응답({@link Res})은 그 LOT의
 * 현재 스냅샷과 시간순 이벤트 로그({@link HistoryItem})를 한 번에 묶어 내려준다.
 * 서비스 계층이 무인자 생성 후 setter 로 채우는 방식이라 가변 빈으로 둔다.
 */
public final class LotTraceDto {

    private LotTraceDto() {
    }

    /** LOT 번호 단건 키. */
    @Data
    @NoArgsConstructor
    public static class SearchReq {
        private String lotNo;
    }

    /** 추적 타임라인의 한 이벤트(입고/생산/검사/출하 등). */
    @Data
    @NoArgsConstructor
    public static class HistoryItem {
        private String date;
        /** INBOUND / PRODUCTION / INSPECT / SHIP_INSPECT / SHIP_PLAN / SHIPPED */
        private String type;
        private String description;
    }

    /**
     * LOT 한 건의 현재 상태 + 연계 번호 + 이력을 합친 응답.
     *
     * <p>아래 필드는 (1) 식별·재고, (2) 규격, (3) 검사/진행, (4) 연계 LOT/문서,
     * (5) 거래·납품, (6) 이력 순서의 묶음으로 정리되어 있다.
     */
    @Data
    @NoArgsConstructor
    public static class Res {

        // (1) 식별 및 현재고
        private String lotNo;
        private String itemCode;
        private String itemName;
        private String accountType;
        private String storageLoc;
        private Double currentQty;
        private String qtyUnit;            // 단위: m / kg / EA 등

        // (2) 규격
        private Double basisWeight;        // 평량
        private Double width;              // 폭
        private Double length;             // 길이

        // (3) 검사 합부 및 진행 단계
        private String inspectStatus;      // 입고검사 합부
        private String shipInspectStatus;  // 출하검사 합부
        private String progressStatus;     // 입고완료 / 생산투입중 / 출하대기 / 출하완료
        private String inboundDate;        // 입고일 또는 제조일

        // (4) 연계 LOT 및 문서 번호
        private String purchaseOrderNo;    // 발주번호
        private String purchaseLotNo;      // 구매 LOT
        private String productionLotNo;    // 생산 LOT (PR-xxx)
        private String shipmentPlanLotNo;  // 출하계획 LOT (IS-xxx)
        private String shipInspectLotNo;   // 출하검사 LOT (FIS-xxx)

        // (5) 거래·납품 대상
        private String customerName;       // 거래처
        private String destination;        // 납품처

        // (6) 시간순 이력
        private List<HistoryItem> histories;
    }
}
