package com.mes.domain.stock.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.mes.domain.stock.entity.ProductStockHistory;

@Repository
public interface ProductStockHistoryRepository extends JpaRepository<ProductStockHistory, Long> {

  // ---- single-row / single-item lookups ----

  /** Movements of one stock row, latest first. */
  List<ProductStockHistory> findByStockSqOrderByRegDtDesc(Long stockSq);

  /** Full movement trail of one item in chronological order — feeds the running-balance roll-up. */
  List<ProductStockHistory> findByItemSqOrderByRegDtAsc(Long itemSq);

  // ---- date-window queries ----

  /** One item's movements inside [from, to], newest first (stock-analysis / warehouse-inbound). */
  List<ProductStockHistory> findByItemSqAndRegDtBetweenOrderByRegDtDesc(
      Long itemSq, LocalDateTime from, LocalDateTime to);

  /** Every movement inside [from, to], newest first (inbound / shipment roll-ups). */
  List<ProductStockHistory> findByRegDtBetweenOrderByRegDtDesc(LocalDateTime from, LocalDateTime to);

  // ---- change-type filtered aggregations ----

  /** Production-of-the-month (= inbound) feed: change type + item set + reg-date window. */
  List<ProductStockHistory> findByChangeTypeAndItemSqInAndRegDtBetween(
      String changeType, List<Long> itemSqs, LocalDateTime from, LocalDateTime to);

  /** Used to flag legacy LOTs — those owning at least one INBOUND entry. */
  List<ProductStockHistory> findByChangeTypeAndItemSqIn(String changeType, List<Long> itemSqs);

  /** 특정 출처 문서(refType+refSq)로 쌓인 변동 이력 — 작업실적 수정 재저장 시 이전 입고분 역분개에 사용. */
  List<ProductStockHistory> findByRefTypeAndRefSq(String refType, Long refSq);
}
