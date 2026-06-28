package com.mes.domain.staff.dto;

import com.mes.domain.staff.entity.Staff;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/** 직원정보관리(/api/staff) 요청·응답 묶음. 필드명은 프론트 JSON 계약이라 고정. */
public class StaffDto {

  /** 목록 검색 조건 — 빈 값은 전체로 간주. */
  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "직원 목록 검색 조건")
  public static class SearchReq {
    @Schema(description = "검색어 (이름, 사번)", example = "홍길동")
    private String keyword;

    @Schema(description = "직종 코드 (공통코드)")
    private String jobType;

    @Schema(description = "부서 코드 (공통코드)", example = "DEPT01")
    private String deptCode;

    @Schema(description = "직급 코드 (공통코드)", example = "POS01")
    private String rankCode;

    @Schema(description = "재직 유무 (true:재직, false:퇴사, null:전체)")
    private Boolean useGb;

    @Schema(description = "퇴사자 포함 여부 (true:전체, false/null:퇴사자 제외)", example = "false")
    private Boolean includeRetired;
  }

  /** 등록 요청(일괄). 수정 요청은 staffSq 만 더해 이걸 상속한다. */
  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "직원 등록 요청 (일괄용)")
  public static class SaveReq {
    @Schema(description = "사원번호", example = "2024001")
    private String staffNo;

    @NotBlank(message = "직원명은 필수 입력값입니다.")
    @Schema(description = "성명", example = "홍길동")
    private String staffName;

    @Schema(description = "직종 (공통코드)", example = "JOB01")
    private String jobType;

    @Schema(description = "부서 (공통코드)", example = "DEPT01")
    private String dept;

    @Schema(description = "직급 (공통코드)", example = "POS01")
    private String position;

    @Schema(description = "국적 (공통코드)", example = "KR")
    private String nationality;

    @Schema(description = "성별 (공통코드)", example = "M")
    private String gender;

    @Pattern(regexp = "^$|^[0-9-]+$", message = "연락처는 숫자와 하이픈만 입력할 수 있습니다.")
    @Schema(description = "연락처")
    private String mobileNo;

    @Schema(description = "주소")
    private String address;

    @Schema(description = "상세주소")
    private String addressDetail;

    @Schema(description = "입사일자", example = "2024-01-01")
    private LocalDate joinDate;

    @Schema(description = "퇴사일자", example = "2025-12-31")
    private LocalDate leaveDate;

    @Schema(description = "비고")
    private String etc;

    // O/X 여부 플래그
    private Boolean useGb; // 재직
    private Boolean signGb; // 사인
    private Boolean evalGb; // 평가
    private Boolean certGb; // 자격인증
  }

  /** 수정 요청 = 등록 요청 + PK. */
  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "직원 수정 요청 (일괄용)")
  public static class UpdateReq extends SaveReq {
    @Schema(description = "직원 PK (필수)", example = "1")
    private Long staffSq;
  }

  /** 삭제 요청. */
  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "직원 삭제 요청")
  public static class DeleteReq {
    @Schema(description = "삭제할 직원 PK 리스트")
    private java.util.List<Long> staffIds;
  }

  /** 조회 응답. 엔티티를 {@link #from} 으로 평탄화하고 근속연수를 파생 계산한다. */
  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "직원 정보 응답")
  public static class Res {
    private Long staffSq;
    private String staffNo;
    private String staffName;
    private String jobType;
    private String dept;
    private String position;
    private String nationality;
    private String gender;
    private String mobileNo;
    private String address;
    private String addressDetail;
    private LocalDate joinDate;
    private LocalDate leaveDate;
    private Boolean useGb;
    private Boolean signGb;
    private Boolean evalGb;
    private Boolean certGb;
    private String userId;

    @Schema(description = "근속연수 (계산된 값)", example = "2년")
    private String yearsOfService;

    public static Res from(Staff entity) {
      Res res = new Res();
      res.staffSq = entity.getStaffSq();
      res.staffNo = entity.getStaffNo();
      res.staffName = entity.getStaffName();
      res.jobType = entity.getJobType();
      res.dept = entity.getDept();
      res.position = entity.getPosition(); // rank_no
      res.nationality = entity.getNationality();
      res.gender = entity.getGender();
      res.mobileNo = entity.getMobileNo();
      res.address = entity.getAddress();
      res.addressDetail = entity.getAddressDetail();
      res.joinDate = entity.getJoinDate();
      res.leaveDate = entity.getLeaveDate();
      res.useGb = entity.getUseGb();
      res.signGb = entity.getSignGb();
      res.evalGb = entity.getEvalGb();
      res.certGb = entity.getCertGb();
      res.userId = entity.getUserId();
      res.yearsOfService = yearsOfServiceOf(entity.getJoinDate());
      return res;
    }

    /** 입사일~오늘 만 연수(없으면 "0년"). */
    private static String yearsOfServiceOf(LocalDate joinDate) {
      long years = (joinDate == null) ? 0 : ChronoUnit.YEARS.between(joinDate, LocalDate.now());
      return years + "년";
    }
  }
}
