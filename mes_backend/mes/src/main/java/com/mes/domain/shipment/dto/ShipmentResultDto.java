package com.mes.domain.shipment.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 출하실적 도메인 DTO 집합.
 *
 * 등록(SaveReq), 현황 검색(SearchReq), 목록 행(Res), 그리고 태블릿에서
 * QR 을 찍었을 때 돌려주는 LOT 스냅샷(ScanLotRes)을 한 파일에 모았다.
 */
public class ShipmentResultDto {

  /** 출하실적 등록 요청 한 건. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class SaveReq {
    @Schema(description = "어떤 출하지시 상세 건에 대한 실적인지 매핑")
    @NotNull(message = "출하지시 상세 PK는 필수 입력값입니다.")
    private Long shipDtlSq;

    @NotNull(message = "품목은 필수 입력값입니다.")
    private Long itemSq;

    // customerSq 는 선택값이다. BE 가 출하지시 → 출하계획 → 수주 경로로 거래처를
    // 되짚어 채우므로, customer_sq 가 비어 있는 과거 데이터도 출하가 가능하다.
    private Long customerSq;

    @Schema(description = "바코드로 스캔하거나 입력한 LOT 번호")
    @NotBlank(message = "LOT번호는 필수 입력값입니다.")
    private String lotNo;

    @NotNull(message = "출하일자는 필수 입력값입니다.")
    private LocalDate shipDate;

    private Double shippedQty;
    private Integer shippedQtyEa;

    private String remark;
    private String writerId;
  }

  /** 현황 화면 검색 조건 — 기간/거래처/품목 필터에 페이징·정렬을 얹는다. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class SearchReq {
    private LocalDate dateFrom;
    private LocalDate dateTo;
    private Long customerSq;
    private String customerName;
    private String itemCode;
    private String itemName;

    // 페이징/정렬 파라미터
    private Integer page;
    private Integer size;
    private String sortField;
    private String sortDirection; // ASC | DESC
  }

  /** 현황 목록의 한 줄. 품목 규격과 지시 대비 실적 수량을 함께 싣는다. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class Res {
    private Long shipResultSq;
    private LocalDate shipDate; // 실제 출하일
    private String lotNo;
    private String customerName;

    // --- 품목/규격 ---
    private String itemCode;
    private String itemName;
    private Double basisWeight; // 평량
    private Double width;       // 폭
    private Double length;      // 길이

    // --- 수량: 지시량 vs 실출하량 (m, EA 각각) ---
    private Double orderQty;      // 출하지시량(m)
    private Integer orderQtyEa;   // 출하지시량(EA)
    private Double shippedQty;    // 실제 출하량(m)
    private Integer shippedQtyEa; // 실제 출하량(EA)

    private LocalDateTime regDt;
  }

  /** QR 스캔 시 태블릿에 내려보내는 LOT 단건 정보. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class ScanLotRes {
    // 재고/품목 식별
    private Long stockSq;
    private Long itemSq;
    private String itemCode;
    private String itemName;
    private String lotNo;
    // 현재고 (m, EA)
    private Double currentQtyM;
    private Integer currentQtyEa;
    // 규격 및 보관위치
    private Double basisWeight;
    private Double width;
    private Double length;
    private String storageLoc;
  }
}
