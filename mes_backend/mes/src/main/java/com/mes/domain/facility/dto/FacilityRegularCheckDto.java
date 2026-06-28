package com.mes.domain.facility.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** 설비 정기점검(계획/실시) 화면의 요청·응답 묶음. */
public final class FacilityRegularCheckDto {

  private FacilityRegularCheckDto() {
  }

  /** 정기점검 목록 응답. manageNo/facilityName/imgPaths 는 설비 마스터 조인값. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class Res {
    private Long regularCheckSq;
    private Long facilitySq;

    private String manageNo;      // 설비번호(조인)
    private String facilityName;  // 설비명(조인)
    private String imgPaths;      // 설비사진(조인)

    private String checkType;
    private String checkerNm;
    private LocalDate planDate;
    private String planContent;
    private LocalDate execDate;
    private String execContent;
    private String execResult;
    private String currentStatus;
    private String remark;
    private LocalDateTime regDt;
  }

  /** 정기점검 저장 요청. regularCheckSq 유무로 신규/수정 분기. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class SaveReq {
    @Schema(description = "정기점검 PK (신규=null)")
    private Long regularCheckSq;

    @NotNull(message = "설비는 필수 입력값입니다.")
    @Schema(description = "설비 PK")
    private Long facilitySq;

    @Schema(description = "점검 구분 (주간/월간 등)")
    private String checkType;
    private String checkerNm;
    private LocalDate planDate;
    private String planContent;

    private LocalDate execDate;
    private String execContent;
    private String execResult;
    @Schema(description = "현재 상태 (대기/사용중/수리중)")
    private String currentStatus;
    private String remark;
    private String writerId;
  }

  /** 정기점검 검색 조건. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class SearchReq {
    @Schema(description = "설비 PK (특정 설비 조회 시)")
    private Long facilitySq;
    @Schema(description = "키워드 (설비번호 등)")
    private String keyword;
  }

  /** 정기점검 다건 삭제 대상 PK 목록. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class DeleteReq {
    private List<Long> regularCheckIds;
  }
}
