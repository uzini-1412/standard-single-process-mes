package com.mes.domain.facility.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/** 설비 일상점검항목(점검 기준) 화면의 요청·응답 묶음. */
public final class FacilityCheckItemDto {

  private FacilityCheckItemDto() {
  }

  /** 점검항목 목록 응답. facilityName/manageNo 는 설비 마스터 조인값. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class Res {
    private Long checkItemSq;
    private Long facilitySq;

    private String facilityName;  // 조인값
    private String manageNo;      // 조인값

    private String checkItemNm;
    private String checkCriteria;
    private String checkMethod;
    private String checkCycle;
    private String unit;
    private String minVal;
    private String maxVal;
    private String checkItemImg;
    private Integer sortOrder;
    private String remark;
  }

  /** 점검항목 저장 요청. checkItemSq 유무로 신규/수정 분기. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class SaveReq {
    @Schema(description = "점검항목 PK (신규=null)")
    private Long checkItemSq;

    @NotNull(message = "설비는 필수 입력값입니다.")
    @Schema(description = "대상 설비 PK")
    private Long facilitySq;

    @NotBlank(message = "점검항목명은 필수 입력값입니다.")
    private String checkItemNm;
    private String checkCriteria;
    private String checkMethod;
    private String checkCycle;
    private String unit;
    private String minVal;
    private String maxVal;
    private String checkItemImg;
    private Integer sortOrder;
    private String remark;
    private String writerId;
  }

  /** 점검항목 검색 조건. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class SearchReq {
    @Schema(description = "설비 PK (해당 설비의 점검항목 조회)")
    private Long facilitySq;
    @Schema(description = "점검항목명 키워드")
    private String keyword;
  }

  /** 점검항목 다건 삭제 대상 PK 목록. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class DeleteReq {
    private List<Long> checkItemIds;
  }
}
