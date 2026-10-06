package com.mes.domain.stock.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 완제품 재고 화면 묶음 DTO. 아래 순서로 정의된다.
 *   1) 요청/검색 payload  2) 조회 응답  3) 재고실사·재고조정 관련 요청/응답.
 * 응답 클래스는 빌더로, 요청 클래스는 역직렬화를 위한 setter 기반으로 구성한다.
 */
public class ProductStockDto {

  /* ======================================================================
   *  1) 요청 / 검색 payload
   * ==================================================================== */

  /** 재고현황·분석·창고입고·LOT 목록 등에서 두루 쓰는 공통 검색 조건. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class SearchReq {
    private String itemCode;
    private String itemName;
    private String itemType;   // 제품구분 (공통정보 "제품구분" 그룹의 detailName)
    private String baseDate;   // 기준일자(yyyy-MM-dd) — 해당 월 통계 기준
    private String dateFrom;   // 조회 시작일
    private String dateTo;     // 조회 종료일
    private Integer page;      // 0-based, 미지정 시 기본값
    private Integer size;
  }

  /** 입출고 이력 조회 조건. 폭은 같은 품목이라도 폭이 다른 LOT을 분리하기 위한 필터. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class HistorySearchReq {
    @Schema(description = "품목 PK")
    private Long itemSq;
    @Schema(description = "폭(필터, 같은 품목이라도 폭 다른 LOT는 별도 표시)")
    private Double width;
    private Integer page;
    private Integer size;
  }

  /** 태블릿 재고실사 대상 LOT 페이징 조건. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class AuditTargetPageReq {
    private Integer page;
    private Integer size;
    private String accountType;
  }

  /** 재고조정 이력 검색(품번/품명 부분일치). */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class AppliedAuditSearchReq {
    private String itemCode;
    private String itemName;
  }

  /* ======================================================================
   *  2) 조회 응답
   * ==================================================================== */

  /** 제품재고현황(상단 테이블). 품목별 현재고와 월별 통계를 함께 담는다. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class StatusRes {
    private Long itemSq;
    private String itemType;
    private String itemCode;
    private String itemName;
    private Double basisWeight;
    private Double width;
    private Double length;

    // 현재고 (여러 LOT 합산)
    private Double currentStockM;
    private Integer currentStockEa;

    // 월별 통계 (Service 계산값)
    private Double currentMonthProdM;
    private Double prevMonthStockM;
    private Double currentMonthShipM;
    private Integer currentMonthShipEa;
    private Double shipMinus1Month;
    private Double shipMinus2Month;
    private Double shipMinus3Month;
    private Double expectedShipM;

    // 대표 보관위치 / 비고
    private String warehouseLocation;
    private String storageLoc;
    private String remark;
  }

  /** 제품창고입고현황(경량). 품목별 재고 합계 + 규격 기반 창고/보관위치. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class LocationRes {
    private Long itemSq;
    private String itemCode;
    private String itemName;
    private Double basisWeight;
    private Double width;
    private Double length;
    private String warehouseLocation;
    private String storageLoc;
    private Double currentStockM;
    private Integer currentStockEa;
    private String remark;
  }

  /** 품목별 현재고 요약(최경량). DB GROUP BY 집계만으로 채운다. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class CurrentStockRes {
    private Long itemSq;
    private String itemCode;
    private Double currentStockM;
    private Integer currentStockEa;
  }

  /** 개별 LOT 단위 완제품 재고(태블릿 재고실사 목록용). */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class LotRes {
    private Long stockSq;
    private Long itemSq;
    private String itemCode;
    private String itemName;
    private String accountType;
    private String lotNo;
    private String productionLotNo;
    private Double currentQtyM;
    private Integer currentQtyEa;
    private Double basisWeight;
    private Double width;
    private Double length;
    private String storageLoc;
    private String stockStatus;
    private String lastInDate;
  }

  /**
   * 품목별 가용 LOT(출하지시 폼). currentQtyM > 0 인 LOT만 노출하고
   * availableQtyM = currentQtyM - reservedQtyM (음수면 0), rollWeight 는 생산일보 측정 롤중량.
   */
  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class AvailableLotRes {
    private String lotNo;
    private Double currentQtyM;
    private Integer currentQtyEa;
    private String storageLoc;
    private String lastInDate;
    private Double rollWeight;
    private Double reservedQtyM;
    private Double availableQtyM;
  }

