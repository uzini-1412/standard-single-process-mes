package com.mes.domain.shipment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 출하계획 한 건.
 *
 * <p>수주상세에서 출발해 생성되며, 생성 시점의 거래처·품목·규격 값을 스냅샷으로 복사해
 * 둔다. 이후 마스터가 바뀌어도 계획 당시 값은 그대로 유지된다.
 *
 * <p>상태 전이: 신규 = {@code WAIT} → 출하지시 생성 시 {@code ORDERED}.
 */
@Entity
@Table(name = "mes_shipment_plan_tb")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class ShipmentPlan {

  /** 출하계획 상태 — WAIT(미지시) / ORDERED(지시생성됨). */
  public static final String STATUS_WAIT = "WAIT";
  public static final String STATUS_ORDERED = "ORDERED";

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long planSq;

  private String planStatus = STATUS_WAIT;

  // 연관 식별자 (수주상세 / 거래처 / 품목)
  private Long salesOrderDtlSq;
  private Long customerSq;
  private Long itemSq;

  // 일자
  private LocalDate planDate;
  private LocalDate expectedShipDate;

  // 계획 수량 및 번호
  private Double planQty;
  private Integer planQtyEa;
  private String lotNo;
  private String orderNo;
  private String remark;

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

  // 감사
  @CreatedDate
  @Column(updatable = false)
  private LocalDateTime regDt;

  @LastModifiedDate
  private LocalDateTime modDt;

  @Builder
  private ShipmentPlan(Long planSq, String planStatus, Long salesOrderDtlSq, Long customerSq, Long itemSq,
                       LocalDate planDate, LocalDate expectedShipDate, Double planQty, Integer planQtyEa,
                       String lotNo, String orderNo, String remark,
                       String customerCode, String customerName, String itemCode, String itemName,
                       Double basisWeight, Double width, Double length,
                       Double salesOrderQty, Double currentStock, String storageLocation,
                       LocalDateTime regDt, LocalDateTime modDt) {
    // 식별/상태/연관키
    this.planSq = planSq;
    this.planStatus = (planStatus != null) ? planStatus : STATUS_WAIT;
    this.salesOrderDtlSq = salesOrderDtlSq;
    this.customerSq = customerSq;
    this.itemSq = itemSq;
    // 비정규화 스냅샷 (거래처/품목/규격)
    this.customerCode = customerCode;
    this.customerName = customerName;
    this.itemCode = itemCode;
    this.itemName = itemName;
    this.basisWeight = basisWeight;
    this.width = width;
    this.length = length;
    // 일자/수량/번호
    this.planDate = planDate;
    this.expectedShipDate = expectedShipDate;
    this.planQty = planQty;
    this.planQtyEa = planQtyEa;
    this.salesOrderQty = salesOrderQty;
    this.currentStock = currentStock;
    this.storageLocation = storageLocation;
    this.lotNo = lotNo;
    this.orderNo = orderNo;
    this.remark = remark;
    // 감사
    this.regDt = regDt;
    this.modDt = modDt;
  }

  /** 아직 출하지시가 만들어지지 않은(WAIT) 계획인지. */
  public boolean isWaiting() {
    return STATUS_WAIT.equals(this.planStatus);
  }

  /** 출하지시가 생성되면 ORDERED 로 전이한다. */
  public void markAsOrdered() {
    this.planStatus = STATUS_ORDERED;
  }

  /** 수정 화면에서 넘어온 변경 가능 항목을 한 번에 반영한다. */
  public void update(Double planQty, Integer planQtyEa, LocalDate expectedShipDate,
                     Double currentStock, String storageLocation, String lotNo, String remark) {
    this.planQty = planQty;
    this.planQtyEa = planQtyEa;
    this.expectedShipDate = expectedShipDate;
    this.currentStock = currentStock;
    this.storageLocation = storageLocation;
    this.lotNo = lotNo;
    this.remark = remark;
  }
}
