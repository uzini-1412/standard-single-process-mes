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
 * 품목구성(BOM) 라인. (STANDARDIZATION.md §6)
 * 코어(모든 제조 공통): componentItemSq / quantity / unit / seq.
 * 배합형(RECIPE) 확장: ratio(비중%) / basisWeight(평량) / plcMachineNo(PLC호기) / materialType(소재구분).
 *   - 배합 제조의 ratio → 코어의 quantity 로 일반화. ASSEMBLY 는 quantity 를, RECIPE 는 ratio/평량을 사용.
 */
@Entity
@Table(name = "mes_bom_line_tb")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class BomLine {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "bom_line_sq")
  private Long bomLineSq;

  @Column(name = "bom_sq", nullable = false)
  private Long bomSq; // BomHeader FK

  @Column(name = "component_item_sq", nullable = false)
  private Long componentItemSq; // 구성품(원료/부품) 품목 FK

  // ===== 코어 (모든 제조 공통) =====
  @Column(name = "quantity")
  private Double quantity; // 소요량

  @Column(name = "unit", length = 20)
  private String unit; // 단위

  @Column(name = "seq")
  private Integer seq; // 순번

  // ===== 배합형(RECIPE) 확장 =====
  @Column(name = "ratio")
  private Double ratio; // 비중(%)

  @Column(name = "basis_weight")
  private Double basisWeight; // 평량(g/m²)

  @Column(name = "plc_machine_no", length = 20)
  private String plcMachineNo; // PLC 호기 (공통코드 PLC호기)

  @Column(name = "material_type", length = 50)
  private String materialType; // 소재구분 (공통코드)

  @Column(name = "remark", length = 500)
  private String remark;

  @CreatedDate
  @Column(name = "reg_dt", updatable = false)
  private LocalDateTime regDt;

  @LastModifiedDate
  @Column(name = "mod_dt")
  private LocalDateTime modDt;

  public void updateInfo(Long componentItemSq, Double quantity, String unit, Integer seq,
      Double ratio, Double basisWeight, String plcMachineNo, String materialType, String remark) {
    this.componentItemSq = componentItemSq;
    this.quantity = quantity;
    this.unit = unit;
    this.seq = seq;
    this.ratio = ratio;
    this.basisWeight = basisWeight;
    this.plcMachineNo = plcMachineNo;
    this.materialType = materialType;
    this.remark = remark;
  }
}