  /** 입출고 이력 단건. cumulativeQtyM 은 폭 그룹 누적재고(최신 행 = 현재고). */
  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class HistoryRes {
    private String date;            // yyyy-MM-dd
    private String changeType;      // INBOUND / SHIP / ADJUST
    private Double changeQtyM;      // 변동량(입고 +, 출고 -, 조정 ±)
    private Double cumulativeQtyM;
    private String lotNo;
    private String storageLoc;
  }

  /** 태블릿 재고실사 대상 LOT(자재+완제품 통합). 잔량>0 + 활성품목만 노출. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class AuditTargetRes {
    private String stockType;      // "MATERIAL" | "PRODUCT"
    private Long stockSq;
    private String itemCode;
    private String itemName;
    private String accountType;
    private String itemType;
    private String lotNo;
    private Double currentQty;     // 자재: kg, 완제품: EA (단위는 unit 참조)
    private String unit;           // "kg" | "ea"
    private Double width;
    private String warehouseLoc;
    private String storageLoc;
    private Double measuredQty;    // 오늘 저장된 최신 실사수량
    private Boolean auditedToday;
  }

  /* ======================================================================
   *  3) 재고실사 / 재고조정
   * ==================================================================== */

  /** 제품 보관위치 지정 및 임의 재고조정 저장. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class SaveReq {
    @NotNull(message = "품목은 필수 입력값입니다.")
    @Schema(description = "품목 PK")
    private Long itemSq;

    @NotBlank(message = "LOT번호는 필수 입력값입니다.")
    @Schema(description = "LOT 번호")
    private String lotNo;

    @Schema(description = "조정할 재고량(m)")
    private Double currentQtyM;

    @Schema(description = "조정할 재고량(EA)")
    private Integer currentQtyEa;

    @Schema(description = "지정할 보관 위치")
    private String storageLoc;

    private String remark;
  }

  /** 재고실사 결과 개별 행. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class InventoryAuditRow {
    @NotBlank(message = "품번은 필수 입력값입니다.")
    private String itemCode;
    private String itemName;
    private String lotNo;
    private String accountLabel;
    private Double currentQty;
    private Double measuredQty;
    private Double diffQty;
    private String warehouseLoc;
    private String storageLoc;
  }

  /** 재고실사 결과 일괄 저장 요청. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class InventoryAuditSaveReq {
    @Valid
    private List<InventoryAuditRow> rows;
  }

  /** 재고실사 → 재고조정 반영 요청(관리자). */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class InventoryAuditApplyReq {
    @Schema(description = "재고실사 PK", required = true)
    private Long auditSq;

    @Schema(description = "측정재고(반영할 새 시스템 재고)", required = true)
    private Double measuredQty;

    @Schema(description = "창고위치 (선택, 입력 시 갱신)")
    private String warehouseLoc;

    @Schema(description = "보관위치 (선택, 입력 시 갱신)")
    private String storageLoc;

    @Schema(description = "처리일자 (yyyy-MM-dd)")
    private String lastInDate;

    @Schema(description = "비고")
    private String remark;

    @Schema(description = "조정책임자")
    private String writerId;
  }

  /** 재고조정 이력 일괄 삭제 요청. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class AppliedAuditDeleteReq {
    private List<Long> auditSqs;
  }

  /** 오늘 등록/차이 발생 재고실사 내역 응답. */
  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class InventoryAuditRes {
    private Long auditSq;
    private String itemCode;
    private String itemName;
    private String lotNo;
    private String accountLabel;
    private Double currentQty;
    private Double measuredQty;
    private Double diffQty;
    private String warehouseLoc;
    private String storageLoc;
    private LocalDateTime regDt;
  }

  /** 반영 완료된 재고조정 이력(재고조정관리 목록/상세). */
  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class AppliedAuditRes {
    private Long auditSq;
    private String itemCode;
    private String itemName;
    private String accountLabel;
    private String lotNo;
    private Double currentQty;   // 조정 전 시스템 재고
    private Double measuredQty;  // 조정 후 실재고
    private Double diffQty;
    private String warehouseLoc;
    private String storageLoc;
    private LocalDateTime appliedDt;
    private String appliedWriterId;
    private String appliedRemark;
    private LocalDateTime regDt;
  }
}
