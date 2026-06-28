package com.mes.domain.item.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 품목 규격 행. 하나의 품목이 폭/길이/평량이 다른 규격을 여러 개 가질 수 있으며,
 * {@code specOrder} 로 노출 순서를 정한다. 보관/창고 위치도 규격 단위로 관리한다.
 */
@Entity
@Table(name = "mes_item_spec_tb")
@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class ItemSpec {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "item_spec_sq")
  private Long itemSpecSq;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "item_sq", nullable = false)
  private Item item;

  // ── 치수·물성 ─────────────────────────────────────────
  @Column(name = "width")
  private Double width;

  @Column(name = "length")
  private Double length;

  @Column(name = "basis_weight")
  private Double basisWeight;

  @Column(name = "weight")
  private Double weight;

  // ── 재고·정렬·위치 ────────────────────────────────────
  @Column(name = "safety_stock")
  private Integer safetyStock;

  @Column(name = "spec_order")
  private Integer specOrder;

  @Column(name = "warehouse_loc", length = 100)
  private String warehouseLocation;

  @Column(name = "storage_loc", length = 100)
  private String storageLocation;

  @CreatedDate
  @Column(name = "reg_dt", updatable = false)
  private LocalDateTime regDt;

  /** 규격 값을 통째로 갱신한다(전량 교체 저장 흐름에서 사용). */
  public void updateInfo(Double width, Double length, Double basisWeight, Double weight, Integer safetyStock, Integer specOrder, String warehouseLocation, String storageLocation) {
    this.width = width;
    this.length = length;
    this.basisWeight = basisWeight;
    this.weight = weight;
    this.safetyStock = safetyStock;
    this.specOrder = specOrder;
    this.warehouseLocation = warehouseLocation;
    this.storageLocation = storageLocation;
  }

  /**
   * 평량 대표값. 구버전 데이터는 basis_weight 가 비어 있고 평량(g/m²)이
   * weight 컬럼에 들어간 경우가 있어 둘 중 채워진 값을 돌려준다.
   */
  public Double getEffectiveBasisWeight() {
    return basisWeight != null ? basisWeight : weight;
  }
}
