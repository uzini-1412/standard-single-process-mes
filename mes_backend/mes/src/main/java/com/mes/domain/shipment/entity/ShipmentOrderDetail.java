package com.mes.domain.shipment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 출하지시 한 라인(상세).
 *
 * <p>품목/규격/거래처 등 마스터 값은 지시 등록 시점에 복사한 스냅샷이므로, 이후 마스터가
 * 변경되어도 과거 지시 내역은 등록 당시 값으로 보존된다. 부모 {@link ShipmentOrder} 와
 * N:1 로 연결된다.
 */
@Entity
@Table(name = "mes_shipment_order_dtl_tb")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ShipmentOrderDetail {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long shipDtlSq;

  @Setter
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "ship_order_sq")
  private ShipmentOrder shipmentOrder;

  @Enumerated(EnumType.STRING)
  private ShipmentStatus shipStatus = ShipmentStatus.WAIT;

  // 참조 키 (출하계획 / 품목 / 출하 제품재고 LOT)
  private Long planSq;
  private Long itemSq;
  private String productLotNo;

  // 지시 수량 (m / EA)
  private Double orderQty;
  private Integer orderQtyEa;

  // === 등록 시점 비정규화 스냅샷 ===
  private String customerCode;
  private String customerName;
  private String itemCode;
  private String itemName;
  private Double basisWeight;
  private Double width;
  private Double length;
  private Double salesOrderQty;
  private Double currentStock;
  private String storageLocation;

  @Builder
  private ShipmentOrderDetail(Long shipDtlSq, ShipmentOrder shipmentOrder, ShipmentStatus shipStatus,
                              Long planSq, Long itemSq, String productLotNo,
                              Double orderQty, Integer orderQtyEa,
                              String customerCode, String customerName, String itemCode, String itemName,
                              Double basisWeight, Double width, Double length,
                              Double salesOrderQty, Double currentStock, String storageLocation) {
    // 식별/연관/상태
    this.shipDtlSq = shipDtlSq;
    this.shipmentOrder = shipmentOrder;
    this.shipStatus = (shipStatus != null) ? shipStatus : ShipmentStatus.WAIT;
    this.planSq = planSq;
    this.itemSq = itemSq;
    this.productLotNo = productLotNo;
    // 지시 수량
    this.orderQty = orderQty;
    this.orderQtyEa = orderQtyEa;
    // 비정규화 스냅샷
    this.customerCode = customerCode;
    this.customerName = customerName;
    this.itemCode = itemCode;
    this.itemName = itemName;
    this.basisWeight = basisWeight;
    this.width = width;
    this.length = length;
    this.salesOrderQty = salesOrderQty;
    this.currentStock = currentStock;
    this.storageLocation = storageLocation;
  }

  /** 출하 진행 상태만 단독으로 전이한다. */
  public void updateShipStatus(ShipmentStatus shipStatus) {
    this.shipStatus = shipStatus;
  }

  /** 출하실적이 확정(SHIPPED)된 라인인지. */
  public boolean isShipped() {
    return ShipmentStatus.SHIPPED == this.shipStatus;
  }

  /** 수정 화면에서 넘어온 값으로 수량·스냅샷 필드를 다시 채운다. */
  public void updateFields(Double orderQty, Integer orderQtyEa,
                           Double currentStock, String storageLocation,
                           String itemCode, String itemName,
                           Double basisWeight, Double width, Double length,
                           String customerCode, String customerName, Double salesOrderQty,
                           String productLotNo) {
    this.orderQty = orderQty;
    this.orderQtyEa = orderQtyEa;
    this.currentStock = currentStock;
    this.storageLocation = storageLocation;
    this.itemCode = itemCode;
    this.itemName = itemName;
    this.basisWeight = basisWeight;
    this.width = width;
    this.length = length;
    this.customerCode = customerCode;
    this.customerName = customerName;
    this.salesOrderQty = salesOrderQty;
    this.productLotNo = productLotNo;
  }
}
