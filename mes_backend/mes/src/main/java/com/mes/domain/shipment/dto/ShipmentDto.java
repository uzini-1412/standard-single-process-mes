package com.mes.domain.shipment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * 출하계획·출하지시 두 화면이 쓰는 요청/응답 DTO 들을 한 컨테이너에 모았다.
 *
 * 접두사 규칙: Plan* 는 출하계획 흐름, Order* 는 출하지시 흐름에 쓰인다.
 * 본 클래스에서는 출하지시(Order) 계열을 먼저, 출하계획(Plan) 계열을 뒤에 배치한다.
 */
public class ShipmentDto {

  // ##################### 출하지시 (Order) #####################

  @Getter
  @Setter
  @NoArgsConstructor
  public static class OrderSearchReq {
    private String dateFrom;
    private String dateTo;
  }

  /** FE가 평탄화해 보낸 한 행을 그대로 받아 저장하는 요청. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class FlatOrderSaveReq {
    private Long planSq;
    // 출하 예정 일시 및 도착지
    private String expectedShipDate;
    private String expectedShipTime;
    private String destination;
    private String customerReq;
    // 거래처/품목 스냅샷과 규격
    private String customerCode;
    private String customerName;
    private String itemCode;
    private String itemName;
    private Double basisWeight;
    private Double width;
    private Double length;
    // 수량과 재고 참고치
    private Double planQty;
    private Integer planQtyEa;
    private Double currentStock;
    private Double salesOrderQty;
    private String storageLocation;
    // 출하지시 시점에 고른 제품재고 LOT
    private String productLotNo;
    private String writerId;
    // 사용자가 수주잔여 초과 등록을 확인했음을 뜻한다. true 면 cap 검증을 건너뛴다.
    private Boolean force;
  }

  /** 출하지시 목록의 한 행 — 지시 헤더와 상세를 평탄화해 담는다. */
  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class OrderListItemRes {
    private Long shipOrderSq;
    private Long shipDtlSq;
    private Long planSq;
    // 동일 수주의 다른 plan 들과 예약수량을 합산하기 위한 묶음 키
    private Long salesOrderDtlSq;
    private String orderStatus;
    private String shipStatus;
    // 예정 일시 및 도착
    private String expectedShipDate;
    private String expectedShipTime;
    private String destination;
    private String customerReq;
    // 거래처/품목/규격
    private String customerCode;
    private String customerName;
    private String itemCode;
    private String itemName;
    private Double basisWeight;
    private Double width;
    private Double length;
    // 수량 및 재고
    private Double planQty;
    private Integer planQtyEa;
    private Double currentStock;
    private Double salesOrderQty;
    private String storageLocation;
    // 번호 및 일자
    private String lotNo;
    private String orderNo;
    private String orderDate;       // 수주일자
    private String productLotNo;    // 지시 확정 LOT (출하검사·출고에서 사용)
    // 출하검사 등록 여부와 판정(OK/NG). NG 면 예약이 자동 해제되고 수정이 잠긴다.
    private Boolean inspectRegistered;
    private String inspectJudge;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  public static class OrderRes {
    // 식별 및 예정 일시
    private Long shipOrderSq;
    private LocalDate expectedShipDate;
    private LocalTime expectedShipTime;
    // 거래처/도착/상태
    private String customerName;
    private String destination;
    private String orderStatus;
    // 대표 품목명과 총 지시량 (헤더 요약)
    private String representativeItemName;
    private Double totalOrderQty;
  }

  // ##################### 출하계획 (Plan) #####################

  @Getter
  @Setter
  @NoArgsConstructor
  public static class PlanSearchReq {
    private String dateFrom;
    private String dateTo;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  public static class PlanSaveReq {
    // 식별자 (계획/수주상세/거래처/품목)
    private Long planSq;
    private Long salesOrderDtlSq;
    private Long customerSq;
    private Long itemSq;
    // 거래처/품목/규격 스냅샷
    private String customerCode;
    private String customerName;
    private String itemCode;
    private String itemName;
    private Double basisWeight;
    private Double width;
    private Double length;
    // 수량/재고/일자
    private Double salesOrderQty;
    private Double currentStock;
    private String storageLocation;
    private String expectedShipDate;
    private Double planQty;
    private Integer planQtyEa;
    // 번호/비고/작성자
    private String lotNo;
    private String orderNo;
    private String remark;
    private String writerId;
  }

  /** 품목코드 한 건으로 현재고와 보관위치를 되짚어 돌려주는 응답. */
  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class ItemStockRes {
    private String itemCode;
    private String itemName;
    private Double basisWeight;
    private Double width;
    private Double length;
    private Double currentStock;
    private String storageLocation;
  }

  @Getter
  @Setter
  @NoArgsConstructor
  @AllArgsConstructor
  @Builder
  public static class PlanRes {
    private Long planSq;
    // 같은 수주에 속한 plan 들을 묶는 키 (pending 출하지시 합산 등에 사용)
    private Long salesOrderDtlSq;
    private String planStatus;
    private String expectedShipDate;
    private String orderDate;       // 수주일자
    private String deliveryPlace;   // 수주 납품장소 → 출하지시 도착지 기본값
    // 거래처/품목/규격
    private String customerCode;
    private String customerName;
    private String itemCode;
    private String itemName;
    private Double basisWeight;
    private Double width;
    private Double length;
    // 수량/재고
    private Double salesOrderQty;
    private Double currentStock;
    private String storageLocation;
    private Double planQty;
    private Integer planQtyEa;
    // 번호/비고
    private String lotNo;
    private String orderNo;
    private String remark;
    private Double orderedQty;      // 이 plan 한정으로 기등록된 출하지시 합계
    // 수주(salesOrderDtlSq) 단위 누적 출하지시량. 같은 수주의 전체 plan 을 가로질러 합산하며,
    // 수주잔여 = salesOrderQty − reservedQty 로 출하지시 상한(cap) 판단에 쓰인다.
    private Double reservedQty;
  }
}
