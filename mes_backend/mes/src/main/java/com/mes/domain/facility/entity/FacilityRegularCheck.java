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

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 한 건의 정기점검 레코드.
 * <p>하나의 행이 두 시점을 함께 들고 있다. plan_* 컬럼은 언제 무엇을 점검할지의 예정이고,
 * exec_* 컬럼은 실제로 수행한 뒤 채워지는 결과다. 진행 단계는 current_status 로 표현한다.
 */
@Entity
@Table(name = "mes_facility_regular_check_tb")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class FacilityRegularCheck {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "regular_check_sq")
  private Long regularCheckSq;

  @Column(name = "facility_sq", nullable = false)
  private Long facilitySq;

  @Column(name = "check_type")
  private String checkType;

  @Column(name = "checker_nm")
  private String checkerNm;

  @Column(name = "plan_date")
  private LocalDate planDate;

  @Column(name = "plan_content")
  private String planContent;

  @Column(name = "exec_date")
  private LocalDate execDate;

  @Column(name = "exec_content")
  private String execContent;

  @Column(name = "exec_result")
  private String execResult;

  @Column(name = "current_status")
  private String currentStatus;

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
   * 계획·실시 양쪽 필드를 통째로 교체한다. 식별자와 소속 설비(facility_sq)는 손대지 않는다.
   */
  public void updateCheck(String checkType, String checkerNm, LocalDate planDate, String planContent,
      LocalDate execDate, String execContent, String execResult,
      String currentStatus, String remark) {
    // 계획 영역
    this.checkType = checkType;
    this.checkerNm = checkerNm;
    this.planDate = planDate;
    this.planContent = planContent;
    // 실시 영역
    this.execDate = execDate;
    this.execContent = execContent;
    this.execResult = execResult;
    // 상태/비고
    this.currentStatus = currentStatus;
    this.remark = remark;
  }

  /** 실시일자가 기록돼 있으면 이미 수행이 끝난 점검으로 판단한다. */
  public boolean isExecuted() {
    return execDate != null;
  }
}
