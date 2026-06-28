package com.mes.domain.stock.repository;

import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mes.domain.stock.entity.ProductStock;

@Repository
public interface ProductStockRepository extends JpaRepository<ProductStock, Long> {

  // ===== plain derived lookups =====

  /** Finished-goods stock row for an item + LOT pair. */
  Optional<ProductStock> findByItemSqAndLotNo(Long itemSq, String lotNo);

  /** First row carrying a given LOT (LOT tracing — replaces a findAll + manual filter). */
  Optional<ProductStock> findFirstByLotNo(String lotNo);

  /** Every row of one item (used when summing current stock). */
  List<ProductStock> findByItemSq(Long itemSq);

  /** Bulk fetch for a set of items, sparing us an N+1. */
  List<ProductStock> findByItemSqIn(java.util.Collection<Long> itemSqs);

  // ===== pessimistic-write locked reads =====
  // Taken on the concurrency-sensitive deduction paths (shipment etc.) so two
  // threads can't drive the same LOT's remaining quantity negative.

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT ps FROM ProductStock ps WHERE ps.itemSq = :itemSq AND ps.lotNo = :lotNo")
  Optional<ProductStock> findByItemSqAndLotNoForUpdate(@Param("itemSq") Long itemSq, @Param("lotNo") String lotNo);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT ps FROM ProductStock ps WHERE ps.lotNo = :lotNo ORDER BY ps.stockSq ASC")
  List<ProductStock> findByLotNoForUpdate(@Param("lotNo") String lotNo);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT ps FROM ProductStock ps WHERE ps.itemSq = :itemSq")
  List<ProductStock> findByItemSqForUpdate(@Param("itemSq") Long itemSq);

  // ===== item-filtered searches (case-insensitive LIKE on both fields) =====

  /** Stock filtered by item code / name — e.g. the stock-analysis screen. */
  @Query("""
      SELECT ps FROM ProductStock ps
      LEFT JOIN Item it ON it.itemSq = ps.itemSq
      WHERE (:itemCode IS NULL OR LOWER(it.itemCode) LIKE LOWER(CONCAT('%', :itemCode, '%')))
        AND (:itemName IS NULL OR LOWER(it.itemName) LIKE LOWER(CONCAT('%', :itemName, '%')))
      """)
  List<ProductStock> findByItemFilter(
      @Param("itemCode") String itemCode,
      @Param("itemName") String itemName);

  /** Same item-code / item-name filter as above, returned as a page (LOT list view). */
  @Query("""
      SELECT ps FROM ProductStock ps
      LEFT JOIN Item it ON it.itemSq = ps.itemSq
      WHERE (:itemCode IS NULL OR LOWER(it.itemCode) LIKE LOWER(CONCAT('%', :itemCode, '%')))
        AND (:itemName IS NULL OR LOWER(it.itemName) LIKE LOWER(CONCAT('%', :itemName, '%')))
      """)
  Page<ProductStock> findForLotListPaged(
      @Param("itemCode") String itemCode,
      @Param("itemName") String itemName,
      Pageable pageable);

  // ===== aggregations =====

  /**
   * Per-item roll-up for the product warehouse-inbound screen, grouped in the DB.
   * Each result row is [item_sq, SUM(current_qty_m), COUNT(*)].
   */
  @Query("""
      SELECT ps.itemSq, COALESCE(SUM(ps.currentQtyM), 0), COUNT(ps)
      FROM ProductStock ps
      WHERE ps.currentQtyM IS NULL OR ps.currentQtyM > 0
      GROUP BY ps.itemSq
      """)
  List<Object[]> aggregateStockByItem();

  /** Turnover widget feed: per-item on-hand quantities plus the most recent ship-out date. */
  @Query("""
      SELECT ps.itemSq AS itemSq,
             COALESCE(SUM(ps.currentQtyM), 0) AS stockM,
             COALESCE(SUM(ps.currentQtyEa), 0) AS stockEa,
             MAX(ps.lastOutDate) AS lastOut
      FROM ProductStock ps
      GROUP BY ps.itemSq
      """)
  List<StockPerItem> aggregateStockForTurnover();

  /** KPI: grand total of current stock (m). */
  @Query("SELECT COALESCE(SUM(ps.currentQtyM), 0) FROM ProductStock ps")
  Double sumAllCurrentQtyM();

  /** Tablet stock-take targets: any active item with positive remaining EA or m, filtered DB-side. */
  @Query("""
      SELECT ps FROM ProductStock ps
      WHERE (
              (ps.currentQtyEa IS NOT NULL AND ps.currentQtyEa > 0)
           OR (ps.currentQtyM IS NOT NULL AND ps.currentQtyM > 0)
            )
        AND EXISTS (SELECT 1 FROM Item it WHERE it.itemSq = ps.itemSq AND it.useYn = true)
      ORDER BY ps.itemSq ASC, ps.lotNo ASC
      """)
  List<ProductStock> findAuditTargets();

  interface StockPerItem {
    Long getItemSq();
    Double getStockM();
    Long getStockEa();
    java.time.LocalDate getLastOut();
  }
}
