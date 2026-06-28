package com.mes.domain.sales.entity;

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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 매출(수주) 한 건의 헤더 레코드.
 *
 * <p>한 거래처에게 나가는 주문 하나를 나타낸다. 납품·결제 조건과 합계 금액 같은
 * 헤더성 속성을 보관하고, 품목별 라인({@link SalesOrderDetail})을 자식 컬렉션으로
 * 끌어안는다. 부가세 적용여부와 세율은 입력이 비어 있을 때 각각 "적용"과 10% 로
 * 메워 둔다.</p>
 */
@Entity
@Table(name = "mes_sales_order_tb")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class SalesOrder {

  /** 세율 입력이 없을 때 적용하는 표준 부가세율(%). */
  private static final BigDecimal STANDARD_VAT_RATE = new BigDecimal("10.00");

  // --- 식별자 ---
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "order_sq")
  private Long orderSq;

  @Column(name = "order_no", nullable = false, unique = true, length = 20)
  private String orderNo;

  // --- 거래처/일정 ---
  @Column(name = "customer_sq", nullable = false)
  private Long customerSq;

  @Column(name = "order_date", nullable = false)
  private LocalDate orderDate;

  @Column(name = "delivery_req_date")
  private LocalDate deliveryReqDate;

  @Column(name = "delivery_place")
  private String deliveryPlace;

  @Column(name = "payment_terms")
  private String paymentTerms;

  // --- 부가세 ---
  @Column(name = "tax_apply_yn")
  private Boolean taxApplyYn = Boolean.TRUE;

  @Column(name = "tax_rate", precision = 5, scale = 2)
  private BigDecimal taxRate = STANDARD_VAT_RATE;

  // --- 금액/상태 ---
  @Column(name = "total_order_amt")
  private BigDecimal totalOrderAmt;

  /** 진행 단계: ORDERED → SHIPPING → COMPLETED. */
  @Column(name = "order_status", length = 20)
  private String orderStatus;

  // --- 기타 ---
  @Column(name = "remark")
  private String remark;

  @Column(name = "use_yn")
  private Boolean useYn;

  @CreatedDate
  @Column(name = "reg_dt", updatable = false)
  private LocalDateTime regDt;

  @LastModifiedDate
  @Column(name = "mod_dt")
  private LocalDateTime modDt;

  @OneToMany(mappedBy = "salesOrder", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<SalesOrderDetail> orderDetails = new ArrayList<>();

  @Builder
  private SalesOrder(Long orderSq, String orderNo, Long customerSq, LocalDate orderDate,
      LocalDate deliveryReqDate, String deliveryPlace, String paymentTerms,
      BigDecimal totalOrderAmt, String orderStatus, Boolean taxApplyYn, BigDecimal taxRate,
      String remark, Boolean useYn) {
    this.orderSq = orderSq;
    this.orderNo = orderNo;
    this.customerSq = customerSq;
    this.orderDate = orderDate;
    this.deliveryReqDate = deliveryReqDate;
    this.deliveryPlace = deliveryPlace;
    this.paymentTerms = paymentTerms;
    this.totalOrderAmt = totalOrderAmt;
    this.orderStatus = orderStatus;
    this.remark = remark;
    this.useYn = useYn;
    // 부가세 항목은 null 입력을 표준값으로 보정한다.
    this.taxApplyYn = firstNonNull(taxApplyYn, Boolean.TRUE);
    this.taxRate = firstNonNull(taxRate, STANDARD_VAT_RATE);
  }

  /** 합계 금액만 갱신한다(라인 재집계 결과 반영용). */
  public void updateTotalAmt(BigDecimal totalOrderAmt) {
    this.totalOrderAmt = totalOrderAmt;
  }

  /**
   * 자식 라인을 컬렉션에 추가하고 부모-자식 양방향 링크를 맞춰 준다.
   */
  public void addDetail(SalesOrderDetail detail) {
    detail.setSalesOrder(this);
    this.orderDetails.add(detail);
  }

  /**
   * 헤더 정보를 일괄 갱신한다. 부가세 적용여부/세율 인자는 값이 들어온 경우에만
   * 반영하므로, 화면에서 비워 보낸 항목은 기존 값이 보존된다.
   */
  public void updateInfo(Long customerSq, LocalDate orderDate, LocalDate deliveryReqDate,
      String deliveryPlace, String paymentTerms, String remark,
      Boolean taxApplyYn, BigDecimal taxRate) {
    this.customerSq = customerSq;
    this.orderDate = orderDate;
    this.deliveryReqDate = deliveryReqDate;
    this.deliveryPlace = deliveryPlace;
    this.paymentTerms = paymentTerms;
    this.remark = remark;

    this.taxApplyYn = firstNonNull(taxApplyYn, this.taxApplyYn);
    this.taxRate = firstNonNull(taxRate, this.taxRate);
  }

  private static <V> V firstNonNull(V candidate, V fallback) {
    return candidate != null ? candidate : fallback;
  }
}
