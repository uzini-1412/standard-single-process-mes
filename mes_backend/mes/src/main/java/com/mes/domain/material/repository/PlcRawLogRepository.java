package com.mes.domain.material.repository;

import com.mes.domain.material.entity.PlcRawLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 외주 PLC 가 밀어 넣은 호기별 토출 원본 로그(mes_plc_raw_log_tb) 저장소.
 *
 * <p>두 조회 모두 기간으로 끊되, 한쪽은 라인을 지정해 최신순으로,
 * 다른 한쪽은 라인 구분 없이 시간 오름차순으로 가져온다는 점만 다르다.
 */
@Repository
public interface PlcRawLogRepository extends JpaRepository<PlcRawLog, Long> {

  /*
   * 원소재투입현황 매트릭스용 — 라인 무관 기간 전체를 수집 시각 오름차순으로 읽어
   * 화면에서 시간대 격자로 재배치한다.
   */
  @Query("select log from PlcRawLog log "
      + "where log.collectedDt between :start and :end "
      + "order by log.collectedDt asc")
  List<PlcRawLog> findByCollectedDtBetweenOrderByCollectedDtAsc(
      @Param("start") LocalDateTime from, @Param("end") LocalDateTime to);

  /*
   * 원소재투입분석용 — 특정 라인의 기간 로그를 가장 최근 토출부터 내려준다.
   */
  @Query("select log from PlcRawLog log "
      + "where log.lineCode = :line and log.collectedDt between :start and :end "
      + "order by log.collectedDt desc")
  List<PlcRawLog> findByLineCodeAndCollectedDtBetweenOrderByCollectedDtDesc(
      @Param("line") String lineCode,
      @Param("start") LocalDateTime from,
      @Param("end") LocalDateTime to);
}
