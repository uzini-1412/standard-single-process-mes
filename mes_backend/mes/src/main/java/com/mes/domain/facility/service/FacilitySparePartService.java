package com.mes.domain.facility.service;

import com.mes.domain.facility.dto.FacilitySparePartDto;
import com.mes.domain.facility.entity.FacilitySparePart;
import com.mes.domain.facility.repository.FacilitySparePartRepository;
import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FacilitySparePartService {

  private final FacilitySparePartRepository sparePartRepo;

  // 예비품 목록 조회. 검색조건 단위로 Redis 캐싱.
  @Cacheable(value = "facilitySpareParts", key = "T(String).valueOf(#req.hashCode())")
  public List<FacilitySparePartDto.Res> getSparePartList(FacilitySparePartDto.SearchReq req) {
    return sparePartRepo
        .findBySearchCondition(req.getKeyword(), req.getDateFrom(), req.getDateTo())
        .stream()
        .map(this::toResponse)
        .collect(Collectors.toList());
  }

  // 예비품 다건 등록/수정. PK 유무로 신규/갱신을 가른다. 처리 후 캐시는 비운다.
  @Transactional
  @CacheEvict(value = "facilitySpareParts", allEntries = true)
  public void saveSpareParts(List<FacilitySparePartDto.SaveReq> reqList) {
    for (FacilitySparePartDto.SaveReq req : reqList) {
      if (req.getSparePartSq() == null) {
        sparePartRepo.save(buildNew(req));
        continue;
      }
      FacilitySparePart part = sparePartRepo.findById(req.getSparePartSq())
          .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND));
      part.updateSparePart(
          req.getPartNo(), req.getPartNm(), req.getSpec(), req.getSupplierNm(),
          req.getPurchaseDate(), req.getPurchasePrice(), req.getSafetyStock(),
          req.getCurrentStock(), req.getStorageLoc(), req.getUseFacility(),
          req.getImgPaths(), req.getRemark());
    }
  }

  // 예비품 다건 삭제 (하드 삭제)
  @Transactional
  @CacheEvict(value = "facilitySpareParts", allEntries = true)
  public void deleteSpareParts(FacilitySparePartDto.DeleteReq req) {
    List<Long> ids = req.getSparePartIds();
    if (ids == null || ids.isEmpty()) {
      return;
    }
    sparePartRepo.deleteAllById(ids);
  }

  // --- 내부 처리 ---

  private FacilitySparePart buildNew(FacilitySparePartDto.SaveReq req) {
    return FacilitySparePart.builder()
        .partNo(req.getPartNo())
        .partNm(req.getPartNm())
        .spec(req.getSpec())
        .useFacility(req.getUseFacility())
        .supplierNm(req.getSupplierNm())
        .purchaseDate(req.getPurchaseDate())
        .purchasePrice(req.getPurchasePrice())
        .safetyStock(req.getSafetyStock())
        .currentStock(req.getCurrentStock())
        .storageLoc(req.getStorageLoc())
        .imgPaths(req.getImgPaths())
        .remark(req.getRemark())
        .useYn(true)
        .build();
  }

  private FacilitySparePartDto.Res toResponse(FacilitySparePart p) {
    FacilitySparePartDto.Res res = new FacilitySparePartDto.Res();

    // 부품 식별/사양
    res.setSparePartSq(p.getSparePartSq());
    res.setPartNo(p.getPartNo());
    res.setPartNm(p.getPartNm());
    res.setSpec(p.getSpec());
    res.setUseFacility(p.getUseFacility());

    // 구매/재고
    res.setSupplierNm(p.getSupplierNm());
    res.setPurchaseDate(p.getPurchaseDate());
    res.setPurchasePrice(p.getPurchasePrice());
    res.setSafetyStock(p.getSafetyStock());
    res.setCurrentStock(p.getCurrentStock());
    res.setStorageLoc(p.getStorageLoc());

    res.setImgPaths(p.getImgPaths());
    res.setRemark(p.getRemark());
    res.setRegDt(p.getRegDt());
    return res;
  }
}
