package com.mes.domain.staff.service;

import com.mes.domain.staff.dto.StaffDto;
import com.mes.domain.staff.entity.Staff;
import com.mes.domain.staff.repository.StaffRepository;
import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StaffService {

  private final StaffRepository staffRepository;

  // 다음 사번 생성 (SW-001 형식): 기존 사번의 일련번호 최댓값 + 1
  public String getNextStaffNo() {
    int next = staffRepository.findAllSwStaffNos().stream()
        .mapToInt(StaffService::sequenceOf)
        .filter(seq -> seq > 0)
        .max()
        .orElse(0) + 1;
    return String.format("SW-%03d", next);
  }

  // "SW-001" → 1. 접두( "SW-" ) 뒤 숫자만 취하고, 형식이 어긋나면 0.
  private static int sequenceOf(String staffNo) {
    if (staffNo == null || staffNo.length() < 4) return 0;
    try {
      return Integer.parseInt(staffNo.substring(3));
    } catch (NumberFormatException ignored) {
      return 0;
    }
  }

  // 목록 조회
  public List<StaffDto.Res> getList(StaffDto.SearchReq req) {
    // includeRetired 기본값: false (퇴사자 제외). 직원정보관리 화면에서만 true 로 호출
    Boolean includeRetired = Boolean.TRUE.equals(req.getIncludeRetired());
    return staffRepository.findBySearchCondition(
        req.getKeyword(),
        req.getDeptCode(),
        req.getRankCode(),
        req.getJobType(),
        req.getUseGb(),
        includeRetired).stream().map(StaffDto.Res::from).collect(Collectors.toList());
  }

  // 일괄 등록: 행마다 사번 중복을 막고 신규 직원으로 영속화.
  @Transactional
  public void saveStaffList(List<StaffDto.SaveReq> requestDtos) {
    for (StaffDto.SaveReq req : requestDtos) {
      assertStaffNoFree(req.getStaffNo());
      staffRepository.save(toNewStaff(req));
    }
  }

  // 사번이 비어있지 않은데 이미 존재하면 중복 예외.
  private void assertStaffNoFree(String staffNo) {
    if (StringUtils.hasText(staffNo) && staffRepository.existsByStaffNo(staffNo)) {
      throw new CustomException(ErrorCode.COMMON_INFO_DUPLICATE, "이미 존재하는 사원번호입니다: " + staffNo);
    }
  }

  // 등록 요청 → 신규 엔티티. 미지정 플래그는 재직만 true, 나머지는 false 로 기본화.
  private Staff toNewStaff(StaffDto.SaveReq req) {
    return Staff.builder()
        .staffNo(req.getStaffNo())
        .staffName(req.getStaffName())
        .jobType(req.getJobType())
        .dept(req.getDept())
        .position(req.getPosition())
        .nationality(req.getNationality())
        .gender(req.getGender())
        .mobileNo(req.getMobileNo())
        .address(req.getAddress())
        .addressDetail(req.getAddressDetail())
        .joinDate(req.getJoinDate())
        .leaveDate(req.getLeaveDate())
        .etc(req.getEtc())
        .useGb(orElse(req.getUseGb(), true))
        .signGb(orElse(req.getSignGb(), false))
        .evalGb(orElse(req.getEvalGb(), false))
        .certGb(orElse(req.getCertGb(), false))
        .build();
  }

  // 일괄 수정: PK로 찾아 인사 정보를 덮어쓴다. 미지정 플래그는 기존 값을 유지.
  @Transactional
  public void updateStaffList(List<StaffDto.UpdateReq> requestDtos) {
    for (StaffDto.UpdateReq req : requestDtos) {
      Staff staff = staffRepository.findById(req.getStaffSq())
          .orElseThrow(() -> new CustomException(
              ErrorCode.COMMON_ENTITY_NOT_FOUND, "존재하지 않는 직원입니다. ID=" + req.getStaffSq()));

      staff.updateInfo(
          req.getStaffName(), req.getJobType(), req.getDept(), req.getPosition(),
          req.getNationality(), req.getJoinDate(), req.getLeaveDate(), req.getMobileNo(),
          req.getAddress(), req.getAddressDetail(), req.getGender(), req.getEtc(),
          orElse(req.getUseGb(), staff.getUseGb()),
          orElse(req.getSignGb(), orElse(staff.getSignGb(), false)),
          orElse(req.getEvalGb(), orElse(staff.getEvalGb(), false)),
          orElse(req.getCertGb(), orElse(staff.getCertGb(), false)));
    }
  }

  // 일괄 삭제(물리 삭제). 연관 테이블은 CASCADE 전제.
  @Transactional
  public void deleteStaffList(StaffDto.DeleteReq req) {
    if (req.getStaffIds() == null || req.getStaffIds().isEmpty()) return;
    staffRepository.deleteAllById(req.getStaffIds());
  }

  // null 이면 기본값, 아니면 그대로(Boolean coalesce).
  private static Boolean orElse(Boolean value, Boolean fallback) {
    return value != null ? value : fallback;
  }
}