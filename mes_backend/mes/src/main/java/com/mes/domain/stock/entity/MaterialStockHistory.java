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
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 자재 재고 행의 수량 변동을 시간순으로 누적하는 이력. 수량은 "변동 전 → 변동량 → 변동 후"로
 * 나누어 보관하고, 기록 시점의 보관 위치(warehouseLoc)를 스냅샷으로 함께 남겨 위치가 바뀐
 * 뒤에도 과거 이력이 당시 위치를 그대로 보여 줄 수 있게 한다.
 */
@Entity
@Table(name = "mes_material_stock_history_tb")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class MaterialStockHistory {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "history_sq")
  private Long historySq;

  /** 이 변동이 속한 MaterialStock 행의 FK. */
  @Column(name = "stock_sq")
  private Long stockSq;

  /** 변동 유형: INBOUND / ADJUST / USE */
  @Column(name = "change_type")
  private String changeType;

  @Column(name = "prev_qty")
  private Double prevQty;

  @Column(name = "change_qty")
  private Double changeQty;

  @Column(name = "curr_qty")
  private Double currQty;

  /** 기록 시점의 보관 위치 스냅샷. */
  @Column(name = "warehouse_loc")
  private String warehouseLoc;

  @Column(name = "reason")
  private String reason;

  @Column(name = "worker_id")
  private String workerId;

  @CreatedDate
  @Column(name = "reg_dt", updatable = false)
  private LocalDateTime regDt;

  @Builder
  private MaterialStockHistory(Long stockSq, String changeType, Double prevQty, Double changeQty,
                               Double currQty, String warehouseLoc, String reason, String workerId,
                               LocalDateTime regDt) {
    this.stockSq = stockSq;
    this.changeType = changeType;
    this.prevQty = prevQty;
    this.changeQty = changeQty;
    this.currQty = currQty;
    this.warehouseLoc = warehouseLoc;
    this.reason = reason;
    this.workerId = workerId;
    this.regDt = regDt;
  }
}
