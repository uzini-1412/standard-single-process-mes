package com.mes.domain.facility.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** 설비 이력 관리 및 이력카드 화면의 요청·응답 묶음. */
public final class FacilityHistoryDto {

  private FacilityHistoryDto() {
  }

  /** 이력 현황 그리드 응답. 설비 마스터 일부(번호/명/구분/라인/공정)를 조인해 함께 내려준다. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class Res {
    private Long historySq;
    private Long facilitySq;

    // 설비 마스터 조인값
    private String manageNo;
    private String facilityName;
    private String facilityType;
    private String lineNm;
    private String processNm;

    private String historyNo;
    private LocalDate occurDate;
    private String occurContent;
    private String actionType;
    private LocalDate actionDate;
    private String actionTime;
    private String actionContent;
    private String actionManager;
    private BigDecimal actionCost;
    private String remark;
    private LocalDateTime regDt;
  }

  /**
   * 설비이력카드 응답. 상단 A영역에 설비 마스터 요약을, 하단 B영역(historyList)에
   * 해당 설비의 이력 목록을 담는다.
   */
  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "설비이력카드 응답 (설비 마스터 + 이력 리스트)")
  public static class CardRes {
    // A영역: 설비 요약
    private Long facilitySq;
    private String manageNo;
    private String facilityName;
    private String processNm;       // 사용공정
    private LocalDate purchaseDate; // 구입일자
    private String imgPaths;        // 설비 사진

    // B영역: 이력 목록
    private List<Res> historyList;
  }

  /** 이력 저장 요청. historySq 유무로 신규/수정 분기. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class SaveReq {
    @Schema(description = "이력 PK (신규=null)")
    private Long historySq;

    @NotNull(message = "설비는 필수 입력값입니다.")
    @Schema(description = "설비 PK")
    private Long facilitySq;

    private String historyNo;
    private LocalDate occurDate;
    private String occurContent;
    private String actionType;
    private LocalDate actionDate;
    private String actionTime;
    private String actionContent;
    private String actionManager;
    private BigDecimal actionCost;
    private String remark;
    private String writerId;
  }

  /** 이력 현황 검색 조건. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class SearchReq {
    @Schema(description = "키워드 (설비번호/설비명 등)")
    private String keyword;
    @Schema(description = "설비 PK (단일 설비 지정 시)")
    private Long facilitySq;
    @Schema(description = "발생일 범위 시작")
    private LocalDate dateFrom;
    @Schema(description = "발생일 범위 종료")
    private LocalDate dateTo;
  }

  /** 이력 다건 삭제 대상 PK 목록. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class DeleteReq {
    private List<Long> historyIds;
  }
}
