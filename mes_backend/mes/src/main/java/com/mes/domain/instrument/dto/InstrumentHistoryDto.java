package com.mes.domain.instrument.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 계측기 이력 화면(검교정이력등록 / 이력카드)의 요청·응답 컨테이너.
 */
public final class InstrumentHistoryDto {

    private InstrumentHistoryDto() {
    }

    /** 등록/수정 공용 요청. {@code historySq} 가 비어 있으면 신규로 본다. */
    @Getter
    @Setter
    @NoArgsConstructor
    public static class SaveReq {

        private Long historySq;

        @NotNull(message = "계측기는 필수 입력값입니다.")
        private Long instrumentSq;

        @NotNull(message = "발생일자는 필수 입력값입니다.")
        private LocalDate occurDate;

        private String historyType;
        private String actionContent;
        private BigDecimal actionCost;
        private String agencyNm;
        private String workerNm;

        // 검교정 성적서 첨부
        private String reportFilePath;
        private String reportFileNm;

        private String remark;
        private String writerId;

        /** 신규 등록 요청인지 여부. */
        public boolean isNew() {
            return historySq == null;
        }
    }

    /** 다건 삭제 요청. */
    @Getter
    @Setter
    @NoArgsConstructor
    public static class DeleteReq {
        private List<Long> historyIds;
    }

    /**
     * 검색 조건.
     * {@code instrumentSq} 가 지정되면 해당 계측기로 한정하고, {@code keyword} 는 통합 매칭에 쓴다.
     */
    @Getter
    @Setter
    @NoArgsConstructor
    @EqualsAndHashCode
    public static class SearchReq {
        @Schema(description = "계측기 PK (지정 시 해당 계측기로 한정)")
        private Long instrumentSq;
        @Schema(description = "통합 검색어 (관리번호/기기명/기기번호 매칭)")
        private String keyword;
        @Schema(description = "관리번호")
        private String manageNo;
        @Schema(description = "기기명")
        private String instrumentNm;
        @Schema(description = "기기번호")
        private String instrumentNo;
        private LocalDate dateFrom;
        private LocalDate dateTo;
    }

    /**
     * 목록 응답 1행.
     * 이력 본문 값은 이력 엔티티에서, 계측기 식별/제원 값은 마스터 조인으로 채운다.
     */
    @Getter
    @Setter
    @NoArgsConstructor
    public static class Res {

        // 이력 본문
        private Long historySq;
        private Long instrumentSq;
        private String historyType;
        private LocalDate occurDate;
        private String agencyNm;
        private String actionContent;
        private BigDecimal actionCost;
        private String workerNm;
        private String reportFilePath;
        private String reportFileNm;
        private String remark;
        private LocalDateTime regDt;

        // 마스터 조인 값
        private String manageNo;
        private String instrumentType;
        private String instrumentNm;
        private String modelNm;
        private String instrumentNo;
        private String spec;
        private String makerNm;
        private LocalDate purchaseDate;
        private BigDecimal purchasePrice;
        private String calibCycle;
        private String calibAgency;
        private LocalDate lastCalibDate;
        private LocalDate nextCalibDate;
        private String imgPaths;
    }

    /**
     * 이력카드 화면 전용 복합 응답.
     * A영역에 계측기 마스터 1건, B영역에 해당 계측기의 이력 N건을 담는다.
     */
    @Getter
    @Setter
    @NoArgsConstructor
    public static class CardRes {

        // A: 마스터
        private Long instrumentSq;
        private String manageNo;
        private String instrumentNm;
        private String instrumentNo;
        private String spec;
        private LocalDate purchaseDate;
        private String imgPaths;

        // B: 이력 목록
        private List<Res> historyList;
    }
}
