package com.mes.domain.item.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * LOT 추적 목록 검색 및 LOT 간 연계 조회에 쓰이는 페이로드 모음.
 *
 * <p>세 가지 흐름을 한 컨테이너에서 다룬다.
 * <ol>
 *   <li>조건 검색: {@link SearchReq} → {@link SearchItem} (페이징)</li>
 *   <li>연계 LOT 일괄 조회: {@link LinkedLotsReq}({@link LinkedLotKey} 목록) → {@link LinkedLotsItem}</li>
 *   <li>출하 LOT 의 수주 역참조: {@link SearchReq} → {@link SalesOrderRefItem}</li>
 * </ol>
 */
public final class LotTraceSearchDto {

    private LotTraceSearchDto() {
    }

    /* ---------------- 1) 조건 검색 ---------------- */

    /**
     * 검색 조건. {@code searchType} 가 비면 전체를 보며, 페이징은 타입별로 독립 적용된다.
     */
    @Getter
    @Setter
    @NoArgsConstructor
    public static class SearchReq {
        private String searchType;    // PURCHASE / MFG / SHIP (null 이면 전체)
        private String searchValue;   // LOT 번호 키워드
        private String direction;     // FORWARD / BACKWARD
        private String dateFrom;
        private String dateTo;
        private String customerName;
        private Integer page;         // 0-based, 기본 0
        private Integer size;         // 기본 50
    }

    /** 검색 결과 한 행. */
    @Getter
    @Setter
    @NoArgsConstructor
    public static class SearchItem {
        private Integer id;
        private String type;          // 구매LOT / 제조LOT / 출하
        private String typeBg;        // purchase / mfg / ship
        private String lotNo;
        private String date;
        private String party;         // 거래처명 또는 라인명
        private String itemCode;
        private Double basisWeight;
        private String width;
        private String qty;
        private String linkedLot;
    }

    /* ---------------- 2) 연계 LOT 일괄 조회 ---------------- */

    /** 연계 조회 키 한 건(LOT 번호 + 분류). */
    @Getter
    @Setter
    @NoArgsConstructor
    public static class LinkedLotKey {
        private String lotNo;
        private String typeBg;        // purchase / mfg / ship
    }

    /** 여러 LOT 키를 한 번에 묶어 보내는 요청. */
    @Getter
    @Setter
    @NoArgsConstructor
    public static class LinkedLotsReq {
        private List<LinkedLotKey> items;
    }

    /** LOT 한 건과 그에 연계된 LOT 번호 목록. */
    @Getter
    @Setter
    @NoArgsConstructor
    public static class LinkedLotsItem {
        private String lotNo;
        private List<String> linkedLots;
    }

    /* ---------------- 3) 수주 역참조 ---------------- */

    /** 출하 LOT → 수주 역참조 응답 한 행. */
    @Getter
    @Setter
    @NoArgsConstructor
    public static class SalesOrderRefItem {
        private String shipLotNo;
        private String shipDate;
        private String customerName;
        private String itemCode;
        private String shippedQty;
        private String salesOrderNo;
        private String salesOrderDate;
        private String salesOrderQty;
        private String remainQty;
    }
}
