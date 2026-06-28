package com.mes.domain.facility.entity;

import jakarta.persistence.*;
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
 * 설비 마스터. 설비정보관리 화면이 직접 다루며, 일상점검·정기점검·이력·예비품 등
 * 설비관리 전 영역의 기준 행 역할을 한다. 폐기는 행 삭제가 아니라 use_yn 다운으로 처리한다.
 */
@Entity
@Table(name = "mes_facility_tb")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Builder(toBuilder = true)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class Facility {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "facility_sq")
  private Long facilitySq;

  @Column(name = "manage_no", nullable = false, unique = true)
  private String manageNo;

  @Column(name = "facility_name", nullable = false)
  private String facilityName;

  private String facilityType;
  private String modelNm;
  private String spec;
  private String purpose;

  // 제조사·구입 관련
  private String makerNm;
  private String supplierNm;
  private LocalDate manufactureDate;
  private LocalDate purchaseDate;
  private BigDecimal purchasePrice;
  private String purchaseManager;
  private String purchaseTel;

  // 사내 관리 부서 및 외부 A/S 연락처
  private String manageDept;
  private String managerNm;
  private String managerTel;
  private String asCompany;
  private String asManager;
  private String asTel;

  // 설치 위치(라인/공정)
  private Long lineSq;
  private Long processSq;
  private String lineNm;
  private String processNm;
  private String installPlace;

  // 비고·첨부·폐기일
  private String remark;
  private LocalDate disposeDate;
  private String attachFileNm;

  @Column(columnDefinition = "LONGTEXT")
  private String imgPaths;

  @Column(columnDefinition = "LONGTEXT")
  private String attachFileContent;

  // 사용 여부 및 감사 컬럼
  @Builder.Default
  private Boolean useYn = true;

  @Column(updatable = false)
  private LocalDateTime regDt;

  private LocalDateTime modDt;

  /** 폐기일이 지정돼 있으면 폐기된 설비로 간주한다(파생 상태). */
  public boolean isDisposed() {
    return disposeDate != null;
  }

  /** use_yn 만 내려 소프트 삭제한다. 자식(이력·점검·예비품)의 facility_sq 참조를 보존하기 위함. */
  public void markAsUnused() {
    this.useYn = false;
    touch();
  }

  /**
   * 설비 전 항목을 한 번에 덮어쓴다. 화면에서 넘어온 값으로 통째 갱신하는 방식이며,
   * 호출 시 수정시각(mod_dt)을 현재로 찍는다.
   */
  public void updateFacility(String manageNo, String facilityName, String facilityType, String modelNm, String spec,
      String makerNm, LocalDate manufactureDate, String supplierNm, LocalDate purchaseDate,
      BigDecimal purchasePrice, String purchaseManager, String purchaseTel,
      String manageDept, String managerNm, String managerTel,
      String asCompany, String asManager, String asTel,
      Long lineSq, Long processSq, String installPlace, String remark, String imgPaths,
      String purpose, LocalDate disposeDate, String attachFileNm, String attachFileContent,
      String lineNm, String processNm) {
    // 식별/기본
    this.manageNo = manageNo;
    this.facilityName = facilityName;
    this.facilityType = facilityType;
    this.modelNm = modelNm;
    this.spec = spec;
    this.purpose = purpose;
    // 제조/구입
    this.makerNm = makerNm;
    this.manufactureDate = manufactureDate;
    this.supplierNm = supplierNm;
    this.purchaseDate = purchaseDate;
    this.purchasePrice = purchasePrice;
    // 관리/AS
    this.manageDept = manageDept;
    this.managerNm = managerNm;
    this.managerTel = managerTel;
    this.asCompany = asCompany;
    this.asManager = asManager;
    this.asTel = asTel;
    // 위치
    this.lineSq = lineSq;
    this.processSq = processSq;
    this.lineNm = lineNm;
    this.processNm = processNm;
    this.installPlace = installPlace;
    // 부가
    this.remark = remark;
    this.imgPaths = imgPaths;
    this.disposeDate = disposeDate;
    this.attachFileNm = attachFileNm;
    this.attachFileContent = attachFileContent;
    touch();
  }

  private void touch() {
    this.modDt = LocalDateTime.now();
  }
}
