package com.mes.domain.facility.entity;

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
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 특정 설비에서 일어난 고장 또는 수리 한 건의 기록.
 * <p>한 레코드 안에 고장 발생 쪽 정보(occur_*)와 그에 대한 처리 쪽 정보(action_*)가 같이 들어간다.
 * 이력 그리드 화면과 이력카드 화면이 동일한 이 행을 바라본다.
 */
@Entity
@Table(name = "mes_facility_history_tb")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@EntityListeners(AuditingEntityListener.class)
public class FacilityHistory {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "FACILITYHIS_SQ")
  private Long historySq;

  @Column(name = "facility_sq", nullable = false)
  private Long facilitySq;

  @Column(name = "history_no")
  private String historyNo;

  // --- 고장이 발생한 시점/내용 ---
  @Column(name = "occur_date")
  private LocalDate occurDate;

  @Column(name = "occur_content")
  private String occurContent;

  // --- 어떻게 처리했는가(유형/일시/담당/비용 등) ---
  @Column(name = "action_type")
  private String actionType;

  @Column(name = "action_date")
  private LocalDate actionDate;

  @Column(name = "action_time")
  private String actionTime;

  @Column(name = "action_content")
  private String actionContent;

  @Column(name = "action_manager")
  private String actionManager;

  @Column(name = "action_cost")
  private BigDecimal actionCost;

  // --- 부가 정보 및 감사 컬럼 ---
  @Column(name = "remark")
  private String remark;

  @Builder.Default
  @Column(name = "use_yn")
  private Boolean useYn = true;

  @Column(name = "reg_dt", updatable = false)
  private LocalDateTime regDt;

  @Column(name = "mod_dt")
  private LocalDateTime modDt;

  /**
   * 발생 정보와 조치 정보를 한꺼번에 새 값으로 바꾼다.
   * 소속 설비(facility_sq)는 수정 대상이 아니므로 유지하고, 수정 시각은 호출 시점으로 기록한다.
   */
  public void updateHistory(LocalDate occurDate, String occurContent, String actionType,
      LocalDate actionDate, String actionTime, String actionContent,
      String actionManager, BigDecimal actionCost, String remark, String historyNo) {
    this.historyNo = historyNo;
    // 발생
    this.occurDate = occurDate;
    this.occurContent = occurContent;
    // 조치
    this.actionType = actionType;
    this.actionDate = actionDate;
    this.actionTime = actionTime;
    this.actionContent = actionContent;
    this.actionManager = actionManager;
    this.actionCost = actionCost;
    this.remark = remark;
    this.modDt = LocalDateTime.now();
  }
}
