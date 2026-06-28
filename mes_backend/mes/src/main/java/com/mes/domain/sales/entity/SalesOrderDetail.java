package com.mes.domain.sales.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

import java.math.BigDecimal;

/**
 * 수주 1건에 딸린 품목 라인.
 *
 * <p>{@link SalesOrder} 한 건에 N개로 붙는 품목별 행이다. 주문 시점의 규격
 * (스펙·폭·길이·평량)과 계산된 금액을 그 순간의 스냅샷으로 보존하므로, 이후
 * 마스터 값이 바뀌어도 과거 주문 내역은 흔들리지 않는다. 부모 연결은
 * {@link SalesOrder#addDetail}이 책임지며, 그 용도로만 setter 를 열어 둔다.</p>
 */
@Entity
@Table(name = "mes_sales_order_dtl_tb")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SalesOrderDetail {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "order_dtl_sq")
  private Long orderDtlSq;

  @Setter
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "order_sq")
  private SalesOrder salesOrder;

  @Column(name = "item_sq", nullable = false)
  private Long itemSq;

  // [규격 스냅샷] 폭/길이/평량은 생산소요량 산출 도메인이 참조한다.
  private String spec;

  @Column(name = "basis_weight")
  private Double basisWeight;

  private Double width;
  private Double length;
  private Double weight;

  // [수량] 롤/낱장(ea)/면적(m²) 단위 병행
  @Column(name = "order_qty")
  private Integer orderQty;

  @Column(name = "order_qty_ea")
  private Integer orderQtyEa;

  @Column(name = "order_qty_m2")
  private Double orderQtyM2;

  @Column(name = "order_unit")
  private String orderUnit;

  // [금액] 단가·공급가·부가세·합계
  @Column(name = "unit_price")
  private BigDecimal unitPrice;

  @Column(name = "unit_vat_amt")
  private BigDecimal unitVatAmt;

  @Column(name = "supply_amt")
  private BigDecimal supplyAmt;

  @Column(name = "vat_amt")
  private BigDecimal vatAmt;

  @Column(name = "total_amt")
  private BigDecimal totalAmt;

  @Column(name = "remark")
  private String remark;

  @Builder
  private SalesOrderDetail(Long itemSq, String spec, Double width, Double length, Double weight,
      Double basisWeight, Integer orderQty, Integer orderQtyEa, Double orderQtyM2, String orderUnit,
      BigDecimal unitPrice, BigDecimal unitVatAmt, BigDecimal supplyAmt, BigDecimal vatAmt,
      BigDecimal totalAmt, String remark) {
    this.itemSq = itemSq;
    // 규격
    this.spec = spec;
    this.basisWeight = basisWeight;
    this.width = width;
    this.length = length;
    this.weight = weight;
    // 수량
    this.orderQty = orderQty;
    this.orderQtyEa = orderQtyEa;
    this.orderQtyM2 = orderQtyM2;
    this.orderUnit = orderUnit;
    // 금액
    this.unitPrice = unitPrice;
    this.unitVatAmt = unitVatAmt;
    this.supplyAmt = supplyAmt;
    this.vatAmt = vatAmt;
    this.totalAmt = totalAmt;
    this.remark = remark;
  }
}
