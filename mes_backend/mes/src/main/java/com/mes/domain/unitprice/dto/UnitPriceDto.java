package com.mes.domain.unitprice.dto;

import com.mes.domain.unitprice.entity.UnitPrice;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** 단가 도메인 요청/응답 묶음. 내부 정적 클래스 단위로 화면 계약을 정의한다. */
public class UnitPriceDto {

  /** 목록/활성 조회 검색 조건. 모든 필드는 선택값이다. */
  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "단가 검색 조건")
  public static class SearchReq {
    @Schema(description = "품목 PK (선택)")
    private Long itemSq;

    @Schema(description = "거래처 PK (선택)")
    private Long customerSq;

    @Schema(description = "단가 구분 (SALE/BUY)")
    private String priceType;

    @Schema(description = "기준일자 (입력 시 해당 날짜에 유효한 단가 조회, 미입력 시 전체 이력)")
    private LocalDate baseDate;

    @Schema(description = "사용 유무 (기본 true)")
    private Boolean useYn;
  }

  /** 등록(unitPriceSq=null) / 수정(unitPriceSq=값) 겸용 저장 요청. */
  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "단가 등록/수정 요청")
  public static class SaveReq {
    @Schema(description = "PK (신규:null, 수정:값)")
    private Long unitPriceSq;

    @Schema(description = "품목 PK (필수)")
    @NotNull(message = "품목을 선택해 주세요.")
    private Long itemSq;

    @Schema(description = "거래처 PK")
    private Long customerSq;

    @Schema(description = "폭(mm)")
    private Double width;

    @Schema(description = "길이(m)")
    private Double length;

    @Schema(description = "단가 구분 (SALE:판매, BUY:구매)")
    @NotBlank(message = "단가 구분을 선택해 주세요.")
    private String priceType;

    @Schema(description = "단가 금액")
    @NotNull(message = "단가 금액을 입력해 주세요.")
    private BigDecimal price;

    @Schema(description = "단가 단위 (m2, ea, kg)")
    private String priceUnit;

    @Schema(description = "적용 시작일 (YYYY-MM-DD)")
    @NotNull(message = "적용 시작일을 입력해 주세요.")
    private LocalDate startDate;

    @Schema(description = "적용 종료일 (보통 9999-12-31)")
    private LocalDate endDate;

    @Schema(description = "비고")
    private String remark;

    @Schema(description = "사용 유무 (기본 true)")
    private Boolean useYn;
  }

  /** 단가 이력 일괄 삭제(소프트 삭제) 대상 PK 묶음. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class DeleteReq {
    private List<Long> unitPriceIds;
  }

  /** 거래처별 판매가능 품목 응답 행. 규격/평량/중량은 단가에 매칭된 ItemSpec 우선으로 채운다. */
  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "거래처별 판매가능 품목 응답 (단가 등록된 품목만)")
  public static class SalableItemRes {
    private Long unitPriceSq;
    private Long itemSq;
    private String itemCode;
    private String itemName;
    private Long customerSq;
    private String customerName;
    private Double width;
    private Double basisWeight;
    private Double length;
    private Double weight;
    private BigDecimal price;
    private String priceUnit;
  }

  /** 단가 목록/활성 조회 응답 행. 품목·거래처 정보는 서비스에서 별도 조회해 합쳐 넣는다. */
  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "단가 조회 응답")
  public static class Res {
    private Long unitPriceSq;
    private Long itemSq;
    private String itemCode;
    private String itemName;
    private String itemUnit; // 단위

    private Long customerSq;
    private String customerCode;
    private String customerName;

    private Double width;
    private Double length;
    private String priceType;
    private BigDecimal price;
    private String priceUnit;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDateTime changeDate;
    private String accountType;
    private String remark;
    private Boolean useYn;

    /** 엔티티 + 외부 조회로 얻은 품목/거래처 표시값을 합쳐 응답 행을 만든다. */
    public static Res from(UnitPrice entity, String itemCode, String itemName,
                           String customerName, String customerCode, String accountType) {
      Res res = new Res();
      res.unitPriceSq = entity.getUnitPriceSq();
      res.itemSq = entity.getItemSq();
      res.itemCode = itemCode;
      res.itemName = itemName;

      res.customerSq = entity.getCustomerSq();
      res.customerCode = customerCode;
      res.customerName = customerName;

      res.width = entity.getWidth();
      res.length = entity.getLength();
      res.priceType = toTypeName(entity.getPriceType());
      res.price = entity.getPrice();
      res.priceUnit = entity.getPriceUnit();
      res.startDate = entity.getStartDate();
      res.endDate = entity.getEndDate();
      res.changeDate = entity.getChangeDate();
      res.accountType = accountType;
      res.remark = entity.getRemark();
      res.useYn = entity.getUseYn();
      return res;
    }

    private static String toTypeName(com.mes.domain.unitprice.entity.PriceType type) {
      return type != null ? type.name() : null;
    }
  }
}
