package com.mes.domain.material.entity;

import lombok.AccessLevel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 투입 실적 헤더({@link MaterialInput})에 매달리는 한 시간대 행.
 * 자재 A~D 각각의 사용량과 그 합계를 담는다.
 */
@Entity
@Table(name = "mes_material_input_dtl_tb")
@Getter
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MaterialInputDetail {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "input_dtl_sq")
  private Long inputDtlSq;

  /** 부모 헤더. {@link MaterialInput#addDetail} 에서 역방향을 맞추므로 Setter 를 연다. */
  @Setter
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "input_sq", nullable = false)
  private MaterialInput materialInput;

  /** 이 행이 가리키는 시간대 라벨 (예: "08:00~09:00"). */
  @Column(name = "work_time_range")
  private String workTimeRange;

  @Column(name = "mat_a_usage")
  private Double matAUsage;

  @Column(name = "mat_b_usage")
  private Double matBUsage;

  @Column(name = "mat_c_usage")
  private Double matCUsage;

  @Column(name = "mat_d_usage")
  private Double matDUsage;

  /** A+B+C+D 합계 (저장값). */
  @Column(name = "row_total_usage")
  private Double rowTotalUsage;

  /**
   * 저장된 합계와 무관하게 A~D 를 즉석에서 더한 값.
   * null 사용량은 0 으로 본다.
   */
  public double sumUsage() {
    return nz(matAUsage) + nz(matBUsage) + nz(matCUsage) + nz(matDUsage);
  }

  private static double nz(Double v) {
    return v == null ? 0.0 : v;
  }
}
