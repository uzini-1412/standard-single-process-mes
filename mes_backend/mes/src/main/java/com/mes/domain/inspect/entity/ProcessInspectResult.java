package com.mes.domain.inspect.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 공정(자주) 검사 결과 한 건.
 *
 * <p>등록 시점의 기준서 항목/기준값을 함께 박제(snapshot)한다. 따라서 원본 기준서가
 * 나중에 수정되더라도 이 행은 검사 당시 보았던 기준 그대로를 영구히 보존한다.
 */
@Entity
@Table(name = "mes_process_inspect_result_tb")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
@EntityListeners(AuditingEntityListener.class)
public class ProcessInspectResult {

  /** 초품 입력만 끝난 상태. */
  public static final String PHASE_FIRST = "FIRST";
  /** 종품까지 입력되어 완료된 상태. */
  public static final String PHASE_LAST = "LAST";

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "result_sq")
  private Long resultSq;

  // 결과가 가리키는 대상 (작업지시 / 기준서 / 품목 항목)
  @Column(name = "work_order_sq", nullable = false)
  private Long workOrderSq;

  @Column(name = "inspect_std_sq", nullable = false)
  private Long inspectStdSq;

  @Column(name = "item_dtl_sq", nullable = false)
  private Long itemDtlSq;

  // 실제 검사 실적
  @Column(name = "inspect_date")
  private LocalDate inspectDate;

  @Column(name = "inspector")
  private String inspector;

  @Column(name = "first_val")
  private String firstVal;

  @Column(name = "last_val")
  private String lastVal;

  @Column(name = "pass_fail")
  private String passFail;

  @Column(name = "inspect_phase")
  private String inspectPhase;

  // 등록 시점 기준서 스냅샷 — 항목/판정/측정 메타
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

  @Column(name = "sample_cnt", length = 20)
  private String sampleCnt;

  // 등록 시점 기준서 스냅샷 — 허용 범위
  @Column(name = "base_val", length = 50)
  private String baseVal;

  @Column(name = "max_val", length = 50)
  private String maxVal;

  @Column(name = "min_val", length = 50)
  private String minVal;

  // 감사 컬럼
  @CreatedDate
  @Column(name = "reg_dt", updatable = false)
  private LocalDateTime regDt;

  @LastModifiedDate
  @Column(name = "mod_dt")
  private LocalDateTime modDt;

  /**
   * 종품 측정치와 그 판정 결과를 기록하면서, 진행 단계를 완료(LAST)로 전환한다.
   * 초품만 남아 있던 행이 이 호출로 마감 처리된다.
   */
  public void updateLastVal(String lastVal, String passFail) {
    this.lastVal = lastVal;
    this.passFail = passFail;
    this.inspectPhase = PHASE_LAST;
  }

  /** 진행 단계가 LAST 인지를 보고 종품까지 마감된 행인지 판단한다. */
  public boolean isCompleted() {
    return PHASE_LAST.equals(this.inspectPhase);
  }
}
