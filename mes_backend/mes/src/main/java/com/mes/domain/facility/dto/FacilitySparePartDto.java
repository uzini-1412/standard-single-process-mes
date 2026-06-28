package com.mes.domain.facility.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** 설비 예비품 관리 화면의 요청·응답 묶음. */
public final class FacilitySparePartDto {

  private FacilitySparePartDto() {
  }

  /** 예비품 목록 응답. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class Res {
    private Long sparePartSq;
    private String partNo;
    private String partNm;
    private String spec;

    private String supplierNm;
    private LocalDate purchaseDate;
    private BigDecimal purchasePrice;

    private Double safetyStock;
    private Double currentStock;
    private String storageLoc;
    private String useFacility;

    private String imgPaths;
    private String remark;
    private LocalDateTime regDt;
  }

  /** 예비품 저장 요청. sparePartSq 유무로 신규/수정 분기. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class SaveReq {
    @Schema(description = "예비품 PK (신규=null)")
    private Long sparePartSq;
    private String partNo;
    private String partNm;
    private String spec;

    private String supplierNm;
    private LocalDate purchaseDate;
    private BigDecimal purchasePrice;

    private Double safetyStock;
    private Double currentStock;
    private String storageLoc;
    private String useFacility;

    @Schema(description = "이미지 경로 JSON 배열 문자열")
    private String imgPaths;
    private String remark;
    private String writerId;
  }

  /** 예비품 검색 조건. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class SearchReq {
    @Schema(description = "키워드 (예비품명/번호)")
    private String keyword;
    @Schema(description = "등록일자 시작")
    private LocalDate dateFrom;
    @Schema(description = "등록일자 종료")
    private LocalDate dateTo;
  }

  /** 예비품 다건 삭제 대상 PK 목록. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class DeleteReq {
    private List<Long> sparePartIds;
  }
}
