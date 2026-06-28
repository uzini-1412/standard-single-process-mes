package com.mes.domain.bom.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 품목구성(BOM) 헤더 — 완제품 1건 = BOM 1건. (STANDARDIZATION.md §6)
 * 라인(BomLine)의 componentItemSq 가 또 자기 BomHeader 를 가지면 다단계로 전개된다.
 */
@Entity
@Table(name = "mes_bom_header_tb")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class BomHeader {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "bom_sq")
  private Long bomSq;

  @Column(name = "bom_no", length = 20)
  private String bomNo; // BOM 번호 ({itemTypeCode}-YYYYMM-001)

  @Column(name = "product_item_sq", nullable = false)
  private Long productItemSq; // 완제품 품목 FK

  @Column(name = "use_yn")
  private Boolean useYn;

  @CreatedDate
  @Column(name = "reg_dt", updatable = false)
  private LocalDateTime regDt;

  @LastModifiedDate
  @Column(name = "mod_dt")
  private LocalDateTime modDt;

  public void updateInfo(String bomNo, Boolean useYn) {
    if (bomNo != null) this.bomNo = bomNo;
    this.useYn = useYn;
  }
}
