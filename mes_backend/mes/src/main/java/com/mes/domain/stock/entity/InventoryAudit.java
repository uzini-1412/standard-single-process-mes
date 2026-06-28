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

import java.time.LocalDateTime;

/**
 * 재고실사 한 건의 측정 결과. 품목/LOT 기준 시스템 재고(currentQty)와 실측 재고(measuredQty),
 * 그 차이(diffQty)를 들고 있다가 관리자가 재고조정으로 반영하면 applied 계열 컬럼이 채워진다.
 */
@Entity
@Table(name = "mes_inventory_audit_tb")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class InventoryAudit {

  /** 반영 완료 표식 값. */
  private static final String APPLIED = "Y";

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "audit_sq")
  private Long auditSq;

  @Column(name = "item_code", nullable = false)
  private String itemCode;

  @Column(name = "item_name")
  private String itemName;

  @Column(name = "lot_no")
  private String lotNo;

  @Column(name = "account_label")
  private String accountLabel;

  @Column(name = "warehouse_loc")
  private String warehouseLoc;

  @Column(name = "storage_loc")
  private String storageLoc;

  @Column(name = "current_qty")
  private Double currentQty;

  @Column(name = "measured_qty")
  private Double measuredQty;

  @Column(name = "diff_qty")
  private Double diffQty;

  @Column(name = "applied_yn")
  private String appliedYn;

  @Column(name = "applied_writer_id")
  private String appliedWriterId;

  @Column(name = "applied_remark")
  private String appliedRemark;

  @Column(name = "applied_dt")
  private LocalDateTime appliedDt;

  @CreatedDate
  @Column(name = "reg_dt", updatable = false)
  private LocalDateTime regDt;

  @LastModifiedDate
  @Column(name = "mod_dt")
  private LocalDateTime modDt;

  @Builder
  private InventoryAudit(String itemCode, String itemName, String lotNo, String accountLabel,
                         String warehouseLoc, String storageLoc,
                         Double currentQty, Double measuredQty, Double diffQty,
                         String appliedYn, String appliedWriterId, String appliedRemark,
                         LocalDateTime appliedDt) {
    this.itemCode = itemCode;
    this.itemName = itemName;
    this.lotNo = lotNo;
    this.accountLabel = accountLabel;
    this.warehouseLoc = warehouseLoc;
    this.storageLoc = storageLoc;
    this.currentQty = currentQty;
    this.measuredQty = measuredQty;
    this.diffQty = diffQty;
    this.appliedYn = appliedYn;
    this.appliedWriterId = appliedWriterId;
    this.appliedRemark = appliedRemark;
    this.appliedDt = appliedDt;
  }

  /** 이미 재고에 반영된(applied) 건인지 알려준다. */
  public boolean isApplied() {
    return APPLIED.equals(this.appliedYn);
  }

  /**
   * 새로 측정한 재고를 반영한다: 측정값이 들어오면 차이(diffQty)를 다시 산출하고,
   * 비어 있지 않은 위치 값만 덮어쓴 다음 반영 메타데이터를 찍는다.
   * 재고실사 결과를 실재고로 옮기는 경로에서 사용된다.
   */
  public void applyAdjustment(Double newMeasuredQty,
                              String warehouseLoc,
                              String storageLoc,
                              String writerId,
                              String remark) {
    if (newMeasuredQty != null) {
      double prior = (this.currentQty != null) ? this.currentQty : 0.0;
      this.measuredQty = newMeasuredQty;
      this.diffQty = newMeasuredQty - prior;
    }
    applyIfFilled(warehouseLoc, value -> this.warehouseLoc = value);
    applyIfFilled(storageLoc, value -> this.storageLoc = value);
    stampApplied(writerId, remark);
  }

  /** 수량·위치는 그대로 두고 반영 메타데이터만 남긴다. */
  public void markApplied(String writerId, String remark) {
    stampApplied(writerId, remark);
  }

  private static void applyIfFilled(String value, java.util.function.Consumer<String> setter) {
    if (value != null && !value.isBlank()) {
      setter.accept(value);
    }
  }

  private void stampApplied(String writerId, String remark) {
    this.appliedDt = LocalDateTime.now();
    this.appliedWriterId = writerId;
    this.appliedRemark = remark;
    this.appliedYn = APPLIED;
  }
}
