package com.mes.domain.commoninfo.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * 공통코드 세부항목이 보유하는 개별 내용 값 한 건.
 * 한 세부항목(CommonDetail) 아래로 여러 개가 정렬순서를 가지고 매달린다.
 */
@Entity
@Table(name = "tb_common_value")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommonValue {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "value_sq")
  private Long valueSq;

  /** 소속 세부항목(부모) */
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "detail_sq", nullable = false)
  private CommonDetail commonDetail;

  /** 실제 표시/저장되는 내용 문자열 */
  @Column(name = "value_content", nullable = false, length = 100)
  private String valueContent;

  // 값 부가 분류 코드 (예: 라인구분 값의 표시그룹 코드 — 같은 코드끼리 대시보드 한 카드로 병합)
  @Column(name = "attr_code", length = 20)
  private String attrCode;

  /** 같은 세부항목 내 노출 순서 */
  @Column(name = "sort_order")
  private Integer sortOrder;

  // @Setter 가 전체 적용돼 있으나, 의도를 드러내기 위해 일부 setter 는 명시적으로 둔다.
  public void setSortOrder(Integer sortOrder) {
    this.sortOrder = sortOrder;
  }

  public void setAttrCode(String attrCode) {
    this.attrCode = attrCode;
  }

  public void setValueContent(String valueContent) {
    this.valueContent = valueContent;
  }
}
