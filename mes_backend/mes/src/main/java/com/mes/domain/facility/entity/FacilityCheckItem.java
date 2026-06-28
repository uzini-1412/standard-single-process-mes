package com.mes.domain.facility.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 설비별 일상점검 기준(점검항목) 한 줄. 일상점검정의서에서 등록하며,
 * 일상점검 결과 입력 시 어떤 항목을 어떤 기준/주기/단위로 볼지의 템플릿이 된다.
 */
@Entity
@Table(name = "mes_facility_check_item_tb")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class FacilityCheckItem {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "check_item_sq")
  private Long checkItemSq;

  @Column(name = "facility_sq", nullable = false)
  private Long facilitySq;

  @Column(name = "check_item_nm", nullable = false)
  private String checkItemNm;

  @Column(name = "check_criteria")
  private String checkCriteria;

  @Column(name = "check_method")
  private String checkMethod;

  @Column(name = "check_cycle")
  private String checkCycle;

  @Column(name = "unit")
  private String unit;

  @Column(name = "min_val")
  private String minVal;

  @Column(name = "max_val")
  private String maxVal;

  @Column(name = "sort_order")
  private Integer sortOrder;

  @Column(name = "remark")
  private String remark;

  @Column(name = "check_item_img", columnDefinition = "LONGTEXT")
  private String checkItemImg;

  @Builder.Default
  @Column(name = "use_yn")
  private Boolean useYn = true;

  @CreatedDate
  @Column(name = "reg_dt", updatable = false)
  private LocalDateTime regDt;

  @LastModifiedDate
  @Column(name = "mod_dt")
  private LocalDateTime modDt;

  /** 상·하한이 모두 비어 있으면 수치 판정이 아닌 서술형 기준 항목으로 본다(파생). */
  public boolean hasNumericRange() {
    return minVal != null && !minVal.isBlank()
        && maxVal != null && !maxVal.isBlank();
  }

  /** 점검항목의 표시/판정 속성을 갱신한다. 소속 설비(facility_sq)는 변경하지 않는다. */
  public void updateItem(String checkItemNm, String checkCriteria, String checkMethod, String checkCycle,
      String minVal, String maxVal, String remark, String unit, String checkItemImg,
      Integer sortOrder) {
    this.checkItemNm = checkItemNm;
    this.checkCriteria = checkCriteria;
    this.checkMethod = checkMethod;
    this.checkCycle = checkCycle;
    this.unit = unit;
    this.minVal = minVal;
    this.maxVal = maxVal;
    this.sortOrder = sortOrder;
    this.checkItemImg = checkItemImg;
    this.remark = remark;
  }
}
