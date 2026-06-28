package com.mes.domain.instrument.repository;

import com.mes.domain.instrument.entity.InstrumentHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface InstrumentHistoryRepository extends JpaRepository<InstrumentHistory, Long> {

    // 단일 계측기의 살아있는 이력 전부 — 이력카드 화면이 발생일 최신순으로 받아간다.
    List<InstrumentHistory> findByInstrumentSqAndUseYnTrueOrderByOccurDateDesc(Long instrumentSq);

    // 계측기/기간 조건 검색. 세 조건 모두 선택적이며, null 이면 해당 필터를 통과시킨다.
    // useYn=true 만 대상으로 하고 발생일 내림차순(동률 시 PK 내림차순)으로 정렬한다.
    @Query(value =
            "SELECT h FROM InstrumentHistory h " +
            "WHERE h.useYn = true " +
            "AND (COALESCE(:instrumentSq, h.instrumentSq) = h.instrumentSq) " +
            "AND (:dateFrom IS NULL OR h.occurDate >= :dateFrom) " +
            "AND (:dateTo IS NULL OR h.occurDate <= :dateTo) " +
            "ORDER BY h.occurDate DESC, h.historySq DESC")
    List<InstrumentHistory> findBySearchCondition(@Param("instrumentSq") Long instrumentSq,
                                                  @Param("dateFrom") LocalDate dateFrom,
                                                  @Param("dateTo") LocalDate dateTo);
}
