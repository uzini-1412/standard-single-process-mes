package com.mes.domain.facility.entity;

import com.mes.domain.quality.entity.InspectionResult;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * 일상점검 한 건의 측정 기록.
 * <p>설비·점검일·점검항목 세 컬럼이 사실상 유니크 키를 이루므로, 동일 조합으로 다시 들어오면
 * 행을 추가하지 않고 기존 행의 측정값과 판정만 덮어쓰는 Upsert 방식으로 다룬다.
 */
@Entity
@Table(name = "mes_facility_daily_check_tb")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FacilityDailyCheck {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "result_sq")
  private Long resultSq;

  // 유니크 키 후보: 어느 설비를(facilitySq) 어느 항목으로(checkItemSq) 어느 날(checkDate) 봤는가
  @Column(name = "facility_sq", nullable = false)
  private Long facilitySq;

  @Column(name = "check_item_sq", nullable = false)
  private Long checkItemSq;

  @Column(name = "check_date", nullable = false)
  private LocalDate checkDate;

  // 실제 측정 시각·측정값과 그에 따른 판정 및 후속 메모
  @Column(name = "check_time")
  private LocalTime checkTime;

  @Column(name = "check_val")
  private Double checkVal;

  @Enumerated(EnumType.STRING)
  @Column(name = "check_result", nullable = false, length = 10)
  private InspectionResult checkResult;

  @Column(name = "action_content")
  private String actionContent;

  @Column(name = "remark")
  private String remark;

  @Column(name = "checker_id")
  private String checkerId;

  @CreatedDate
  @Column(name = "reg_dt", updatable = false)
  private LocalDateTime regDt;

  @LastModifiedDate
  @Column(name = "mod_dt")
  private LocalDateTime modDt;

  /**
   * 이미 존재하는 행을 같은 키로 다시 받았을 때 쓰는 갱신 메서드.
   * 키 3종(설비/점검일/항목)은 유지하고 측정·판정·메모 영역만 새 값으로 교체한다.
   */
  public void updateResult(LocalTime checkTime, Double checkVal, InspectionResult checkResult,
      String actionContent, String remark) {
    this.checkResult = checkResult;
    this.checkTime = checkTime;
    this.checkVal = checkVal;
    this.remark = remark;
    this.actionContent = actionContent;
  }

  /** 판정이 불합격(NG)으로 떨어진 행인지. 화면에서 경고색 표시 등에 사용. */
  public boolean isFail() {
    return InspectionResult.NG == checkResult;
  }
}
