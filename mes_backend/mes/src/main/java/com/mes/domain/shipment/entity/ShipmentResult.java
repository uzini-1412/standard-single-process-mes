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
 * 확정된 출하실적 한 건.
 *
 * <p>출하지시 상세(shipDtlSq) 단위로, 어느 품목·거래처의 어떤 LOT 을 언제 얼마나
 * 내보냈는지를 기록한다. 출하량은 m 단위와 EA 단위를 함께 보관한다.
 */
@Entity
@Table(name = "mes_shipment_result_tb")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class ShipmentResult {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "ship_result_sq")
  private Long shipResultSq;

  // 연관 식별자
  @Column(name = "ship_dtl_sq", nullable = false)
  private Long shipDtlSq;

  @Column(name = "item_sq", nullable = false)
  private Long itemSq;

  @Column(name = "customer_sq", nullable = false)
  private Long customerSq;

  // 출하 LOT / 일자
  @Column(name = "lot_no", nullable = false, length = 50)
  private String lotNo;

  @Column(name = "ship_date", nullable = false)
  private LocalDate shipDate;

  // 실제 출하량 (m / EA)
  @Column(name = "shipped_qty")
  private Double shippedQty;

  @Column(name = "shipped_qty_ea")
  private Integer shippedQtyEa;

  @Column(name = "remark")
  private String remark;

  // 감사
  @CreatedDate
  @Column(name = "reg_dt", updatable = false)
  private LocalDateTime regDt;

  @LastModifiedDate
  @Column(name = "mod_dt")
  private LocalDateTime modDt;

  @Builder
  private ShipmentResult(Long shipResultSq, Long shipDtlSq, Long itemSq, Long customerSq,
                         String lotNo, LocalDate shipDate, Double shippedQty, Integer shippedQtyEa,
                         String remark, LocalDateTime regDt, LocalDateTime modDt) {
    // 식별 및 연관키
    this.shipResultSq = shipResultSq;
    this.shipDtlSq = shipDtlSq;
    this.itemSq = itemSq;
    this.customerSq = customerSq;
    // LOT / 출하일
    this.lotNo = lotNo;
    this.shipDate = shipDate;
    // 실제 출하량 (m / EA) 및 비고
    this.shippedQty = shippedQty;
    this.shippedQtyEa = shippedQtyEa;
    this.remark = remark;
    // 감사
    this.regDt = regDt;
    this.modDt = modDt;
  }

  /** m 또는 EA 어느 한쪽이라도 실제 출하량이 잡혀 있으면 true. */
  public boolean hasShippedQuantity() {
    return (shippedQty != null && shippedQty > 0)
        || (shippedQtyEa != null && shippedQtyEa > 0);
  }
}
