package com.mes.domain.facility.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/** 설비 일상점검(결과 입력/현황 조회) 화면용 입출력 묶음. 인스턴스화 금지 컨테이너. */
public final class FacilityDailyCheckDto {

  private FacilityDailyCheckDto() {
  }

  /** 일상점검 결과 저장. resultSq가 비면 신규, 채워지면 기존 건 갱신(Upsert). */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class SaveReq {
    @Schema(description = "결과 PK (신규=null)")
    private Long resultSq;

    @NotNull(message = "설비는 필수 입력값입니다.")
    @Schema(description = "설비 PK")
    private Long facilitySq;

    @NotNull(message = "점검항목은 필수 입력값입니다.")
    @Schema(description = "점검항목 PK")
    private Long checkItemSq;

    @NotNull(message = "점검일자는 필수 입력값입니다.")
    private LocalDate checkDate;
    private LocalTime checkTime;
    private Double checkVal;

    @NotBlank(message = "점검결과는 필수 입력값입니다.")
    @Schema(description = "판정결과 (OK/NG)")
    private String checkResult;

    private String actionContent;
    private String remark;
    private String writerId;
  }

  /** 일상점검 현황 검색 조건. 모든 항목이 선택값이며 비우면 전체 조회된다. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class SearchReq {
    @Schema(description = "설비 PK")
    private Long facilitySq;
    @Schema(description = "점검일자 시작")
    private LocalDate dateFrom;
    @Schema(description = "점검일자 종료")
    private LocalDate dateTo;
    @Schema(description = "결과 필터 (OK/NG)")
    private String checkResult;
  }

  /** 일상점검 현황 그리드 응답 한 줄. 설비명/항목명/기준은 서비스에서 조인해 채운다. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class Res {
    private Long resultSq;

    // 설비/항목 (조인)
    private Long facilitySq;
    private String facilityName;   // 조인값
    private Long checkItemSq;
    private String checkItemNm;    // 조인값 (예: 온도점검)
    private String checkCriteria;  // 조인값 (예: 20도 이하)

    // 점검 결과
    private LocalDate checkDate;
    private LocalTime checkTime;
    private Double checkVal;
    private String checkResult;

    private String actionContent;
    private String remark;
    private String checkerId;
    private LocalDateTime regDt;
  }
}
