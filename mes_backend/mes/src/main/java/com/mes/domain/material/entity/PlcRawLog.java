package com.mes.domain.material.entity;

import lombok.AccessLevel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 외부 PLC 가 토출 1회마다 전송하는 측정 이벤트를 가공 없이 그대로 보관하는 원시 로그.
 *
 * <p>장비 코드(P{n}F{m} 형식)를 라인/호기로 분해해 별도 컬럼에 담고,
 * 추후 추적·재처리를 위해 수신 payload 원문 전체도 함께 적재한다.
 */
@Entity
@Table(name = "mes_plc_raw_log_tb")
@Getter
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PlcRawLog {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "log_sq")
  private Long logSq;

  /* ───── 장비 식별 (원본 코드 + 분해된 라인/호기) ───── */

  @Column(name = "device_code", length = 20)
  private String deviceCode;

  @Column(name = "line_code", length = 10)
  private String lineCode;

  @Column(name = "feeder_no", length = 10)
  private String feederNo;

  /* ───── 측정값 본문 ───── */

  @Column(name = "value")
  private Double value;

  @Column(name = "unit", length = 10)
  private String unit;

  @Column(name = "collected_dt")
  private LocalDateTime collectedDt;

  /* ───── 수신 원문 / 적재 시각 ───── */

  @Column(name = "raw_payload", columnDefinition = "TEXT")
  private String rawPayload;

  @Column(name = "reg_dt", updatable = false)
  private LocalDateTime regDt;

  /**
   * 별도 JPA Auditing 없이 적재 시각을 직접 채워 넣는다.
   * 이미 값이 들어 있으면 덮어쓰지 않는다.
   */
  @PrePersist
  void stampInsertedAt() {
    if (regDt == null) {
      regDt = LocalDateTime.now();
    }
  }

  /** 라인·호기·측정값이 모두 채워진, 집계에 쓸 수 있는 행인지 판별한다. */
  public boolean hasMeasurement() {
    return lineCode != null && feederNo != null && value != null;
  }
}
