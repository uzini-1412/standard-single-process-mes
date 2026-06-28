package com.mes.domain.material.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

/**
 * 가입고 · 입고현황 · 자재재고현황 화면의 요청/응답 DTO 컨테이너.
 * 모든 필드명은 FE JSON 계약과 1:1 대응이므로 이름은 손대지 않는다.
 */
public class MaterialInboundDto {

  /* ========================================================== *
   *  응답 DTO
   * ========================================================== */

  /** 가입고/입고현황 단건 응답. 입고현황 펼침에서는 자식 LOT 필드가 채워진다. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class Res {
    private Long inboundSq;
    private Long orderDtlSq;
    private String orderNo;

    // 거래처 / 품목
    private Long customerSq;
    private String customerName;
    private String customerCode;
    private Long itemSq;
    private String itemCode;
    private String itemName;
    private String accountType;
    private String spec;

    // 입고 본문
    private LocalDate inboundDate;
    private Double inboundQty;
    private String lotNo;
    private String purchaseLotNo;
    private String inboundType;
    private String productionLotNo;
    private String orderUnit;

    // 입고검사
    private String inspectStatus;
    private Double passedQty;
    private Double rejectedQty;
    private String stockStatus;
    private String inspectLotNo;
    private String inspectNo;
    private String inspectorName;
    private LocalDate inspectDate;
    private Integer packingQty;
    private String packingUnit;

    // 보관 / 비고
    private String storageLocation;
    private String warehouseLocation; // 창고구분 (ItemSpec 기준)
    private String remark;

    // 입고현황 펼침 — 자식 LOT 단위 행. 무검사/미완료는 null.
    private Integer inspectLotSeq;     // 자식 LOT 순번 (mm)
    private String inspectLotNoChild;  // 자식 LOT 번호 (IS-yyyyMMdd-NN-mm)
    private Integer inspectLotQty;     // 자식 LOT 수량
  }

  /** 자재재고현황 품목별 합계 그룹. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class InventoryGroupRes {
    private Long stockSq;
    private Long itemSq; // 행 클릭 시 history 호출용
    private String accountType;
    private String itemCode;
    private String itemName;
    private String itemColor;
    private Double itemWeight;
    private Integer optimalStock;
    private Double currentQty;
    private String stockStatus;        // ENOUGH | SHORT
    private String warehouseLocation;  // ItemSpec 기반 카테고리 합본
    private String warehouseLoc;       // 단일 location
  }

  /** 자재재고현황 이력 행 (누적 잔량 포함). */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class InventoryHistoryRes {
    private Integer no;
    private String warehouseLoc;
    private String changeType; // 입고 | 출고 | 재고조정 | 가입고조정
    private String lotNo;
    private String changeQty;  // 부호 포함 (출고 시 음수)
    private String currQty;    // 누적 잔량
    private String regDt;
  }

  /* ========================================================== *
   *  요청 DTO
   * ========================================================== */

  /** 가입고/입고현황/자재재고현황 공용 검색 조건 (+ 재고현황 페이징). */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class SearchReq {
    private LocalDate dateFrom;
    private LocalDate dateTo;
    private Long customerSq;
    private String keyword; // 품명 / LOT번호

    // 자재재고현황 전용 필터 + 페이징
    private String itemCode;
    private String itemName;
    private Integer page;
    private Integer size;
    private String sortField;
    private String sortDirection;
    // FE useAccountTypes가 "완제품"으로 매칭한 계정구분 코드들 — 재고현황에서 제외
    private List<String> excludeAccountTypes;
  }

  /** 가입고 저장 요청 (다건은 List로 받는다). */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class SaveReq {
    @Schema(description = "입고 PK (신규: null)")
    private Long inboundSq;

    @Schema(description = "발주 상세 PK (어떤 발주 건인지 필수)")
    @NotNull(message = "발주 상세는 필수 입력값입니다.")
    private Long orderDtlSq;

    @Schema(description = "품목 PK")
    @NotNull(message = "품목은 필수 입력값입니다.")
    private Long itemSq;

    @Schema(description = "가입고 일자")
    @NotNull(message = "가입고 일자는 필수 입력값입니다.")
    private LocalDate inboundDate;

    @Schema(description = "가입고 수량 (Kg, 셋째 자리)")
    private Double inboundQty;

    @Schema(description = "입고구분 (REGISTER: 가입고등록, ADJUST: 가입고조정)")
    private String inboundType;

    @Schema(description = "LOT번호 (조정 시에만 원본 LOT번호 전달, 신규 등록은 BE 자동 채번)")
    private String lotNo;

    @Schema(description = "구매 LOT-No (조정 시 원본 구매 LOT-No 전달)")
    private String purchaseLotNo;

    @Schema(description = "생산 LOT번호 (출고 시)")
    private String productionLotNo;

    private String remark;
    private String writerId;
  }

  /** 자재재고현황 이력 조회 요청. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class InventoryHistoryReq {
    private Long itemSq;
    private Integer page;
    private Integer size;
  }

  /** 구매 LOT-No 미리보기 요청. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class GeneratePurchaseLotNoReq {
    private Long orderDtlSq;
  }

  /** 가입고 삭제 요청. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class DeleteReq {
    private List<Long> inboundIds;
  }
}
