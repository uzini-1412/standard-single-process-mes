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
 * 완제품 재고 행의 수량 변동을 한 줄씩 쌓는 불변(append-only) 이력.
 * 미터(m)와 낱개(EA)를 각각 "변동 전 / 변동량 / 변동 후" 3단으로 보관하고,
 * 어떤 문서(출하실적 등)에서 비롯됐는지 ref_type / ref_sq 로 거슬러 올라갈 수 있다.
 */
@Entity
@Table(name = "mes_product_stock_history_tb")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class ProductStockHistory {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "history_sq")
  private Long historySq;

  @Column(name = "stock_sq", nullable = false)
  private Long stockSq;

  @Column(name = "item_sq", nullable = false)
  private Long itemSq;

  @Column(name = "lot_no")
  private String lotNo;

  /** 변동 유형: INBOUND / SHIP / ADJUST */
  @Column(name = "change_type")
  private String changeType;

  @Column(name = "prev_qty_m")
  private Double prevQtyM;

  @Column(name = "change_qty_m")
  private Double changeQtyM;

  @Column(name = "curr_qty_m")
  private Double currQtyM;

  @Column(name = "prev_qty_ea")
  private Integer prevQtyEa;

  @Column(name = "change_qty_ea")
  private Integer changeQtyEa;

  @Column(name = "curr_qty_ea")
  private Integer currQtyEa;

  /** 출처 문서 종류 (예: SHIPMENT_RESULT). */
  @Column(name = "ref_type")
  private String refType;

  /** 출처 문서 PK (예: 출하실적 sq). */
  @Column(name = "ref_sq")
  private Long refSq;

  @Column(name = "reason")
  private String reason;

  @Column(name = "worker_id")
  private String workerId;

  @CreatedDate
  @Column(name = "reg_dt", updatable = false)
  private LocalDateTime regDt;

  @Builder
  private ProductStockHistory(Long stockSq, Long itemSq, String lotNo, String changeType,
                              Double prevQtyM, Double changeQtyM, Double currQtyM,
                              Integer prevQtyEa, Integer changeQtyEa, Integer currQtyEa,
                              String refType, Long refSq, String reason, String workerId,
                              LocalDateTime regDt) {
    this.stockSq = stockSq;
    this.itemSq = itemSq;
    this.lotNo = lotNo;
    this.changeType = changeType;
    this.prevQtyM = prevQtyM;
    this.changeQtyM = changeQtyM;
    this.currQtyM = currQtyM;
    this.prevQtyEa = prevQtyEa;
    this.changeQtyEa = changeQtyEa;
    this.currQtyEa = currQtyEa;
    this.refType = refType;
    this.refSq = refSq;
    this.reason = reason;
    this.workerId = workerId;
    this.regDt = regDt;
  }

  /** 입고(INBOUND) 변동 여부. */
  public boolean isInbound() {
    return "INBOUND".equals(this.changeType);
  }
}
