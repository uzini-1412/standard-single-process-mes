package com.mes.domain.instrument.service;

import com.mes.domain.instrument.dto.InstrumentHistoryDto;
import com.mes.domain.instrument.entity.InstrumentHistory;
import com.mes.domain.instrument.entity.MeasuringInstrument;
import com.mes.domain.instrument.repository.InstrumentHistoryRepository;
import com.mes.domain.instrument.repository.MeasuringInstrumentRepository;
import com.mes.global.exception.CustomException;
import com.mes.global.exception.ErrorCode;
import com.mes.global.support.EntityIndex;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InstrumentHistoryService {

  private final InstrumentHistoryRepository historyRepository;
  private final MeasuringInstrumentRepository instrumentRepository;

  /** "교정" 이력만 마스터 교정일 자동 반영의 트리거가 된다. */
  private static final String CALIB_HISTORY_TYPE = "교정";
  /** 교정주기 표기를 "숫자 + 단위(일/주/달/년)"로 끊어 읽기 위한 패턴. */
  private static final Pattern CYCLE_TOKEN = Pattern.compile("^(\\d+)(일|주|달|년)$");

  // ===========================================================================
  // 조회
  // ===========================================================================

  /**
   * 검색 조건에 맞는 이력 목록을 만든다.
   * 발생일 구간은 DB 단에서 거른 뒤, 관련 마스터를 한 번에 끌어와 N+1 을 피하고,
   * 텍스트성 조건(관리번호/기기명/기기번호/통합키워드)은 메모리에서 contains 로 마무리한다.
   */
  @Cacheable(value = "instrumentHistories", key = "T(String).valueOf(#req.hashCode())")
  public List<InstrumentHistoryDto.Res> getHistoryList(InstrumentHistoryDto.SearchReq req) {
    List<InstrumentHistory> found = historyRepository.findBySearchCondition(
        req.getInstrumentSq(), req.getDateFrom(), req.getDateTo());
    if (found.isEmpty()) {
      return List.of();
    }

    Map<Long, MeasuringInstrument> masterById = fetchMasters(found);

    List<InstrumentHistoryDto.Res> rows = new ArrayList<>(found.size());
    for (InstrumentHistory entity : found) {
      InstrumentHistoryDto.Res row = mapToRes(entity);
      Long sq = entity.getInstrumentSq();
      if (sq != null) {
        MeasuringInstrument master = masterById.get(sq);
        if (master != null) {
          mergeMaster(row, master);
        }
      }
      rows.add(row);
    }

    String manageNo = trimToNull(req.getManageNo());
    String instrumentNm = trimToNull(req.getInstrumentNm());
    String instrumentNo = trimToNull(req.getInstrumentNo());
    String keyword = trimToNull(req.getKeyword());

    return rows.stream()
        .filter(r -> contains(r.getManageNo(), manageNo))
        .filter(r -> contains(r.getInstrumentNm(), instrumentNm))
        .filter(r -> contains(r.getInstrumentNo(), instrumentNo))
        .filter(r -> keywordHit(r, keyword))
        .collect(Collectors.toList());
  }

  private Map<Long, MeasuringInstrument> fetchMasters(List<InstrumentHistory> histories) {
    List<Long> ids = histories.stream()
        .map(InstrumentHistory::getInstrumentSq)
        .filter(Objects::nonNull)
        .distinct()
        .collect(Collectors.toList());
    return EntityIndex.byId(ids, instrumentRepository::findAllById, MeasuringInstrument::getInstrumentSq);
  }

  private boolean keywordHit(InstrumentHistoryDto.Res row, String keyword) {
    if (keyword == null) {
      return true;
    }
    return contains(row.getManageNo(), keyword)
        || contains(row.getInstrumentNm(), keyword)
        || contains(row.getInstrumentNo(), keyword);
  }

  /**
   * 이력카드 조회.
   * keyword 가 주어지면 키워드 검색을, 없고 instrumentSq 만 있으면 단건 조회를 수행한다.
   * 두 조건이 모두 있으면 키워드 결과를 해당 PK 로 한 번 더 좁힌다.
   * 각 마스터(A영역)에 그 계측기의 이력 리스트(B영역)를 붙여 카드를 완성한다.
   */
  public List<InstrumentHistoryDto.CardRes> getHistoryCardList(InstrumentHistoryDto.SearchReq req) {
    String keyword = trimToNull(req.getKeyword());
    List<MeasuringInstrument> masters = pickCardMasters(req, keyword);

    return masters.stream()
        .map(this::assembleCard)
        .collect(Collectors.toList());
  }

  private List<MeasuringInstrument> pickCardMasters(InstrumentHistoryDto.SearchReq req, String keyword) {
    Long instrumentSq = req.getInstrumentSq();

    boolean singleLookup = instrumentSq != null && keyword == null;
    if (singleLookup) {
      return instrumentRepository.findById(instrumentSq)
          .map(List::of)
          .orElseGet(List::of);
    }

    List<MeasuringInstrument> hits = instrumentRepository.findByKeyword(keyword);
    if (instrumentSq == null) {
      return hits;
    }
    return hits.stream()
        .filter(m -> instrumentSq.equals(m.getInstrumentSq()))
        .collect(Collectors.toList());
  }

  private InstrumentHistoryDto.CardRes assembleCard(MeasuringInstrument master) {
    InstrumentHistoryDto.CardRes card = new InstrumentHistoryDto.CardRes();
    card.setInstrumentSq(master.getInstrumentSq());
    card.setManageNo(master.getManageNo());
    card.setInstrumentNm(master.getInstrumentNm());
    card.setInstrumentNo(master.getInstrumentNo());
    card.setSpec(master.getSpec());
    card.setPurchaseDate(master.getPurchaseDate());
    card.setImgPaths(master.getImgPaths());

    List<InstrumentHistoryDto.Res> entries = historyRepository
        .findByInstrumentSqAndUseYnTrueOrderByOccurDateDesc(master.getInstrumentSq())
        .stream()
        .map(this::mapToRes)
        .collect(Collectors.toList());
    card.setHistoryList(entries);
    return card;
  }

  // ===========================================================================
  // 저장 / 삭제
  // ===========================================================================

  /**
   * 이력 다건 저장. historySq 유무로 신규/수정을 가른다.
   * 처리 도중 만난 "교정" 이력 중 계측기별로 가장 늦은 발생일을 모아 두었다가,
   * 끝에서 마스터의 교정일/차기교정일에 한 번에 반영한다.
   */
  @Transactional
  @Caching(evict = {
      @CacheEvict(value = "instrumentHistories", allEntries = true),
      @CacheEvict(value = "measuringInstruments", allEntries = true)
  })
  public void saveHistories(List<InstrumentHistoryDto.SaveReq> reqList) {
    Map<Long, LocalDate> latestCalib = new LinkedHashMap<>();

    for (InstrumentHistoryDto.SaveReq req : reqList) {
      upsert(req);
      collectCalibration(latestCalib, req);
    }

    latestCalib.forEach(this::syncCalibToMaster);
  }

  private void upsert(InstrumentHistoryDto.SaveReq req) {
    if (req.isNew()) {
      historyRepository.save(InstrumentHistory.builder()
          .instrumentSq(req.getInstrumentSq())
          .historyType(req.getHistoryType())
          .occurDate(req.getOccurDate())
          .agencyNm(req.getAgencyNm())
          .actionContent(req.getActionContent())
          .actionCost(req.getActionCost())
          .workerNm(req.getWorkerNm())
          .reportFilePath(req.getReportFilePath())
          .reportFileNm(req.getReportFileNm())
          .remark(req.getRemark())
          .useYn(true)
          .build());
      return;
    }

    InstrumentHistory entity = historyRepository.findById(req.getHistorySq())
        .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND));
    entity.applyEdit(
        req.getHistoryType(), req.getOccurDate(), req.getAgencyNm(),
        req.getActionContent(), req.getActionCost(), req.getWorkerNm(),
        req.getReportFilePath(), req.getReportFileNm(), req.getRemark());
  }

  private void collectCalibration(Map<Long, LocalDate> acc, InstrumentHistoryDto.SaveReq req) {
    if (!CALIB_HISTORY_TYPE.equals(req.getHistoryType())
        || req.getInstrumentSq() == null
        || req.getOccurDate() == null) {
      return;
    }
    acc.merge(req.getInstrumentSq(), req.getOccurDate(),
        (kept, candidate) -> candidate.isAfter(kept) ? candidate : kept);
  }

  /**
   * 전달된 PK 목록을 삭제한다. 비었거나 null 이면 무시한다.
   */
  @Transactional
  @Caching(evict = {
      @CacheEvict(value = "instrumentHistories", allEntries = true),
      @CacheEvict(value = "measuringInstruments", allEntries = true)
  })
  public void deleteHistories(InstrumentHistoryDto.DeleteReq req) {
    List<Long> targetIds = req.getHistoryIds();
    if (targetIds != null && !targetIds.isEmpty()) {
      historyRepository.deleteAllById(targetIds);
    }
  }

  // ===========================================================================
  // 마스터 교정일 자동 갱신
  // ===========================================================================

  /**
   * 교정 발생일을 받아 마스터의 lastCalibDate / nextCalibDate 를 다시 쓴다.
   * 기존 교정일과 같거나 그보다 과거인 백데이터는 무시하고,
   * 교정주기를 해석하지 못하면 차기교정일은 종전 값을 유지한다.
   */
  private void syncCalibToMaster(Long instrumentSq, LocalDate occurDate) {
    MeasuringInstrument master = instrumentRepository.findById(instrumentSq).orElse(null);
    if (master == null) {
      return;
    }

    LocalDate prevLast = master.getLastCalibDate();
    if (prevLast != null && !occurDate.isAfter(prevLast)) {
      return;
    }

    LocalDate derivedNext = resolveNextCalibDate(occurDate, master.getCalibCycle());
    LocalDate nextCalibDate = (derivedNext != null) ? derivedNext : master.getNextCalibDate();

    master.recordCalibration(occurDate, nextCalibDate);
  }

  private LocalDate resolveNextCalibDate(LocalDate base, String calibCycle) {
    if (base == null || calibCycle == null) {
      return null;
    }
    Matcher token = CYCLE_TOKEN.matcher(calibCycle.trim());
    if (!token.matches()) {
      return null;
    }
    int qty = Integer.parseInt(token.group(1));
    return switch (token.group(2)) {
      case "일" -> base.plusDays(qty);
      case "주" -> base.plusWeeks(qty);
      case "달" -> base.plusMonths(qty);
      case "년" -> base.plusYears(qty);
      default -> null;
    };
  }

  // ===========================================================================
  // 보조 유틸
  // ===========================================================================

  private String trimToNull(String value) {
    if (value == null) {
      return null;
    }
    String cleaned = value.trim();
    return cleaned.isEmpty() ? null : cleaned;
  }

  private boolean contains(String source, String keyword) {
    return keyword == null || (source != null && source.contains(keyword));
  }

  private void mergeMaster(InstrumentHistoryDto.Res row, MeasuringInstrument master) {
    row.setManageNo(master.getManageNo());
    row.setInstrumentType(master.getInstrumentType());
    row.setInstrumentNm(master.getInstrumentNm());
    row.setModelNm(master.getModelNm());
    row.setInstrumentNo(master.getInstrumentNo());
    row.setSpec(master.getSpec());
    row.setMakerNm(master.getMakerNm());
    row.setPurchaseDate(master.getPurchaseDate());
    row.setPurchasePrice(master.getPurchasePrice());
    row.setCalibCycle(master.getCalibCycle());
    row.setCalibAgency(master.getCalibAgency());
    row.setLastCalibDate(master.getLastCalibDate());
    row.setNextCalibDate(master.getNextCalibDate());
    row.setImgPaths(master.getImgPaths());
  }

  private InstrumentHistoryDto.Res mapToRes(InstrumentHistory entity) {
    InstrumentHistoryDto.Res res = new InstrumentHistoryDto.Res();
    res.setHistorySq(entity.getHistorySq());
    res.setInstrumentSq(entity.getInstrumentSq());
    res.setHistoryType(entity.getHistoryType());
    res.setOccurDate(entity.getOccurDate());
    res.setAgencyNm(entity.getAgencyNm());
    res.setActionContent(entity.getActionContent());
    res.setActionCost(entity.getActionCost());
    res.setWorkerNm(entity.getWorkerNm());
    res.setReportFilePath(entity.getReportFilePath());
    res.setReportFileNm(entity.getReportFileNm());
    res.setRemark(entity.getRemark());
    res.setRegDt(entity.getRegDt());
    return res;
  }
}
