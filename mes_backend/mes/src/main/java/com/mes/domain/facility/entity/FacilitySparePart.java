package com.mes.domain.facility.entity;

import jakarta.persistence.*;
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

/**
 * 설비 정비 시 교체용으로 쌓아두는 예비 부품 한 종류.
 * <p>설비예비품관리 화면이 다루며 부품번호(part_no)를 유일 식별자로 쓴다.
 * 현재고/안전재고 같은 재고 수치와 보관 위치, 어느 설비에 쓰이는지를 함께 보관한다.
 */
@Entity
@Table(name = "mes_facility_spare_part_tb")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FacilitySparePart {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "spare_part_sq")
  private Long sparePartSq;

  @Column(name = "part_no", nullable = false, unique = true)
  private String partNo;

  @Column(name = "part_nm", nullable = false)
  private String partNm;

  @Column(name = "spec")
  private String spec;

  @Column(name = "supplier_nm")
  private String supplierNm;

  @Column(name = "purchase_date")
  private LocalDate purchaseDate;

  @Column(name = "purchase_price")
  private BigDecimal purchasePrice;

  @Column(name = "safety_stock")
  private Double safetyStock;

  @Column(name = "current_stock")
  private Double currentStock;

  @Column(name = "storage_loc")
  private String storageLoc;

  @Column(name = "use_facility")
  private String useFacility;

  @Column(name = "img_paths", columnDefinition = "LONGTEXT")
  private String imgPaths;

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

  /**
   * 부품의 일반 속성을 통째로 갱신한다. PK(spare_part_sq)와 감사 컬럼은 건드리지 않는다.
   */
  public void updateSparePart(String partNo, String partNm, String spec, String supplierNm,
      LocalDate purchaseDate, BigDecimal purchasePrice, Double safetyStock,
      Double currentStock, String storageLoc, String useFacility,
      String imgPaths, String remark) {
    this.partNo = partNo;
    this.partNm = partNm;
    this.spec = spec;
    this.supplierNm = supplierNm;
    this.purchaseDate = purchaseDate;
    this.purchasePrice = purchasePrice;
    this.safetyStock = safetyStock;
    this.currentStock = currentStock;
    this.storageLoc = storageLoc;
    this.useFacility = useFacility;
    this.imgPaths = imgPaths;
    this.remark = remark;
  }

  /**
   * 현재고가 안전재고를 밑도는지 여부. 두 값 중 하나라도 비어 있으면 판정 불가로 보고 false 를 돌려준다.
   */
  public boolean isBelowSafetyStock() {
    if (safetyStock == null || currentStock == null) {
      return false;
    }
    return currentStock < safetyStock;
  }
}
