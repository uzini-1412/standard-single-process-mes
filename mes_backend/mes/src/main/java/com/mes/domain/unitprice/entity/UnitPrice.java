package com.mes.domain.unitprice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 단가 이력 한 건. 품목/거래처/규격(폭·길이)/구분 조합마다 적용기간을 가진 행으로 누적된다.
 * 삭제는 물리 삭제 대신 use_yn 플래그를 내려 이력을 남긴다.
 */
@Entity
@Table(name = "mes_unit_price_tb")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class UnitPrice {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "unit_price_sq")
  private Long unitPriceSq;

  // ── 대상 식별 (품목 + 거래처 + 규격) ──
  @Column(name = "item_sq", nullable = false)
  private Long itemSq;

  @Column(name = "customer_sq")
  private Long customerSq;

  @Column(name = "width")
  private Double width;

  @Column(name = "length")
  private Double length;

  // ── 단가 값 ──
  @Enumerated(EnumType.STRING)
  @Column(name = "price_type", nullable = false, length = 10)
  private PriceType priceType;

  @Column(name = "unit_price", nullable = false)
  private BigDecimal price;

  @Column(name = "price_unit")
  private String priceUnit; // m2 / ea / kg

  // ── 적용 기간 / 메모 ──
  @Column(name = "start_date", nullable = false)
  private LocalDate startDate;

  @Column(name = "end_date")
  private LocalDate endDate;

  @Column(name = "change_date")
  private LocalDateTime changeDate;

  @Column(name = "remark")
  private String remark;

  @Column(name = "use_yn")
  private Boolean useYn;

  // ── 감사 컬럼 ──
  @CreatedDate
  @Column(name = "reg_dt", updatable = false)
  private LocalDateTime regDt;

  @LastModifiedDate
  @Column(name = "mod_dt")
  private LocalDateTime modDt;

  /** 비활성 처리(소프트 삭제). 행은 그대로 두고 use_yn 만 false 로 바꾼다. */
  public void softDelete() {
    this.useYn = false;
  }

  /**
   * 기존 단가 행의 값을 갱신한다. null 로 넘어온 부가 항목(단위·변경시각·길이·사용여부)은
   * 기존 값을 유지하고, 가격/기간/비고는 항상 덮어쓴다.
   */
  public void updateInfo(BigDecimal price, LocalDate startDate, LocalDate endDate,
      String remark, String priceUnit, LocalDateTime changeDate,
      Double length, Boolean useYn) {
    this.price = price;
    this.startDate = startDate;
    this.endDate = endDate;
    this.remark = remark;
    if (priceUnit != null) {
      this.priceUnit = priceUnit;
    }
    if (changeDate != null) {
      this.changeDate = changeDate;
    }
    if (length != null) {
      this.length = length;
    }
    if (useYn != null) {
      this.useYn = useYn;
    }
  }
}
