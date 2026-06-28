package com.mes.domain.purchase.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * 발주 상세 한 줄. 발주 마스터 1건에 N 개가 매달리며, 품목/수량/단가와
 * 계산된 금액 3종(공급가·부가세·합계)을 담는다.
 */
@Entity
@Table(name = "mes_purchase_order_dtl_tb")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseOrderDetail {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "order_dtl_sq")
  private Long orderDtlSq;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "order_sq")
  @Setter
  private PurchaseOrder purchaseOrder;   // 소속 마스터 (지연 로딩)

  // 품목 + 수량 + 단가
  @Column(name = "item_sq", nullable = false)
  private Long itemSq;

  @Column(name = "order_qty")
  private Integer orderQty;

  @Column(name = "order_unit")
  private String orderUnit;

  @Column(name = "unit_price")
  private BigDecimal unitPrice;

  // 금액 3종
  @Column(name = "supply_amt")
  private BigDecimal supplyAmt;

  @Column(name = "vat_amt")
  private BigDecimal vatAmt;

  @Column(name = "total_amt")
  private BigDecimal totalAmt;

  private String spec;

  private String remark;
}
