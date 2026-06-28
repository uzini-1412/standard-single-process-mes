package com.mes.domain.activitylog.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

// 사용자가 시스템에서 수행한 단일 행위(로그인/메뉴진입/CRUD 등)를 한 행으로 적재한다.
// DB 스키마(테이블/컬럼명)는 고정 계약이라 @Column(name=...) 값은 절대 바꾸지 않는다.
@Entity
@Table(name = "mes_user_activity_log_tb")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class UserActivityLog {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "activity_log_sq")
  private Long seq;

  // 행위 주체: 사번(seq)/로그인계정/표시이름
  @Column(name = "staff_sq")
  private Long workerSeq;

  @Column(length = 50, name = "user_id")
  private String account;

  @Column(length = 50, name = "staff_name")
  private String workerName;

  // 행위 종류(ActivityActionType 의 상수 문자열). null 불가.
  @Column(length = 20, nullable = false, name = "action_type")
  private String behavior;

  // 어느 메뉴에서 발생했는지
  @Column(name = "menu_sq")
  private Integer menuSeq;

  @Column(length = 50, name = "menu_code")
  private String menuKey;

  @Column(length = 100, name = "menu_name")
  private String menuLabel;

  // 대상 식별자(예: 수정된 row의 PK)
  @Column(length = 100, name = "target_id")
  private String targetRef;

  // HTTP 요청 메타
  @Column(length = 255, name = "request_uri")
  private String endpoint;

  @Column(length = 10, name = "http_method")
  private String verb;

  @Column(length = 500, name = "detail")
  private String memo;

  @Column(length = 45, name = "ip_address")
  private String clientIp;

  @Column(length = 255, name = "user_agent")
  private String agent;

  @CreatedDate
  @Column(name = "reg_dt", updatable = false)
  private LocalDateTime createdAt;
}
