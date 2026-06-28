package com.mes.domain.facility.service;

import com.mes.domain.facility.dto.FacilityRegularCheckDto;
import com.mes.domain.facility.entity.Facility;
import com.mes.domain.facility.entity.FacilityRegularCheck;
import com.mes.domain.facility.repository.FacilityRegularCheckRepository;
import com.mes.domain.facility.repository.FacilityRepository;
import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;
import com.mes.global.support.EntityIndex;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FacilityRegularCheckService {

  private final FacilityRegularCheckRepository regularCheckRepo;
  private final FacilityRepository facilityRepo;

  /*
   * 정기점검 목록 조회. 점검행에 매달린 설비명/관리번호/사진을 함께 내려주되,
   * 설비를 행마다 조회하면 N+1 이 되므로 참조된 설비 PK 를 모아 한 번에 가져온다.
   */
  @Cacheable(value = "facilityRegularChecks", key = "T(String).valueOf(#req.hashCode())")
  public List<FacilityRegularCheckDto.Res> getRegularChecks(FacilityRegularCheckDto.SearchReq req) {
    List<FacilityRegularCheck> checks = regularCheckRepo.findBySearchCondition(req.getFacilitySq());
    if (checks.isEmpty()) {
      return List.of();
    }

    Map<Long, Facility> facilityById = loadFacilityMap(checks);

    return checks.stream()
        .map(check -> toResponse(check, facilityById))
        .collect(Collectors.toList());
  }

  /*
   * 정기점검 다건 등록/수정. 신규/갱신 모두 계획일자·실시일자가 설비 등록일자
   * 이전이 되지 못하도록 서버단에서 검증한다(FE 우회 차단).
   */
  @Transactional
  @CacheEvict(value = "facilityRegularChecks", allEntries = true)
  public void saveRegularChecks(List<FacilityRegularCheckDto.SaveReq> reqList) {
    for (FacilityRegularCheckDto.SaveReq req : reqList) {
      if (req.getRegularCheckSq() == null) {
        guardCheckDates(req.getFacilitySq(), req.getPlanDate(), req.getExecDate());
        regularCheckRepo.save(buildNew(req));
        continue;
      }

      FacilityRegularCheck check = regularCheckRepo.findById(req.getRegularCheckSq())
          .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND));

      // 수정 본문에 facilitySq 가 누락될 수 있으므로 기존 엔티티 값으로 대체한다.
      Long facilitySq = req.getFacilitySq() != null ? req.getFacilitySq() : check.getFacilitySq();
      guardCheckDates(facilitySq, req.getPlanDate(), req.getExecDate());

      check.updateCheck(
          req.getCheckType(), req.getCheckerNm(), req.getPlanDate(), req.getPlanContent(),
          req.getExecDate(), req.getExecContent(), req.getExecResult(),
          req.getCurrentStatus(), req.getRemark());
    }
  }

  // 정기점검 다건 삭제
  @Transactional
  @CacheEvict(value = "facilityRegularChecks", allEntries = true)
  public void deleteRegularChecks(FacilityRegularCheckDto.DeleteReq req) {
    List<Long> ids = req.getRegularCheckIds();
    if (ids == null || ids.isEmpty()) {
      return;
    }
    regularCheckRepo.deleteAllById(ids);
  }

  // --- 내부 처리 ---

  // 업무 규칙: 계획일자/실시일자 모두 해당 설비의 등록일자보다 이른 날짜일 수 없다.
  private void guardCheckDates(Long facilitySq, LocalDate planDate, LocalDate execDate) {
    if (facilitySq == null) {
      return;
    }
    Facility facility = facilityRepo.findById(facilitySq).orElse(null);
    if (facility == null || facility.getRegDt() == null) {
      return;
    }
    LocalDate registeredOn = facility.getRegDt().toLocalDate();
    rejectIfBefore(planDate, registeredOn, "계획일자");
    rejectIfBefore(execDate, registeredOn, "실시일자");
  }

  private void rejectIfBefore(LocalDate target, LocalDate registeredOn, String label) {
    if (target != null && target.isBefore(registeredOn)) {
      throw new CustomException(ErrorCode.COMMON_INVALID_PARAMETER,
          label + "는 설비 등록일자(" + registeredOn + ") 이후여야 합니다.");
    }
  }

  private Map<Long, Facility> loadFacilityMap(List<FacilityRegularCheck> checks) {
    Set<Long> facilityIds = checks.stream()
        .map(FacilityRegularCheck::getFacilitySq)
        .filter(Objects::nonNull)
        .collect(Collectors.toCollection(LinkedHashSet::new));
    return EntityIndex.byId(List.copyOf(facilityIds), facilityRepo::findAllById, Facility::getFacilitySq);
  }

  private FacilityRegularCheck buildNew(FacilityRegularCheckDto.SaveReq req) {
    return FacilityRegularCheck.builder()
        .facilitySq(req.getFacilitySq())
        .checkType(req.getCheckType())
        .checkerNm(req.getCheckerNm())
        .currentStatus(req.getCurrentStatus())
        .planDate(req.getPlanDate())
        .planContent(req.getPlanContent())
        .execDate(req.getExecDate())
        .execContent(req.getExecContent())
        .execResult(req.getExecResult())
        .remark(req.getRemark())
        .useYn(true)
        .build();
  }

  private FacilityRegularCheckDto.Res toResponse(FacilityRegularCheck r, Map<Long, Facility> facilityById) {
    FacilityRegularCheckDto.Res res = new FacilityRegularCheckDto.Res();

    res.setRegularCheckSq(r.getRegularCheckSq());
    res.setFacilitySq(r.getFacilitySq());

    Facility f = facilityById.get(r.getFacilitySq());
    if (f != null) {
      res.setManageNo(f.getManageNo());
      res.setFacilityName(f.getFacilityName());
      res.setImgPaths(f.getImgPaths());
    }

    res.setCheckType(r.getCheckType());
    res.setCheckerNm(r.getCheckerNm());
    res.setCurrentStatus(r.getCurrentStatus());

    res.setPlanDate(r.getPlanDate());
    res.setPlanContent(r.getPlanContent());
    res.setExecDate(r.getExecDate());
    res.setExecContent(r.getExecContent());
    res.setExecResult(r.getExecResult());

    res.setRemark(r.getRemark());
    res.setRegDt(r.getRegDt());
    return res;
  }
}
