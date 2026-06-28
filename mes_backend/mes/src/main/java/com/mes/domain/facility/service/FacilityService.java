package com.mes.domain.facility.service;

import com.mes.domain.facility.dto.FacilityDto;
import com.mes.domain.facility.entity.Facility;
import com.mes.domain.facility.repository.FacilityRepository;
import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FacilityService {

  private final FacilityRepository facilityRepo;

  /*
   * 설비 마스터 목록을 조건검색으로 가져온다. 동일 검색조건이면 Redis 에 적재된 결과를
   * 재사용하도록 캐시 키를 요청 객체 hashCode 기반으로 잡는다. (설비관리 전 화면 공용 데이터)
   */
  @Cacheable(value = "facilityList", key = "T(String).valueOf(#req.hashCode())")
  public List<FacilityDto.Res> getFacilityList(FacilityDto.SearchReq req) {
    return facilityRepo
        .findBySearchCondition(req.getFacilityType(), req.getLineSq(), req.getKeyword())
        .stream()
        .map(this::toResponse)
        .collect(Collectors.toList());
  }

  // 단일 설비를 PK 로 조회. 없으면 공통 NotFound 예외.
  public FacilityDto.Res getFacilityDetail(Long facilitySq) {
    Facility entity = facilityRepo.findById(facilitySq)
        .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND));
    return toResponse(entity);
  }

  /*
   * 설비 정보 등록/수정을 한 번에 처리. facilitySq 유무로 신규/갱신을 분기하며
   * 데이터가 바뀌므로 목록 캐시는 전부 무효화한다.
   */
  @Transactional
  @CacheEvict(value = "facilityList", allEntries = true)
  public void saveFacilities(List<FacilityDto.SaveReq> reqList) {
    reqList.forEach(req -> {
      boolean isNew = req.getFacilitySq() == null;
      if (isNew) {
        insertFacility(req);
        return;
      }
      applyUpdate(req);
    });
  }

  /*
   * 설비 다건 소프트 삭제. 이력/점검항목/일일점검/정기점검 테이블이 facility_sq 를
   * 외래로 참조하므로 행 자체를 지우지 않고 use_yn 만 내려 데이터를 보존한다.
   */
  @Transactional
  @CacheEvict(value = "facilityList", allEntries = true)
  public void deleteFacilities(FacilityDto.DeleteReq req) {
    List<Long> ids = req.getFacilityIds();
    if (ids == null || ids.isEmpty()) {
      return;
    }
    for (Facility entity : facilityRepo.findAllById(ids)) {
      entity.markAsUnused();
    }
  }

  // --- 내부 처리 ---

  private void insertFacility(FacilityDto.SaveReq req) {
    // 관리번호(manageNo)는 현재 FE 채번을 그대로 받는다. 서버 자동채번으로의 전환은 후속 과제.
    Facility.FacilityBuilder builder = Facility.builder();

    // 식별/분류 정보
    builder.manageNo(req.getManageNo())
        .facilityName(req.getFacilityName())
        .facilityType(req.getFacilityType())
        .modelNm(req.getModelNm())
        .spec(req.getSpec());

    // 제조/구매 관련
    builder.makerNm(req.getMakerNm())
        .manufactureDate(req.getManufactureDate())
        .supplierNm(req.getSupplierNm())
        .purchaseDate(req.getPurchaseDate())
        .purchasePrice(req.getPurchasePrice())
        .purchaseManager(req.getPurchaseManager())
        .purchaseTel(req.getPurchaseTel());

    // 관리자/AS 연락처
    builder.manageDept(req.getManageDept())
        .managerNm(req.getManagerNm())
        .managerTel(req.getManagerTel())
        .asCompany(req.getAsCompany())
        .asManager(req.getAsManager())
        .asTel(req.getAsTel());

    // 배치/공정 및 기타 부가정보
    builder.lineSq(req.getLineSq())
        .processSq(req.getProcessSq())
        .installPlace(req.getInstallPlace())
        .remark(req.getRemark())
        .imgPaths(req.getImgPaths())
        .purpose(req.getPurpose())
        .disposeDate(req.getDisposeDate())
        .attachFileNm(req.getAttachFileNm())
        .attachFileContent(req.getAttachFileContent())
        .lineNm(req.getLineNm())
        .processNm(req.getProcessNm());

    builder.regDt(LocalDateTime.now()).useYn(true);

    facilityRepo.save(builder.build());
  }

  private void applyUpdate(FacilityDto.SaveReq req) {
    Facility entity = facilityRepo.findById(req.getFacilitySq())
        .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND));
    entity.updateFacility(
        req.getManageNo(), req.getFacilityName(), req.getFacilityType(), req.getModelNm(), req.getSpec(),
        req.getMakerNm(), req.getManufactureDate(), req.getSupplierNm(), req.getPurchaseDate(),
        req.getPurchasePrice(), req.getPurchaseManager(), req.getPurchaseTel(),
        req.getManageDept(), req.getManagerNm(), req.getManagerTel(),
        req.getAsCompany(), req.getAsManager(), req.getAsTel(),
        req.getLineSq(), req.getProcessSq(), req.getInstallPlace(),
        req.getRemark(), req.getImgPaths(),
        req.getPurpose(), req.getDisposeDate(), req.getAttachFileNm(), req.getAttachFileContent(),
        req.getLineNm(), req.getProcessNm());
  }

  // 엔티티 → 응답 DTO 변환 (목록/상세 화면 공용)
  private FacilityDto.Res toResponse(Facility f) {
    FacilityDto.Res res = new FacilityDto.Res();

    res.setFacilitySq(f.getFacilitySq());
    res.setManageNo(f.getManageNo());
    res.setFacilityName(f.getFacilityName());
    res.setFacilityType(f.getFacilityType());
    res.setModelNm(f.getModelNm());
    res.setSpec(f.getSpec());

    res.setMakerNm(f.getMakerNm());
    res.setManufactureDate(f.getManufactureDate());
    res.setSupplierNm(f.getSupplierNm());
    res.setPurchaseDate(f.getPurchaseDate());
    res.setPurchasePrice(f.getPurchasePrice());

    res.setManageDept(f.getManageDept());
    res.setManagerNm(f.getManagerNm());
    res.setAsCompany(f.getAsCompany());
    res.setAsTel(f.getAsTel());

    res.setLineSq(f.getLineSq());
    res.setProcessSq(f.getProcessSq());
    res.setLineNm(f.getLineNm());
    res.setProcessNm(f.getProcessNm());
    res.setInstallPlace(f.getInstallPlace());

    res.setPurpose(f.getPurpose());
    res.setDisposeDate(f.getDisposeDate());
    res.setAttachFileNm(f.getAttachFileNm());
    res.setAttachFileContent(f.getAttachFileContent());
    res.setImgPaths(f.getImgPaths());
    res.setRemark(f.getRemark());
    res.setRegDt(f.getRegDt());

    return res;
  }
}
