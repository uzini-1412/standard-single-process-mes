package com.mes.domain.stock.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mes.domain.stock.entity.MaterialStockHistory;

@Repository
public interface MaterialStockHistoryRepository extends JpaRepository<MaterialStockHistory, Long> {

  /** Movement log of a single stock row, most recent first. */
  List<MaterialStockHistory> findByStockSqOrderByRegDtDesc(Long stockSq);

  /**
   * Month-end on-hand total for the dashboard: for every stock_sq take its newest
   * history row at-or-before {@code asOf} and add up the resulting curr_qty values.
   * Materials only — this history table never holds product rows.
   *
   * The correlated subquery yields, per stock_sq, the largest history_sq whose
   * reg time is &lt;= asOf; the outer aggregate sums those rows' curr_qty.
   */
  @Query("""
      SELECT COALESCE(SUM(h.currQty), 0.0)
      FROM MaterialStockHistory h
      WHERE h.historySq = (
          SELECT MAX(latest.historySq)
          FROM MaterialStockHistory latest
          WHERE latest.stockSq = h.stockSq
            AND latest.regDt <= :asOf
      )
      """)
  Double sumLatestCurrQtyAsOf(@Param("asOf") LocalDateTime asOf);
}
