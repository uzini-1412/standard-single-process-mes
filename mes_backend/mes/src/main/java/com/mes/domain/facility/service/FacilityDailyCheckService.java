package com.mes.domain.facility.service;

import com.mes.domain.facility.dto.FacilityDailyCheckDto;
import com.mes.domain.facility.entity.Facility;
import com.mes.domain.facility.entity.FacilityCheckItem;
import com.mes.domain.facility.entity.FacilityDailyCheck;
import com.mes.domain.facility.repository.FacilityCheckItemRepository;
import com.mes.domain.facility.repository.FacilityDailyCheckRepository;
import com.mes.domain.facility.repository.FacilityRepository;
import com.mes.domain.quality.entity.InspectionResult;
import com.mes.global.support.EntityIndex;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FacilityDailyCheckService {

  private final FacilityDailyCheckRepository dailyCheckRepo;
  private final FacilityRepository facilityRepo;
  private final FacilityCheckItemRepository checkItemRepo;

  /*
   * 일상점검 현황 조회. 결과 필터(OK/NG)는 빈 문자열을 null 로 취급해 전체 조회로 둔다.
   * 응답에 설비명·점검항목명·기준치를 붙이되, 설비와 점검항목을 각각 일괄 로딩해 N+1 방지.
   */
  @Cacheable(value = "dailyCheckResults", key = "T(String).valueOf(#req.hashCode())")
  public List<FacilityDailyCheckDto.Res> getCheckResults(FacilityDailyCheckDto.SearchReq req) {
    InspectionResult resultFilter = parseResult(req.getCheckResult());

    List<FacilityDailyCheck> checks = dailyCheckRepo.findBySearchCondition(
        req.getFacilitySq(), req.getDateFrom(), req.getDateTo(), resultFilter);

    Map<Long, Facility> facilityById = loadFacilityMap(checks);
    Map<Long, FacilityCheckItem> itemById = loadItemMap(checks);

    return checks.stream()
        .map(d -> toResponse(d, facilityById, itemById))
        .collect(Collectors.toList());
  }

  /*
   * 일상점검 결과 다건 저장. (설비+점검일자+항목) 키로 기존행을 찾아 있으면 갱신,
   * 없으면 신규 등록하는 Upsert 동작.
   */
  @Transactional
  @CacheEvict(value = "dailyCheckResults", allEntries = true)
  public void saveCheckResults(List<FacilityDailyCheckDto.SaveReq> reqList) {
    for (FacilityDailyCheckDto.SaveReq req : reqList) {
      Optional<FacilityDailyCheck> existing = dailyCheckRepo
          .findByFacilitySqAndCheckDateAndCheckItemSq(
              req.getFacilitySq(), req.getCheckDate(), req.getCheckItemSq());

      if (existing.isEmpty()) {
        dailyCheckRepo.save(buildNew(req));
        continue;
      }
      existing.get().updateResult(
          req.getCheckTime(), req.getCheckVal(), parseResult(req.getCheckResult()),
          req.getActionContent(), req.getRemark());
    }
  }

  // --- 내부 처리 ---

  // 문자열 결과코드를 enum 으로. null/공백이면 필터 미적용(null) 의미.
  private InspectionResult parseResult(String raw) {
    if (raw == null || raw.isBlank()) {
      return null;
    }
    return InspectionResult.valueOf(raw);
  }

  private Map<Long, Facility> loadFacilityMap(List<FacilityDailyCheck> checks) {
    Set<Long> facilityIds = distinctIds(checks, FacilityDailyCheck::getFacilitySq);
    return EntityIndex.byId(List.copyOf(facilityIds), facilityRepo::findAllById, Facility::getFacilitySq);
  }

  private Map<Long, FacilityCheckItem> loadItemMap(List<FacilityDailyCheck> checks) {
    Set<Long> itemIds = distinctIds(checks, FacilityDailyCheck::getCheckItemSq);
    return EntityIndex.byId(List.copyOf(itemIds), checkItemRepo::findAllById, FacilityCheckItem::getCheckItemSq);
  }

  // 점검행에서 지정한 PK 추출자로 null 을 거른 중복 없는 ID 집합을 만든다.
  private Set<Long> distinctIds(
      List<FacilityDailyCheck> checks, Function<FacilityDailyCheck, Long> idExtractor) {
    return checks.stream()
        .map(idExtractor)
        .filter(Objects::nonNull)
        .collect(Collectors.toCollection(LinkedHashSet::new));
  }

  private FacilityDailyCheck buildNew(FacilityDailyCheckDto.SaveReq req) {
    return FacilityDailyCheck.builder()
        .facilitySq(req.getFacilitySq())
        .checkItemSq(req.getCheckItemSq())
        .checkDate(req.getCheckDate())
        .checkTime(req.getCheckTime())
        .checkVal(req.getCheckVal())
        .checkResult(parseResult(req.getCheckResult()))
        .actionContent(req.getActionContent())
        .checkerId(req.getWriterId())
        .remark(req.getRemark())
        .build();
  }

  private FacilityDailyCheckDto.Res toResponse(
      FacilityDailyCheck d, Map<Long, Facility> facilityById, Map<Long, FacilityCheckItem> itemById) {
    FacilityDailyCheckDto.Res res = new FacilityDailyCheckDto.Res();

    // 점검 결과 본문
    res.setResultSq(d.getResultSq());
    res.setFacilitySq(d.getFacilitySq());
    res.setCheckItemSq(d.getCheckItemSq());
    res.setCheckDate(d.getCheckDate());
    res.setCheckTime(d.getCheckTime());
    res.setCheckVal(d.getCheckVal());

    String resultCode = d.getCheckResult() == null ? null : d.getCheckResult().name();
    res.setCheckResult(resultCode);

    res.setActionContent(d.getActionContent());
    res.setRemark(d.getRemark());
    res.setCheckerId(d.getCheckerId());
    res.setRegDt(d.getRegDt());

    // 설비명 보강
    Facility f = facilityById.get(d.getFacilitySq());
    if (f != null) {
      res.setFacilityName(f.getFacilityName());
    }

    // 점검항목명/기준치 보강
    FacilityCheckItem item = itemById.get(d.getCheckItemSq());
    if (item != null) {
      res.setCheckItemNm(item.getCheckItemNm());
      res.setCheckCriteria(item.getCheckCriteria());
    }

    return res;
  }
}
