package com.mes.domain.purchase.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
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
 * 발주 마스터. 한 건이 여러 발주상세(PurchaseOrderDetail)를 거느린다.
 * 컬럼명은 DB 계약이라 고정. 헤더 갱신/합계 반영/상세 연결은 도메인 메서드로만 한다.
 */
@Entity
@Table(name = "mes_purchase_order_tb")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class PurchaseOrder {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "order_sq")
  private Long orderSq;

  @Column(name = "order_no", nullable = false, unique = true, length = 20)
  private String orderNo;

  @Column(name = "order_status")
  private String orderStatus;

  // ── 거래처 / 일자 / 결제 ──
  @Column(name = "customer_sq", nullable = false)
  private Long customerSq;

  @Column(name = "order_date", nullable = false)
  private LocalDate orderDate;

  @Column(name = "in_req_date")
  private LocalDate inReqDate;

  @Column(name = "payment_terms")
  private String paymentTerms;

  @Column(name = "total_order_amt")
  private BigDecimal totalOrderAmt;

  // ── 부가세 설정 ──
  @Builder.Default
  @Column(name = "tax_apply_yn")
  private Boolean taxApplyYn = true;

  @Builder.Default
  @Column(name = "tax_rate", precision = 5, scale = 2)
  private BigDecimal taxRate = new BigDecimal("10.00");

  // ── 서류 요구 여부 + 첨부 경로 (재료시험성적서 / 거래명세서) ──
  @Column(name = "req_material_cert_yn")
  private Boolean reqMaterialCertYn;

  @Column(name = "req_trans_spec_yn")
  private Boolean reqTransSpecYn;

  @Column(name = "material_cert_file_path")
  private String materialCertFilePath;

  @Column(name = "material_cert_file_nm")
  private String materialCertFileNm;

  @Column(name = "trans_spec_file_path")
  private String transSpecFilePath;

  @Column(name = "trans_spec_file_nm")
  private String transSpecFileNm;

  // 기타 제출 서류 메모
  @Column(name = "submit_doc")
  private String submitDoc;

  @Column(name = "remark")
  private String remark;

  @Builder.Default
  @Column(name = "use_yn")
  private Boolean useYn = true;

  @CreatedDate
  @Column(name = "reg_dt", updatable = false)
  private LocalDateTime regDt;

  @LastModifiedDate
  @Column(name = "mod_dt")
  private LocalDateTime modDt;

  @OneToMany(mappedBy = "purchaseOrder", cascade = CascadeType.ALL, orphanRemoval = true)
  @Builder.Default
  private List<PurchaseOrderDetail> orderDetails = new ArrayList<>();

  /** 상세 한 줄을 양방향으로 연결한다. */
  public void addDetail(PurchaseOrderDetail detail) {
    detail.setPurchaseOrder(this);
    this.orderDetails.add(detail);
  }

  /** 합계 금액 반영. */
  public void updateTotalAmt(BigDecimal totalOrderAmt) {
    this.totalOrderAmt = totalOrderAmt;
  }

  /** 헤더(마스터) 항목 일괄 갱신. 부가세 설정은 null 이면 기존값을 유지한다. */
  public void updateOrder(Long customerSq, LocalDate orderDate, LocalDate inReqDate,
      String paymentTerms, String remark, String submitDoc,
      Boolean reqMaterialCertYn, Boolean reqTransSpecYn,
      String materialCertFilePath, String materialCertFileNm,
      String transSpecFilePath, String transSpecFileNm,
      Boolean taxApplyYn, BigDecimal taxRate,
      String modId) {
    this.customerSq = customerSq;
    this.orderDate = orderDate;
    this.inReqDate = inReqDate;
    this.paymentTerms = paymentTerms;
    this.remark = remark;
    this.submitDoc = submitDoc;
    this.reqMaterialCertYn = reqMaterialCertYn;
    this.reqTransSpecYn = reqTransSpecYn;
    this.materialCertFilePath = materialCertFilePath;
    this.materialCertFileNm = materialCertFileNm;
    this.transSpecFilePath = transSpecFilePath;
    this.transSpecFileNm = transSpecFileNm;
    if (taxApplyYn != null) {
      this.taxApplyYn = taxApplyYn;
    }
    if (taxRate != null) {
      this.taxRate = taxRate;
    }
  }
}
