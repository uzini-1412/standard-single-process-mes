package com.mes.domain.stock.repository;

import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.mes.domain.stock.entity.MaterialStock;

@Repository
public interface MaterialStockRepository extends JpaRepository<MaterialStock, Long> {

  /** Resolve a single stock row from its item + LOT pair (inbound lookups). */
  Optional<MaterialStock> findByItemSqAndLotNo(Long itemSq, String lotNo);

  // ── 비관락(PESSIMISTIC_WRITE) 조회 ──
  // 작업완료 차감/예약확정/입고검사 합격 등 "읽고-수정-저장" 경로에서 동시 갱신(lost update)·과차감을
  // 막기 위해 행 잠금을 잡고 읽는다. 반드시 트랜잭션 안에서 호출해야 한다.

  /** 단일 재고행을 PK(stockSq)로 잠그고 읽는다 (예약확정 차감). */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT ms FROM MaterialStock ms WHERE ms.stockSq = :stockSq")
  Optional<MaterialStock> findByStockSqForUpdate(@Param("stockSq") Long stockSq);

  /** (품목 + LOT) 재고행을 잠그고 읽는다 (예약해제 / 입고검사 합격 가산 / NCR 역분개). */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT ms FROM MaterialStock ms WHERE ms.itemSq = :itemSq AND ms.lotNo = :lotNo")
  Optional<MaterialStock> findByItemSqAndLotNoForUpdate(@Param("itemSq") Long itemSq,
      @Param("lotNo") String lotNo);

  /** 한 품목의 잔량(>0) 재고행들을 잠그고 읽는다 (PLC 자동 FIFO 차감). 정렬은 호출 측에서 처리. */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT ms FROM MaterialStock ms WHERE ms.itemSq = :itemSq AND ms.currentQty > 0")
  List<MaterialStock> findByItemSqWithStockForUpdate(@Param("itemSq") Long itemSq);

  /** Tablet stock-take targets: still-positive remaining qty on active items, filtered in the DB. */
  @Query("""
      SELECT ms FROM MaterialStock ms
      WHERE ms.currentQty > 0
        AND EXISTS (SELECT 1 FROM Item it WHERE it.itemSq = ms.itemSq AND it.useYn = true)
      ORDER BY ms.itemSq ASC, ms.lotNo ASC
      """)
  List<MaterialStock> findAuditTargets();

  /**
   * Stock-status list with optional item-code / item-name filters. The filterable
   * columns belong to Item, so we join to it explicitly instead of using a derived query.
   */
  @Query("""
      SELECT ms FROM MaterialStock ms
      JOIN Item it ON it.itemSq = ms.itemSq
      WHERE (:itemCode IS NULL OR it.itemCode LIKE CONCAT('%', :itemCode, '%'))
        AND (:itemName IS NULL OR it.itemName LIKE CONCAT('%', :itemName, '%'))
      ORDER BY ms.itemSq ASC, ms.lotNo ASC
      """)
  List<MaterialStock> findBySearchCondition(@Param("itemCode") String itemCode,
      @Param("itemName") String itemName);
}
