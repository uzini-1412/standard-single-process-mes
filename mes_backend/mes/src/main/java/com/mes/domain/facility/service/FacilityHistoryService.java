package com.mes.domain.facility.service;

import com.mes.domain.facility.dto.FacilityHistoryDto;
import com.mes.domain.facility.entity.Facility;
import com.mes.domain.facility.entity.FacilityHistory;
import com.mes.domain.facility.repository.FacilityHistoryRepository;
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
import java.util.ArrayList;
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
public class FacilityHistoryService {

    private final FacilityHistoryRepository historyRepo;
    private final FacilityRepository facilityRepo;

    /*
     * 설비 이력 그리드 조회. 각 이력행에 설비 마스터 일부(관리번호/설비명/구분/라인/공정)를
     * 붙여 내려준다. 행마다 설비 조회를 피하려고 참조 설비를 일괄 로딩한다.
     */
    @Cacheable(value = "facilityHistories", key = "T(String).valueOf(#req.hashCode())")
    public List<FacilityHistoryDto.Res> getHistoryList(FacilityHistoryDto.SearchReq req) {
        List<FacilityHistory> histories = historyRepo.findBySearchCondition(
            req.getFacilitySq(), req.getDateFrom(), req.getDateTo());
        if (histories.isEmpty()) {
            return List.of();
        }

        Map<Long, Facility> facilityById = loadFacilityMap(histories);

        List<FacilityHistoryDto.Res> result = new ArrayList<>(histories.size());
        for (FacilityHistory h : histories) {
            FacilityHistoryDto.Res res = toResponse(h);
            applyFacilitySummary(res, facilityById.get(h.getFacilitySq()));
            result.add(res);
        }
        return result;
    }

    // 이력행 응답에 설비 마스터 요약(관리번호/설비명/구분/라인/공정)을 채워 넣는다.
    private void applyFacilitySummary(FacilityHistoryDto.Res res, Facility f) {
        if (f == null) {
            return;
        }
        res.setManageNo(f.getManageNo());
        res.setFacilityName(f.getFacilityName());
        res.setFacilityType(f.getFacilityType());
        res.setLineNm(f.getLineNm());
        res.setProcessNm(f.getProcessNm());
    }

    /*
     * 설비이력카드 조회. keyword(설비명/관리번호)로 대상 설비를 찾고, facilitySq 가 함께
     * 오면 그 한 대로 좁힌다. 설비별로 마스터 정보(A영역) + 이력 리스트(B영역)를 묶어 반환.
     */
    public List<FacilityHistoryDto.CardRes> getHistoryCardList(FacilityHistoryDto.SearchReq req) {
        List<Facility> targets = facilityRepo.findBySearchCondition(null, null, req.getKeyword());

        Long onlySq = req.getFacilitySq();
        List<FacilityHistoryDto.CardRes> cards = new ArrayList<>();
        for (Facility f : targets) {
            // facilitySq 가 지정된 경우 그 한 대로만 카드를 구성한다.
            boolean skip = onlySq != null && !onlySq.equals(f.getFacilitySq());
            if (!skip) {
                cards.add(buildCard(f));
            }
        }
        return cards;
    }

    /*
     * 설비 이력 등록/수정 다건 처리. historySq 유무로 신규/갱신 분기.
     */
    @Transactional
    @CacheEvict(value = "facilityHistories", allEntries = true)
    public void saveHistories(List<FacilityHistoryDto.SaveReq> reqList) {
        for (FacilityHistoryDto.SaveReq req : reqList) {
            if (req.getHistorySq() == null) {
                historyRepo.save(buildNew(req));
                continue;
            }
            applyHistoryUpdate(req);
        }
    }

    private void applyHistoryUpdate(FacilityHistoryDto.SaveReq req) {
        FacilityHistory history = historyRepo.findById(req.getHistorySq())
                .orElseThrow(() -> new CustomException(ErrorCode.COMMON_ENTITY_NOT_FOUND));
        history.updateHistory(
                req.getOccurDate(), req.getOccurContent(), req.getActionType(),
                req.getActionDate(), req.getActionTime(), req.getActionContent(),
                req.getActionManager(), req.getActionCost(), req.getRemark(),
                req.getHistoryNo());
    }

    // 설비 이력 다건 삭제
    @Transactional
    @CacheEvict(value = "facilityHistories", allEntries = true)
    public void deleteHistories(FacilityHistoryDto.DeleteReq req) {
        List<Long> ids = req.getHistoryIds();
        if (ids == null || ids.isEmpty()) {
            return;
        }
        historyRepo.deleteAllById(ids);
    }

    // --- 내부 처리 ---

    private FacilityHistoryDto.CardRes buildCard(Facility f) {
        FacilityHistoryDto.CardRes card = new FacilityHistoryDto.CardRes();

        // A영역: 설비 마스터 요약 정보
        card.setFacilitySq(f.getFacilitySq());
        card.setManageNo(f.getManageNo());
        card.setFacilityName(f.getFacilityName());
        card.setProcessNm(f.getProcessNm());
        card.setPurchaseDate(f.getPurchaseDate());
        card.setImgPaths(f.getImgPaths());

        // B영역: 발생일 내림차순으로 정렬된 사용중 이력 목록
        List<FacilityHistory> rows =
                historyRepo.findByFacilitySqAndUseYnTrueOrderByOccurDateDesc(f.getFacilitySq());
        List<FacilityHistoryDto.Res> historyList = new ArrayList<>(rows.size());
        for (FacilityHistory row : rows) {
            historyList.add(toResponse(row));
        }
        card.setHistoryList(historyList);

        return card;
    }

    private FacilityHistory buildNew(FacilityHistoryDto.SaveReq req) {
        return FacilityHistory.builder()
                .facilitySq(req.getFacilitySq())
                .historyNo(req.getHistoryNo())
                .occurDate(req.getOccurDate())
                .occurContent(req.getOccurContent())
                .actionType(req.getActionType())
                .actionManager(req.getActionManager())
                .actionDate(req.getActionDate())
                .actionTime(req.getActionTime())
                .actionContent(req.getActionContent())
                .actionCost(req.getActionCost())
                .remark(req.getRemark())
                .useYn(true)
                .regDt(LocalDateTime.now())
                .build();
    }

    private Map<Long, Facility> loadFacilityMap(List<FacilityHistory> histories) {
        Set<Long> facilityIds = histories.stream()
                .map(FacilityHistory::getFacilitySq)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        return EntityIndex.byId(List.copyOf(facilityIds), facilityRepo::findAllById, Facility::getFacilitySq);
    }

    private FacilityHistoryDto.Res toResponse(FacilityHistory h) {
        FacilityHistoryDto.Res res = new FacilityHistoryDto.Res();

        res.setHistorySq(h.getHistorySq());
        res.setFacilitySq(h.getFacilitySq());
        res.setHistoryNo(h.getHistoryNo());

        res.setOccurDate(h.getOccurDate());
        res.setOccurContent(h.getOccurContent());

        res.setActionType(h.getActionType());
        res.setActionManager(h.getActionManager());
        res.setActionDate(h.getActionDate());
        res.setActionTime(h.getActionTime());
        res.setActionContent(h.getActionContent());
        res.setActionCost(h.getActionCost());

        res.setRemark(h.getRemark());
        res.setRegDt(h.getRegDt());

        return res;
    }
}
