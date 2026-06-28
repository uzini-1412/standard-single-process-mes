package com.mes.domain.stock.entity;

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
 * 자재 재고 마스터. (품목 + LOT) 단위 현재 보유 수량(currentQty)과, 출하지시 등으로
 * 미리 잡아둔 예약 수량(reservedQty)을 관리한다. 가용 수량은 현재고 - 예약으로 파생된다.
 */
@Entity
@Table(name = "mes_material_stock_tb")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class MaterialStock {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "stock_sq")
  private Long stockSq;

  @Column(name = "item_sq", nullable = false)
  private Long itemSq;

  @Column(name = "lot_no", nullable = false)
  private String lotNo;

  @Column(name = "item_weight")
  private Double itemWeight;

  @Column(name = "current_qty")
  private Double currentQty;

  @Column(name = "reserved_qty")
  private Double reservedQty = 0.0;

  @Column(name = "warehouse_loc")
  private String warehouseLoc;

  @Column(name = "stock_status")
  private String stockStatus;

  @Column(name = "last_in_date")
  private LocalDate lastInDate;

  @Column(name = "remark")
  private String remark;

  @Column(name = "writer_id")
  private String writerId;

  @CreatedDate
  @Column(name = "reg_dt", updatable = false)
  private LocalDateTime regDt;

  @LastModifiedDate
  @Column(name = "mod_dt")
  private LocalDateTime modDt;

  @Builder
  private MaterialStock(Long itemSq, String lotNo, Double itemWeight, Double currentQty,
                        Double reservedQty, String warehouseLoc, String stockStatus,
                        LocalDate lastInDate, String remark, String writerId, LocalDateTime regDt) {
    this.itemSq = itemSq;
    this.lotNo = lotNo;
    this.itemWeight = itemWeight;
    this.currentQty = currentQty;
    this.reservedQty = reservedQty != null ? reservedQty : 0.0;
    this.warehouseLoc = warehouseLoc;
    this.stockStatus = stockStatus;
    this.lastInDate = lastInDate;
    this.remark = remark;
    this.writerId = writerId;
    this.regDt = regDt;
  }

  /** 중량·수량·위치·비고·작성자 등 기본 속성을 한꺼번에 덮어쓴다. */
  public void updateStock(Double itemWeight, Double currentQty, String warehouseLoc,
                          String remark, String writerId) {
    this.currentQty = currentQty;
    this.itemWeight = itemWeight;
    this.remark = remark;
    this.warehouseLoc = warehouseLoc;
    this.writerId = writerId;
  }

  /** 출하지시 등으로 예약 수량을 누적한다. null 입력은 0 으로 본다. */
  public void addReserved(Double qty) {
    this.reservedQty = nz(this.reservedQty) + nz(qty);
  }

  /** 예약 수량을 차감하되, 음수까지 떨어지지는 않게 0 에서 막는다. */
  public void releaseReserved(Double qty) {
    double next = nz(this.reservedQty) - nz(qty);
    this.reservedQty = (next < 0.0) ? 0.0 : next;
  }

  /** 실제 보유 재고를 줄이는 동시에 같은 양만큼 예약도 풀어 준다. */
  public void consumeStock(Double qty) {
    double amount = nz(qty);
    double remaining = nz(this.currentQty) - amount;
    this.currentQty = (remaining < 0.0) ? 0.0 : remaining;
    releaseReserved(amount);
  }

  /** 가용 수량은 현재고에서 예약분을 뺀 값이다. */
  public Double getAvailableQty() {
    return nz(this.currentQty) - nz(this.reservedQty);
  }

  private static double nz(Double value) {
    return value == null ? 0.0 : value;
  }
}
