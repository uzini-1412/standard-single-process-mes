package com.mes.domain.bom.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 품목구성(BOM) DTO. (STANDARDIZATION.md §6)
 * 한 화면이 bom.mode 에 따라 코어(quantity/unit/seq) 또는 배합형(ratio/평량/PLC호기/소재구분) 컬럼을 노출.
 */
public class BomDto {

  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "BOM 검색 조건")
  public static class SearchReq {
    @Schema(description = "제품 품목 PK (특정 제품의 BOM 조회 시)", example = "1")
    private Long productItemSq;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "BOM 등록/수정 요청 (행 단위)")
  public static class SaveReq {

    @Schema(description = "BOM 라인 PK (신규: null, 수정: 값 있음)")
    private Long bomLineSq;

    @Schema(description = "대상 제품 PK (필수)", example = "10")
    @NotNull(message = "제품은 필수 입력값입니다.")
    private Long productItemSq;

    @Schema(description = "구성품 PK (필수)", example = "20")
    @NotNull(message = "구성품은 필수 입력값입니다.")
    private Long componentItemSq;

    // 코어
    @Schema(description = "소요량")
    private Double quantity;
    @Schema(description = "단위")
    private String unit;
    @Schema(description = "순번")
    private Integer seq;

    // 배합형(RECIPE) 확장
    @Schema(description = "비중(%)")
    private Double ratio;
    @Schema(description = "평량(g/m²)")
    private Double basisWeight;
    @Schema(description = "PLC 호기 (공통코드 PLC호기)")
    private String plcMachineNo;
    @Schema(description = "소재구분 (공통코드)")
    private String materialType;

    @Schema(description = "비고")
    private String remark;

    @Schema(description = "사용유무")
    private Boolean useYn;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "BOM 삭제 요청")
  public static class DeleteReq {
    private java.util.List<Long> bomLineIds;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor // JPQL select new 를 위해 필수 (필드 순서 = 쿼리 select 순서)
  @Schema(description = "BOM 조회 응답 (헤더+라인+품목 join)")
  public static class Res {
    private Long bomSq;
    private String bomNo;
    private Long productItemSq;
    private String productCode;
    private String productName;

    private Long bomLineSq;
    private Long componentItemSq;
    private String materialCode; // 구성품 품번
    private String materialName; // 구성품 품명
    private String materialSpec; // 규격

    // 코어
    private Double quantity;
    private String unit;
    private Integer seq;

    // 배합형 확장
    private Double ratio;
    private Double basisWeight;
    private String plcMachineNo;
    private String materialType;

    private String remark;
    private Boolean useYn;
  }
}
