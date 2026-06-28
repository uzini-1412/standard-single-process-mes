package com.mes.domain.shipment.entity;

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
 * 거래명세서의 한 줄(라인 품목)을 표현한다.
 *
 * <p>품명·규격·수량 같은 표시 항목과 단가·공급가·세액의 금액 항목을 한 행에 모아 두며,
 * 부모 {@link TradeStatement} 와 다대일(N:1)로 연결된다.
 */
@Entity
@Table(name = "mes_trade_statement_item_tb")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
public class TradeStatementItem {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "item_sq")
  private Long itemSq;

  // 부모 거래명세서(지연 로딩)
  @Setter
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "statement_sq")
  private TradeStatement tradeStatement;

  // 표시 항목: 행 번호 / 품명 / 규격 / 수량
  @Column(name = "row_no")
  private Integer rowNo;

  @Column(name = "product_name")
  private String productName;

  @Column(name = "spec")
  private String spec;

  @Column(name = "qty")
  private Integer qty;

  // 금액 항목: 단가 / 공급가 / 세액
  @Column(name = "unit_price")
  private BigDecimal unitPrice;

  @Column(name = "supply_price")
  private BigDecimal supplyPrice;

  @Column(name = "tax")
  private BigDecimal tax;

  /** Builder 가 전체 필드를 채우는 구조이므로 전체 인자 생성자를 직접 정의해 둔다. */
  public TradeStatementItem(Long itemSq, TradeStatement tradeStatement, Integer rowNo,
                            String productName, String spec, Integer qty,
                            BigDecimal unitPrice, BigDecimal supplyPrice, BigDecimal tax) {
    // 식별 / 부모
    this.itemSq = itemSq;
    this.tradeStatement = tradeStatement;
    // 표시 항목
    this.rowNo = rowNo;
    this.productName = productName;
    this.spec = spec;
    this.qty = qty;
    // 금액 항목
    this.unitPrice = unitPrice;
    this.supplyPrice = supplyPrice;
    this.tax = tax;
  }

  /**
   * 공급가에 세액을 더한 라인 합계를 계산한다.
   * 공급가·세액이 모두 없으면 null 을 돌려준다.
   */
  public BigDecimal getLineTotal() {
    if (supplyPrice == null && tax == null) {
      return null;
    }
    BigDecimal sum = (supplyPrice != null) ? supplyPrice : BigDecimal.ZERO;
    if (tax != null) {
      sum = sum.add(tax);
    }
    return sum;
  }
}
