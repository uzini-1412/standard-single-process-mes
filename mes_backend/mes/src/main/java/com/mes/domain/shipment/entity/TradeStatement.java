package com.mes.domain.shipment.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
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
import java.util.ArrayList;
import java.util.List;

/**
 * 거래명세서 헤더.
 *
 * <p>공급자/공급받는자 사업자 정보, 전잔→출하→입금→잔액 금액 요약, 그리고
 * 명세 라인({@link TradeStatementItem})을 하나의 발행 단위로 보관한다.
 */
@Entity
@Table(name = "mes_trade_statement_tb")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class TradeStatement {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "statement_sq")
  private Long statementSq;

  // 출처/조회 키
  @Column(name = "ship_order_sq")
  private Long shipOrderSq;

  @Column(name = "source_type")
  private String sourceType = "SHIP_ORDER";

  @Column(name = "source_key")
  private String sourceKey;

  @Column(name = "statement_date")
  private LocalDate statementDate;

  // 공급받는자(buyer)
  @Column(name = "buyer_reg_no")
  private String buyerRegNo;

  @Column(name = "buyer_company")
  private String buyerCompany;

  @Column(name = "buyer_ceo")
  private String buyerCeo;

  @Column(name = "buyer_address")
  private String buyerAddress;

  @Column(name = "buyer_biz_type")
  private String buyerBizType;

  @Column(name = "buyer_biz_item")
  private String buyerBizItem;

  // 공급자(supplier)
  @Column(name = "supplier_reg_no")
  private String supplierRegNo;

  @Column(name = "supplier_company")
  private String supplierCompany;

  @Column(name = "supplier_ceo")
  private String supplierCeo;

  @Column(name = "supplier_address")
  private String supplierAddress;

  @Column(name = "supplier_biz_type")
  private String supplierBizType;

  @Column(name = "supplier_biz_item")
  private String supplierBizItem;

  // 금액 요약 (전잔 → 출하 → 입금 → 잔액)
  @Column(name = "prev_balance")
  private String prevBalance;

  @Column(name = "ship_amount")
  private String shipAmount;

  @Column(name = "deposit_amount")
  private String depositAmount;

  @Column(name = "curr_balance")
  private String currBalance;

  // 인수자 / 비고
  @Column(name = "receiver_name")
  private String receiverName;

  @Column(name = "remark")
  private String remark;

  // 명세 라인 (1:N)
  @OneToMany(mappedBy = "tradeStatement", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<TradeStatementItem> items = new ArrayList<>();

  // 감사
  @CreatedDate
  @Column(name = "reg_dt", updatable = false)
  private LocalDateTime regDt;

  @LastModifiedDate
  @Column(name = "mod_dt")
  private LocalDateTime modDt;

  @Builder
  private TradeStatement(Long statementSq, Long shipOrderSq, String sourceType, String sourceKey,
                         LocalDate statementDate,
                         String buyerRegNo, String buyerCompany, String buyerCeo, String buyerAddress,
                         String buyerBizType, String buyerBizItem,
                         String supplierRegNo, String supplierCompany, String supplierCeo, String supplierAddress,
                         String supplierBizType, String supplierBizItem,
                         String prevBalance, String shipAmount, String depositAmount, String currBalance,
                         String receiverName, String remark,
                         List<TradeStatementItem> items, LocalDateTime regDt, LocalDateTime modDt) {
    // 식별/출처/일자
    this.statementSq = statementSq;
    this.shipOrderSq = shipOrderSq;
    this.sourceType = (sourceType != null) ? sourceType : "SHIP_ORDER";
    this.sourceKey = sourceKey;
    this.statementDate = statementDate;
    // 공급받는자(buyer)
    this.buyerRegNo = buyerRegNo;
    this.buyerCompany = buyerCompany;
    this.buyerCeo = buyerCeo;
    this.buyerAddress = buyerAddress;
    this.buyerBizType = buyerBizType;
    this.buyerBizItem = buyerBizItem;
    // 공급자(supplier)
    this.supplierRegNo = supplierRegNo;
    this.supplierCompany = supplierCompany;
    this.supplierCeo = supplierCeo;
    this.supplierAddress = supplierAddress;
    this.supplierBizType = supplierBizType;
    this.supplierBizItem = supplierBizItem;
    // 금액 요약 / 인수자 / 비고
    this.prevBalance = prevBalance;
    this.shipAmount = shipAmount;
    this.depositAmount = depositAmount;
    this.currBalance = currBalance;
    this.receiverName = receiverName;
    this.remark = remark;
    // 자식 컬렉션 / 감사
    this.items = (items != null) ? items : new ArrayList<>();
    this.regDt = regDt;
    this.modDt = modDt;
  }

  /** 명세 라인을 추가하면서 자식의 역참조를 함께 세팅한다. */
  public void addItem(TradeStatementItem item) {
    item.setTradeStatement(this);
    this.items.add(item);
  }

  /**
   * source 헤더의 마스터 필드를 현재 레코드로 복사한다(items 제외).
   * 명세 라인은 호출부에서 별도로 교체한다.
   */
  public void update(TradeStatement source) {
    // 출처/일자
    this.sourceType = source.sourceType;
    this.sourceKey = source.sourceKey;
    this.statementDate = source.statementDate;
    // 공급받는자(buyer)
    this.buyerRegNo = source.buyerRegNo;
    this.buyerCompany = source.buyerCompany;
    this.buyerCeo = source.buyerCeo;
    this.buyerAddress = source.buyerAddress;
    this.buyerBizType = source.buyerBizType;
    this.buyerBizItem = source.buyerBizItem;
    // 공급자(supplier)
    this.supplierRegNo = source.supplierRegNo;
    this.supplierCompany = source.supplierCompany;
    this.supplierCeo = source.supplierCeo;
    this.supplierAddress = source.supplierAddress;
    this.supplierBizType = source.supplierBizType;
    this.supplierBizItem = source.supplierBizItem;
    // 금액 요약 / 인수자 / 비고
    this.prevBalance = source.prevBalance;
    this.shipAmount = source.shipAmount;
    this.depositAmount = source.depositAmount;
    this.currBalance = source.currBalance;
    this.receiverName = source.receiverName;
    this.remark = source.remark;
  }
}
