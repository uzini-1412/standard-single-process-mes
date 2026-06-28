package com.mes.domain.material.entity;

import lombok.AccessLevel;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 원소재 투입 실적의 헤더(작업일 · 라인 · 품목 단위).
 * 시간대별 상세({@link MaterialInputDetail})를 자식으로 묶어 cascade 로 함께 저장한다.
 */
@Entity
@Table(name = "mes_material_input_tb")
@Getter
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MaterialInput {

  /** 작업 헤더를 가리키는 설비 기본값. */
  private static final String DEFAULT_FACILITY = "BLENDING FEEDER";

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "input_sq")
  private Long inputSq;

  // ── 작업 식별 키 ──────────────────────────────
  @Column(name = "work_order_sq", nullable = false)
  private Long workOrderSq;

  @Column(name = "work_date")
  private LocalDate workDate;

  /** 라인 번호 (1, 2, 3 …). */
  @Column(name = "line_sq")
  private Long lineSq;

  @Column(name = "item_sq")
  private Long itemSq;

  // ── 설비 · 중량 실적 ─────────────────────────
  @Builder.Default
  @Column(name = "facility_name")
  private String facilityName = DEFAULT_FACILITY;

  /** 관리자가 셋팅한 목표 총 중량. */
  @Column(name = "total_target_weight")
  private Double totalTargetWeight;

  /** PLC 가 올린 실측 총 중량. */
  @Column(name = "total_actual_weight")
  private Double totalActualWeight;

  @Column(name = "error_rate")
  private Double errorRate;

  @Column(name = "reg_dt", updatable = false)
  private LocalDateTime regDt;

  // ── 시간대별 상세 (cascade ALL + orphanRemoval) ──
  @Builder.Default
  @OneToMany(mappedBy = "materialInput", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<MaterialInputDetail> details = new ArrayList<>();

  /**
   * 상세 행을 추가하면서 양방향 연관관계의 반대편 참조도 같이 세팅한다.
   * details 리스트가 비어 있을 수도 있으므로 방어적으로 초기화한다.
   */
  public void addDetail(MaterialInputDetail detail) {
    if (details == null) {
      details = new ArrayList<>();
    }
    detail.setMaterialInput(this);
    details.add(detail);
  }
}
