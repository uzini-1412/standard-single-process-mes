package com.mes.domain.stock.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.mes.domain.stock.entity.InventoryAudit;

public interface InventoryAuditRepository extends JpaRepository<InventoryAudit, Long> {

  /**
   * Adjustment-history view: only counts already pushed into stock (appliedYn = 'Y').
   * itemCode / itemName are optional partial-match filters — blank or null means "all".
   */
  @Query("""
      SELECT au FROM InventoryAudit au
      WHERE au.appliedYn = 'Y'
        AND (COALESCE(:itemCode, '') = '' OR LOWER(au.itemCode) LIKE LOWER(CONCAT('%', :itemCode, '%')))
        AND (COALESCE(:itemName, '') = '' OR LOWER(au.itemName) LIKE LOWER(CONCAT('%', :itemName, '%')))
      ORDER BY au.appliedDt DESC, au.auditSq DESC
      """)
  List<InventoryAudit> findAllApplied(@Param("itemCode") String itemCode,
                                      @Param("itemName") String itemName);

  /**
   * Pending candidates for a manual stock adjustment: rows whose measured and system
   * quantities disagree (diffQty present and non-zero) and that are not yet applied.
   */
  @Query("""
      SELECT au FROM InventoryAudit au
      WHERE au.diffQty IS NOT NULL
        AND au.diffQty <> 0
        AND (au.appliedYn IS NULL OR au.appliedYn <> 'Y')
      ORDER BY au.regDt DESC, au.auditSq DESC
      """)
  List<InventoryAudit> findAllWithDiff();

  /** Audits whose reg time falls in [start, end) — used for the today 00:00..tomorrow 00:00 window. */
  @Query("""
      SELECT au FROM InventoryAudit au
      WHERE au.regDt >= :start
        AND au.regDt < :end
      ORDER BY au.regDt DESC, au.auditSq DESC
      """)
  List<InventoryAudit> findByRegDtRange(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}
