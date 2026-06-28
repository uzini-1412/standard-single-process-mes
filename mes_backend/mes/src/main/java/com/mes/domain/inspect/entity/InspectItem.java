package com.mes.domain.inspect.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 검사 기준서({@link InspectStandard}) 한 장에 매달리는 점검 라인 하나.
 *
 * <p>항목명과 판정 기준 문구를 기본으로 들고 있으며, 수치로 합/불을 가르는 정량 항목이라면
 * 하한·기준·상한 세 값을 추가로 보관한다.
 */
@Entity
@Table(name = "mes_inspect_item_tb")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class InspectItem {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "item_dtl_sq")
  private Long itemDtlSq;

  @Column(name = "sort_no")
  private Integer sortNo;

  // --- 항목 본문 ---
  @Column(name = "inspect_item_nm")
  private String inspectItemName;

  @Column(name = "inspect_criteria")
  private String inspectCriteria;

  @Column(name = "measure_type")
  private String measureType;   // 정성 또는 정량

  @Column(name = "inspect_method")
  private String inspectMethod; // 육안, 치수 등

  @Column(name = "inspect_cycle")
  private String inspectCycle;

  @Column(name = "sample_cnt")
  private String sampleCnt;

  // --- 정량 항목의 허용 범위 ---
  @Column(name = "min_val")
  private String minVal;

  @Column(name = "base_val")
  private String baseVal;

  @Column(name = "max_val")
  private String maxVal;

  @Column(name = "remark")
  private String remark;

  // --- 소유 기준서 (다대일) ---
  @Setter
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "inspect_std_sq")
  private InspectStandard inspectStandard;

  /**
   * 수치 판정이 가능한 항목인지 알려준다. 하한과 상한이 모두 채워져 있어야
   * 측정값을 범위와 비교할 수 있으므로 둘 다 존재할 때만 참이다.
   */
  public boolean hasNumericRange() {
    return minVal != null && maxVal != null;
  }
}
