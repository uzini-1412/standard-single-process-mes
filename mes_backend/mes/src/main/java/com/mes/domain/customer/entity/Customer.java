package com.mes.domain.customer.entity;

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

/**
 * 거래처 마스터. 수주/발주/출하/단가 등 여러 도메인에서 customerSq(PK)로 참조한다.
 * 식별 3종(customerSq/customerCode/customerName)의 getter는 외부 도메인이 사용하므로 고정.
 */
@Entity
@Table(name = "mes_customer_tb")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Customer {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "customer_sq")
  private Long customerSq;

  /** 거래처 코드 (유일키) */
  @Column(name = "customer_cd", nullable = false, unique = true, length = 50)
  private String customerCode;

  /** 거래처명 */
  @Column(name = "customer_nm", nullable = false, length = 50)
  private String customerName;

  /** 대표자명 — getter는 거래명세서 등 외부 화면이 참조 */
  @Column(name = "owner_nm")
  private String ownerName;

  /** 사업자등록번호 — getter는 거래명세서 등 외부 화면이 참조 */
  @Column(name = "biz_no")
  private String businessNo;

  /** 거래처 구분 (공통코드) */
  @Column(name = "customer_type")
  private String partnerKind;

  /** 등록일자 — 화면에서 직접 입력 */
  @Column(name = "reg_date")
  private LocalDate inputDate;

  /** 담당자명 */
  @Column(name = "manager_nm")
  private String chargerName;

  /** 전화번호 */
  @Column(name = "tel")
  private String phoneNo;

  /** 이메일 */
  @Column(name = "email")
  private String mailAddr;

  /** 팩스번호 */
  @Column(name = "fax")
  private String faxNo;

  /** 주소 — getter는 거래명세서 등 외부 화면이 참조 */
  @Column(name = "address")
  private String address;

  /** 비고 */
  @Column(name = "remark")
  private String note;

  /** 첨부파일 경로 (JSON 직렬화 문자열) */
  @Column(name = "file_paths", columnDefinition = "LONGTEXT")
  private String attachJson;

  /** 사용 여부 (false = 비활성) */
  @Column(name = "use_yn")
  private Boolean activeYn;

  @CreatedDate
  @Column(name = "reg_dt", updatable = false)
  private LocalDateTime regDt;

  @LastModifiedDate
  @Column(name = "mod_dt")
  private LocalDateTime modDt;

  /**
   * 수정 가능한 모든 속성을 한 번에 덮어쓴다 (코드/PK 제외).
   */
  public void updateInfo(String customerName, String ownerName, String businessNo,
      String partnerKind,
      LocalDate inputDate, String chargerName, String phoneNo, String mailAddr,
      String faxNo, String address, String note, String attachJson, Boolean activeYn) {
    this.customerName = customerName;
    this.ownerName = ownerName;
    this.businessNo = businessNo;
    this.partnerKind = partnerKind;
    this.inputDate = inputDate;
    this.chargerName = chargerName;
    this.phoneNo = phoneNo;
    this.mailAddr = mailAddr;
    this.faxNo = faxNo;
    this.address = address;
    this.note = note;
    this.attachJson = attachJson;
    this.activeYn = activeYn;
  }

  /** 물리 삭제 대신 use_yn=false 로 내려 FK 참조를 보존한다. */
  public void softDelete() {
    this.activeYn = false;
  }
}
