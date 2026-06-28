package com.mes.domain.facility.service;

import com.mes.domain.facility.dto.FacilityCheckItemDto;
import com.mes.domain.facility.entity.Facility;
import com.mes.domain.facility.entity.FacilityCheckItem;
import com.mes.domain.facility.repository.FacilityCheckItemRepository;
import com.mes.domain.facility.repository.FacilityRepository;
import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;
import com.mes.global.support.EntityIndex;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
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
public class FacilityCheckItemService {

  private final FacilityCheckItemRepository checkItemRepo;
  private final FacilityRepository facilityRepo;

  /*
   * 점검항목 목록 조회. 항목행에 설비명/관리번호를 덧붙여 내려준다. 설비 조회는
   * 참조된 설비 PK 를 모아 일괄 처리해 N+1 을 피한다.
   */
  @Cacheable(value = "facilityCheckItems", key = "T(String).valueOf(#req.hashCode())")
  public List<FacilityCheckItemDto.Res> getCheckItems(FacilityCheckItemDto.SearchReq req) {
    List<FacilityCheckItem> items = checkItemRepo.findBySearchCondition(req.getFacilitySq(), req.getKeyword());
    if (items.isEmpty()) {
      return List.of();
    }

    Map<Long, Facility> facilityById = loadFacilityMap(items);

    return items.stream()
        .map(item -> toResponse(item, facilityById))
        .collect(Collectors.toList());
  }

  /*
   * 점검항목 다건 등록/수정. 저장 전 항목마다 기준치 범위를 검증한다.
   */
  @Transactional
  @CacheEvict(value = "facilityCheckItems", allEntries = true)
  public void saveCheckItems(List<FacilityCheckItemDto.SaveReq> reqList) {
    for (FacilityCheckItemDto.SaveReq req : reqList) {
      assertRangeValid(req);
      if (req.getCheckItemSq() == null) {
        checkItemRepo.save(buildNew(req));
        continue;
      }
      FacilityCheckItem item = checkItemRepo.findById(req.getCheckItemSq())
          .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND));
      item.updateItem(
          req.getCheckItemNm(), req.getCheckCriteria(), req.getCheckMethod(),
          req.getCheckCycle(), req.getMinVal(), req.getMaxVal(),
          req.getRemark(), req.getUnit(), req.getCheckItemImg(),
          req.getSortOrder());
    }
  }

  // 점검항목 다건 삭제
  @Transactional
  @CacheEvict(value = "facilityCheckItems", allEntries = true)
  public void deleteCheckItems(FacilityCheckItemDto.DeleteReq req) {
    List<Long> ids = req.getCheckItemIds();
    if (ids == null || ids.isEmpty()) {
      return;
    }
    checkItemRepo.deleteAllById(ids);
  }

  // --- 내부 처리 ---

  /*
   * 입력이 숫자로 해석될 때에 한해 min ≤ criteria ≤ max 를 강제한다.
   * 비숫자(서술형 기준)는 검증 대상이 아니므로 통과.
   */
  private void assertRangeValid(FacilityCheckItemDto.SaveReq req) {
    Double min = toNumberOrNull(req.getMinVal());
    Double max = toNumberOrNull(req.getMaxVal());
    Double criteria = toNumberOrNull(req.getCheckCriteria());

    boolean minOverMax = (min != null && max != null && min > max);
    boolean criteriaBelowMin = (criteria != null && min != null && criteria < min);
    boolean criteriaAboveMax = (criteria != null && max != null && criteria > max);

    if (minOverMax || criteriaBelowMin || criteriaAboveMax) {
      throw new CustomException(ErrorCode.FACILITY_CHECK_ITEM_RANGE_INVALID);
    }
  }

  private Double toNumberOrNull(String v) {
    if (v == null || v.isBlank()) {
      return null;
    }
    try {
      return Double.parseDouble(v.trim());
    } catch (NumberFormatException e) {
      return null;
    }
  }

  private Map<Long, Facility> loadFacilityMap(List<FacilityCheckItem> items) {
    Set<Long> facilityIds = items.stream()
        .map(FacilityCheckItem::getFacilitySq)
        .filter(Objects::nonNull)
        .collect(Collectors.toCollection(LinkedHashSet::new));
    return EntityIndex.byId(List.copyOf(facilityIds), facilityRepo::findAllById, Facility::getFacilitySq);
  }

  private FacilityCheckItem buildNew(FacilityCheckItemDto.SaveReq req) {
    return FacilityCheckItem.builder()
        .facilitySq(req.getFacilitySq())
        .checkItemNm(req.getCheckItemNm())
        .checkMethod(req.getCheckMethod())
        .checkCriteria(req.getCheckCriteria())
        .checkCycle(req.getCheckCycle())
        .unit(req.getUnit())
        .minVal(req.getMinVal())
        .maxVal(req.getMaxVal())
        .checkItemImg(req.getCheckItemImg())
        .sortOrder(req.getSortOrder())
        .remark(req.getRemark())
        .useYn(true)
        .regDt(LocalDateTime.now())
        .build();
  }

  private FacilityCheckItemDto.Res toResponse(FacilityCheckItem c, Map<Long, Facility> facilityById) {
    FacilityCheckItemDto.Res res = new FacilityCheckItemDto.Res();

    res.setCheckItemSq(c.getCheckItemSq());
    res.setFacilitySq(c.getFacilitySq());

    Facility f = facilityById.get(c.getFacilitySq());
    if (f != null) {
      res.setManageNo(f.getManageNo());
      res.setFacilityName(f.getFacilityName());
    }

    res.setCheckItemNm(c.getCheckItemNm());
    res.setCheckMethod(c.getCheckMethod());
    res.setCheckCriteria(c.getCheckCriteria());
    res.setCheckCycle(c.getCheckCycle());
    res.setUnit(c.getUnit());
    res.setMinVal(c.getMinVal());
    res.setMaxVal(c.getMaxVal());
    res.setCheckItemImg(c.getCheckItemImg());
    res.setSortOrder(c.getSortOrder());
    res.setRemark(c.getRemark());
    return res;
  }
}
