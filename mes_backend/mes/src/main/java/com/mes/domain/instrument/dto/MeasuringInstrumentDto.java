package com.mes.domain.instrument.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 계측기 마스터 화면의 요청·응답 컨테이너.
 */
public final class MeasuringInstrumentDto {

    private MeasuringInstrumentDto() {
    }

    /** 항목별 검색 조건. */
    @Getter
    @Setter
    @NoArgsConstructor
    @EqualsAndHashCode
    public static class SearchReq {
        @Schema(description = "구분 (계측기/검사구)")
        private String instrumentType;
        @Schema(description = "관리번호")
        private String manageNo;
        @Schema(description = "기기명")
        private String instrumentNm;
        @Schema(description = "기기번호")
        private String instrumentNo;
    }

    /** 등록/수정 공용 요청. {@code instrumentSq} 가 비어 있으면 신규 등록으로 본다. */
    @Getter
    @Setter
    @NoArgsConstructor
    public static class SaveReq {

        @Schema(description = "계측기 PK (신규 등록 시 null)")
        private Long instrumentSq;

        @NotBlank(message = "관리번호는 필수 입력값입니다.")
        private String manageNo;

        @NotBlank(message = "기기명은 필수 입력값입니다.")
        private String instrumentNm;

        private String instrumentType;
        private String instrumentNo;
        private String modelNm;
        private String spec;
        private String makerNm;

        // 구매
        private LocalDate purchaseDate;
        private BigDecimal purchasePrice;

        // 검교정
        private String calibCycle;
        private String calibAgency;
        private LocalDate lastCalibDate;
        private LocalDate nextCalibDate;

        // 부가
        private String imgPaths; // 사진 경로 JSON 배열 문자열
        private String remark;
        private String writerId;

        /** 신규 등록 요청인지 여부. */
        public boolean isNew() {
            return instrumentSq == null;
        }
    }

    /** 다건 삭제 요청. */
    @Getter
    @Setter
    @NoArgsConstructor
    public static class DeleteReq {
        private List<Long> instrumentIds;
    }

    /** 목록 응답 1행. {@code remainingDays} 는 차기교정일 기준 D-Day 로 서버에서 산출한다. */
    @Getter
    @Setter
    @NoArgsConstructor
    public static class Res {

        private Long instrumentSq;
        private String manageNo;
        private String instrumentType;
        private String instrumentNm;
        private String instrumentNo;
        private String modelNm;
        private String spec;
        private String makerNm;

        private LocalDate purchaseDate;
        private BigDecimal purchasePrice;

        private String calibCycle;
        private String calibAgency;
        private LocalDate lastCalibDate;
        private LocalDate nextCalibDate;

        @Schema(description = "차기교정일까지 남은 일수 (서버에서 D-Day 계산)")
        private Integer remainingDays;

        private String imgPaths;
        private String remark;
        private LocalDateTime regDt;
    }
}
