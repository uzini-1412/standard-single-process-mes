package com.mes.domain.material.entity;

import com.mes.domain.quality.entity.InspectionResult;
import lombok.AccessLevel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 수입검사에서 가입고 한 건의 검사 항목 하나에 대한 결과 행.
 *
 * <p>항목명·기준·방법 같은 기준서 메타는 검사를 등록하는 순간의 값으로 복사해 둔다.
 * 기준서가 나중에 바뀌더라도 이미 기록된 과거 검사 결과는 당시 기준 그대로 남는다.
 */
@Entity
@Table(name = "mes_inbound_inspect_result_tb")
@Getter
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InboundInspectResult {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "result_sq")
  private Long resultSq;

  // 어느 가입고의 어느 기준서 항목인지
  @Column(name = "inbound_sq", nullable = false)
  private Long inboundSq;

  /** 기준서 항목 PK. */
  @Column(name = "item_dtl_sq", nullable = false)
  private Long itemDtlSq;

  // 측정값과 항목 판정
  @Column(name = "measure_val")
  private String measureVal;

  /** 이 항목의 합격/불합격. */
  @Enumerated(EnumType.STRING)
  @Column(name = "result_yn", length = 10)
  private InspectionResult resultYn;

  @Column(name = "sample_cnt")
  private Integer sampleCnt;

  @Column(name = "remark")
  private String remark;

  // 검사 등록 시점의 기준서 값을 박제한 스냅샷 (이후 개정과 무관하게 고정)
  @Column(name = "inspect_item_nm", length = 200)
  private String inspectItemName;

  @Column(name = "inspect_criteria", length = 500)
  private String inspectCriteria;

  @Column(name = "measure_type", length = 20)
  private String measureType;

  @Column(name = "inspect_method", length = 100)
  private String inspectMethod;

  @Column(name = "inspect_cycle", length = 50)
  private String inspectCycle;

  @Column(name = "base_val", length = 50)
  private String baseVal;

  @Column(name = "max_val", length = 50)
  private String maxVal;

  @Column(name = "min_val", length = 50)
  private String minVal;

  // 시료 1~15 의 개별 측정값
  @Column(name = "x1", length = 10)
  private String x1;
  @Column(name = "x2", length = 10)
  private String x2;
  @Column(name = "x3", length = 10)
  private String x3;
  @Column(name = "x4", length = 10)
  private String x4;
  @Column(name = "x5", length = 10)
  private String x5;
  @Column(name = "x6", length = 10)
  private String x6;
  @Column(name = "x7", length = 10)
  private String x7;
  @Column(name = "x8", length = 10)
  private String x8;
  @Column(name = "x9", length = 10)
  private String x9;
  @Column(name = "x10", length = 10)
  private String x10;
  @Column(name = "x11", length = 10)
  private String x11;
  @Column(name = "x12", length = 10)
  private String x12;
  @Column(name = "x13", length = 10)
  private String x13;
  @Column(name = "x14", length = 10)
  private String x14;
  @Column(name = "x15", length = 10)
  private String x15;

  /** 이 항목이 적합(OK) 판정인지. */
  public boolean isOk() {
    return resultYn == InspectionResult.OK;
  }
}
