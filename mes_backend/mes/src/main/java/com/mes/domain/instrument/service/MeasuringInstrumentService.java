package com.mes.domain.instrument.service;

import com.mes.domain.instrument.dto.MeasuringInstrumentDto;
import com.mes.domain.instrument.entity.MeasuringInstrument;
import com.mes.domain.instrument.repository.MeasuringInstrumentRepository;
import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MeasuringInstrumentService {

  private final MeasuringInstrumentRepository instrumentRepository;

  // ===========================================================================
  // 쓰기 작업
  // ===========================================================================

  /**
   * 계측기 다건 저장. PK(instrumentSq) 유무로 신규/수정을 갈라 각 행을 처리한다.
   */
  @Transactional
  @CacheEvict(value = "measuringInstruments", allEntries = true)
  public void saveInstruments(List<MeasuringInstrumentDto.SaveReq> reqList) {
    reqList.forEach(this::saveOne);
  }

  private void saveOne(MeasuringInstrumentDto.SaveReq req) {
    if (req.isNew()) {
      instrumentRepository.save(buildEntity(req));
      return;
    }

    MeasuringInstrument target = instrumentRepository.findById(req.getInstrumentSq())
        .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND));
    target.applyEditableFields(
        req.getManageNo(), req.getInstrumentType(), req.getInstrumentNm(), req.getModelNm(),
        req.getInstrumentNo(), req.getSpec(), req.getMakerNm(), req.getPurchaseDate(),
        req.getPurchasePrice(), req.getCalibCycle(), req.getCalibAgency(),
        req.getLastCalibDate(), req.getNextCalibDate(), req.getRemark(),
        req.getImgPaths());
  }

  private MeasuringInstrument buildEntity(MeasuringInstrumentDto.SaveReq req) {
    return MeasuringInstrument.builder()
        .manageNo(req.getManageNo())
        .instrumentType(req.getInstrumentType())
        .instrumentNm(req.getInstrumentNm())
        .modelNm(req.getModelNm())
        .instrumentNo(req.getInstrumentNo())
        .spec(req.getSpec())
        .makerNm(req.getMakerNm())
        .purchaseDate(req.getPurchaseDate())
        .purchasePrice(req.getPurchasePrice())
        .calibCycle(req.getCalibCycle())
        .calibAgency(req.getCalibAgency())
        .lastCalibDate(req.getLastCalibDate())
        .nextCalibDate(req.getNextCalibDate())
        .remark(req.getRemark())
        .imgPaths(req.getImgPaths())
        .useYn(true)
        .build();
  }

  /**
   * 전달된 PK 목록을 삭제한다. 비어 있거나 null 이면 아무 일도 하지 않는다.
   */
  @Transactional
  @CacheEvict(value = "measuringInstruments", allEntries = true)
  public void deleteInstruments(MeasuringInstrumentDto.DeleteReq req) {
    List<Long> targetIds = req.getInstrumentIds();
    if (targetIds != null && !targetIds.isEmpty()) {
      instrumentRepository.deleteAllById(targetIds);
    }
  }

  // ===========================================================================
  // 조회
  // ===========================================================================

  /**
   * 검색 조건으로 계측기 목록을 조회하고, 각 행에 차기교정일 기준 잔여일(D-Day)을 붙인다.
   */
  @Cacheable(value = "measuringInstruments", key = "T(String).valueOf(#req.hashCode())")
  public List<MeasuringInstrumentDto.Res> getInstrumentList(MeasuringInstrumentDto.SearchReq req) {
    return instrumentRepository.findBySearchCondition(
            req.getInstrumentType(),
            trimToNull(req.getManageNo()),
            trimToNull(req.getInstrumentNm()),
            trimToNull(req.getInstrumentNo()))
        .stream()
        .map(this::toRes)
        .collect(Collectors.toList());
  }

  private MeasuringInstrumentDto.Res toRes(MeasuringInstrument entity) {
    MeasuringInstrumentDto.Res res = new MeasuringInstrumentDto.Res();
    res.setInstrumentSq(entity.getInstrumentSq());
    res.setManageNo(entity.getManageNo());
    res.setInstrumentType(entity.getInstrumentType());
    res.setInstrumentNm(entity.getInstrumentNm());
    res.setModelNm(entity.getModelNm());
    res.setInstrumentNo(entity.getInstrumentNo());
    res.setSpec(entity.getSpec());
    res.setMakerNm(entity.getMakerNm());
    res.setPurchaseDate(entity.getPurchaseDate());
    res.setPurchasePrice(entity.getPurchasePrice());
    res.setCalibCycle(entity.getCalibCycle());
    res.setCalibAgency(entity.getCalibAgency());
    res.setLastCalibDate(entity.getLastCalibDate());
    res.setNextCalibDate(entity.getNextCalibDate());
    res.setRemainingDays(daysLeftUntil(entity.getNextCalibDate()));
    res.setRemark(entity.getRemark());
    res.setImgPaths(entity.getImgPaths());
    res.setRegDt(entity.getRegDt());
    return res;
  }

  // ===========================================================================
  // 보조
  // ===========================================================================

  /** 차기교정일까지의 잔여일수. 차기교정일이 비어 있으면 null. */
  private Integer daysLeftUntil(LocalDate nextCalibDate) {
    if (nextCalibDate == null) {
      return null;
    }
    return (int) ChronoUnit.DAYS.between(LocalDate.now(), nextCalibDate);
  }

  /** 공백만 있는 검색어는 무시되도록 null 로 정규화한다. */
  private String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String cleaned = value.trim();
    return cleaned.isEmpty() ? null : cleaned;
  }
}
