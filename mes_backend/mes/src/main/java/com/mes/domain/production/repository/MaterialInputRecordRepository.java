package com.mes.domain.production.repository;

import com.mes.domain.production.entity.MaterialInputRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

/**
 * 자재 투입 기록 접근 계층.
 *
 * <p>투입 행은 어느 작업지시(workOrderSq)에 어떤 재고(materialStockSq)를 어떤 구매
 * LOT(purchaseLotNo)로 넣었는지를 담는다. 위 세 키를 조합한 명시적 JPQL 조회만 노출한다.
 */
@Repository
public interface MaterialInputRecordRepository extends JpaRepository<MaterialInputRecord, Long> {

  /** 구매 LOT 번호 묶음에 걸리는 투입 행 전체 — LOT 추적 엑셀이 자재투입 연계를 한 번에 끌어올 때. */
  @Query("""
      select mir
        from MaterialInputRecord mir
       where mir.purchaseLotNo in :lots
      """)
  List<MaterialInputRecord> findByPurchaseLotNoIn(@Param("lots") Collection<String> purchaseLotNos);

  /** 한 작업지시에 속한 투입 행 전부(상태 무관). */
  @Query("""
      select mir
        from MaterialInputRecord mir
       where mir.workOrderSq = :orderSq
      """)
  List<MaterialInputRecord> findByWorkOrderSq(@Param("orderSq") Long workOrderSq);

  /** 작업지시 + 투입 상태(RESERVED / PLC_AUTO 등)로 좁힌 행. */
  @Query("""
      select mir
        from MaterialInputRecord mir
       where mir.inputStatus = :status
         and mir.workOrderSq = :orderSq
      """)
  List<MaterialInputRecord> findByWorkOrderSqAndInputStatus(
      @Param("orderSq") Long workOrderSq,
      @Param("status") String inputStatus);

  /** 특정 재고(PK) + 투입 상태 조합. */
  @Query("""
      select mir
        from MaterialInputRecord mir
       where mir.inputStatus = :status
         and mir.materialStockSq = :stockSq
      """)
  List<MaterialInputRecord> findByMaterialStockSqAndInputStatus(
      @Param("stockSq") Long materialStockSq,
      @Param("status") String inputStatus);
}
