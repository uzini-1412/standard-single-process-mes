package com.mes.domain.staff.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;

/**
 * 직원 마스터(mes_staffinfo_tb). 인사 정보와 로그인 계정이 한 행에 합쳐져 있어
 * 직원정보관리(/api/staff)와 사용자정보관리(/api/user) 양쪽이 같은 엔티티를 공유한다.
 * 계정(userId/userPw/role)은 처음엔 비어 있다가 권한 화면에서 채워질 수 있어 모두 nullable.
 */
@Entity
@Table(name = "mes_staffinfo_tb")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Staff {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "staff_sq")
  private Long staffSq;

  // ===== 로그인 계정 (사용자정보관리에서 설정) =====
  @Column(name = "user_id", length = 30)
  private String userId;

  @Column(name = "user_pw", length = 255)
  private String userPw;

  /** ROLE_USER / ROLE_ADMIN — 토큰 권한 등급(String 으로 저장). */
  @Column(name = "role", length = 20)
  private String role;

  // ===== 신원 =====
  @Column(name = "staff_no", length = 45)
  private String staffNo; // 사원번호

  @Column(name = "staff_nm", nullable = false, length = 20)
  private String staffName; // 성명

  // ===== 소속/분류 (공통코드 문자열 참조) =====
  @Column(name = "jobtype_no", length = 20)
  private String jobType; // 직종

  @Column(name = "dept_no", length = 20)
  private String dept; // 부서

  @Column(name = "rank_no", length = 20)
  private String position; // 직급

  @Column(name = "nation_no", length = 20)
  private String nationality; // 국적

  @Column(name = "gender", length = 10)
  private String gender; // 성별

  // ===== 연락/주소 =====
  @Column(name = "mobile_no", length = 20)
  private String mobileNo; // 연락처

  @Column(name = "address", length = 200)
  private String address; // 주소

  @Column(name = "address_detail", length = 200)
  private String addressDetail; // 상세주소

  // ===== 재직 이력 =====
  @Column(name = "companyjoin_dt")
  private LocalDate joinDate; // 입사일자

  @Column(name = "leave_dt")
  private LocalDate leaveDate; // 퇴사일자

  @Column(name = "etc", length = 200)
  private String etc; // 비고

  // ===== 상태/여부 플래그 =====
  @Column(name = "use_gb")
  private Boolean useGb; // 사용(재직) 여부 — false 면 로그인 차단

  @Column(name = "qc_gb", nullable = false)
  @Builder.Default
  private Boolean signGb = false; // 사인 보유

  @Column(name = "eval_gb")
  private Boolean evalGb; // 평가 대상

  @Column(name = "cert_gb")
  private Boolean certGb; // 자격인증 보유

  // ----- 변경 메서드 -----

  /** 인사 정보 일괄 수정(계정 필드는 건드리지 않음). */
  public void updateInfo(String staffName, String jobType, String dept, String position,
      String nationality, LocalDate joinDate, LocalDate leaveDate, String mobileNo,
      String address, String addressDetail, String gender, String etc, Boolean useGb,
      Boolean signGb, Boolean evalGb, Boolean certGb) {
    // 신원/소속
    this.staffName = staffName;
    this.jobType = jobType;
    this.dept = dept;
    this.position = position;
    this.nationality = nationality;
    this.gender = gender;
    // 연락/주소
    this.mobileNo = mobileNo;
    this.address = address;
    this.addressDetail = addressDetail;
    // 재직 이력
    this.joinDate = joinDate;
    this.leaveDate = leaveDate;
    this.etc = etc;
    // 상태 플래그
    this.useGb = useGb;
    this.signGb = signGb;
    this.evalGb = evalGb;
    this.certGb = certGb;
  }

  /** 로그인 계정(아이디/암호/권한) 설정 또는 초기화. */
  public void updateAccount(String userId, String userPw, String role) {
    this.userId = userId;
    this.userPw = userPw;
    this.role = role;
  }

  /** 재직(사용) 여부만 토글 — 사용자정보관리의 로그인 잠금 스위치용. */
  public void updateUseGb(Boolean useGb) {
    this.useGb = useGb;
  }
}
