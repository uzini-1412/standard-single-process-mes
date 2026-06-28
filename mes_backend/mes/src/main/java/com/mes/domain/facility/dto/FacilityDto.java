package com.mes.domain.facility.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** 설비 마스터(설비정보관리) 화면의 요청·응답 묶음. */
public final class FacilityDto {

  private FacilityDto() {
  }

  /** 설비 조회 응답(목록/상세 공용). */
  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "설비 조회 응답")
  public static class Res {
    private Long facilitySq;
    private String manageNo;
    private String facilityName;
    private String facilityType;
    private String modelNm;
    private String spec;
    private String purpose;

    private String makerNm;
    private LocalDate manufactureDate;
    private String supplierNm;
    private LocalDate purchaseDate;
    private BigDecimal purchasePrice;

    private String manageDept;
    private String managerNm;
    private String asCompany;
    private String asTel;

    private Long lineSq;
    private Long processSq;
    private String lineNm;
    private String processNm;
    private String installPlace;

    private String remark;
    private String imgPaths;
    private LocalDate disposeDate;
    private String attachFileNm;
    private String attachFileContent;
    private LocalDateTime regDt;
  }

  /** 설비 등록/수정 요청(단건/다건 배열). facilitySq 가 없으면 신규. */
  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "설비 등록/수정 요청 (단건/다건)")
  public static class SaveReq {
    @Schema(description = "설비 PK (신규=null, 수정=필수)")
    private Long facilitySq;

    @NotBlank(message = "관리번호는 필수 입력값입니다.")
    @Schema(description = "관리번호 (수동/자동채번)")
    private String manageNo;

    @NotBlank(message = "설비명은 필수 입력값입니다.")
    @Schema(description = "설비명")
    private String facilityName;

    private String facilityType;
    private String modelNm;
    private String spec;
    private String purpose;

    private String makerNm;
    private LocalDate manufactureDate;
    private String supplierNm;
    private LocalDate purchaseDate;
    private BigDecimal purchasePrice;
    private String purchaseManager;
    private String purchaseTel;

    private String manageDept;
    private String managerNm;
    private String managerTel;
    private String asCompany;
    private String asManager;
    private String asTel;

    private Long lineSq;
    private Long processSq;
    private String lineNm;
    private String processNm;
    private String installPlace;

    private String remark;
    @Schema(description = "이미지 경로 JSON 문자열")
    private String imgPaths;
    private LocalDate disposeDate;
    private String attachFileNm;
    private String attachFileContent;
    private String writerId;
  }

  /** 설비 목록 검색 조건. */
  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "설비 목록 검색 조건")
  public static class SearchReq {
    @Schema(description = "설비 구분 코드")
    private String facilityType;
    @Schema(description = "라인 PK")
    private Long lineSq;
    @Schema(description = "설비명/관리번호 키워드")
    private String keyword;
  }

  /** 설비 단건 상세 요청. */
  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "설비 단건 상세 요청")
  public static class DetailReq {
    @Schema(description = "설비 PK")
    private Long facilitySq;
  }

  /** 설비 다건 삭제 요청. */
  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "설비 삭제 요청")
  public static class DeleteReq {
    @Schema(description = "삭제 대상 설비 PK 목록")
    private List<Long> facilityIds;
    @Schema(description = "수정자 ID")
    private String writerId;
  }
}
