package com.mes.domain.shipment.repository;

import com.mes.domain.shipment.entity.ShipmentPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ShipmentPlanRepository extends JpaRepository<ShipmentPlan, Long> {

  // ===== 합계/집계 쿼리 =====

  // 재고 통계용: 같은 품번을 기간 안에서 모두 더한 출하계획 수량.
  @Query("""
      select coalesce(sum(sp.planQty), 0)
        from ShipmentPlan sp
       where sp.itemCode = :itemCode
         and sp.expectedShipDate between :dateFrom and :dateTo
      """)
  Double sumPlanQtyByItemCodeAndDateRange(
      @Param("itemCode") String itemCode,
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo);

  // 수주 잔량 계산용: 수주상세 한 건에 묶인 출하계획 수량의 합.
  @Query("select coalesce(sum(sp.planQty), 0) from ShipmentPlan sp where sp.salesOrderDtlSq = :salesOrderDtlSq")
  Double sumPlanQtyBySalesOrderDtlSq(@Param("salesOrderDtlSq") Long salesOrderDtlSq);

  // 대시보드용: 월별로 묶어 출하계획 수량을 합산한다. 그룹핑은 DB 가 처리.
  @Query("""
      select month(sp.expectedShipDate) as month, coalesce(sum(sp.planQty), 0) as qty
        from ShipmentPlan sp
       where sp.expectedShipDate between :dateFrom and :dateTo
       group by month(sp.expectedShipDate)
      """)
  List<MonthlySum> sumPlanQtyGroupByMonth(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo);

  // ===== 목록/단건/채번 =====

  /*
   * 출하예정일 범위로 출하계획 목록을 조회한다.
   * 범위 경계 중 null 인 쪽은 조건에서 제외되므로, 둘 다 null 이면 전체가 조회된다.
   */
  @Query("""
      select sp
        from ShipmentPlan sp
       where (:dateFrom is null or sp.expectedShipDate >= :dateFrom)
         and (:dateTo   is null or sp.expectedShipDate <= :dateTo)
       order by sp.expectedShipDate asc, sp.planSq desc
      """)
  List<ShipmentPlan> findBySearchCondition(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo);

  // 채번용: prefix(연월)로 시작하는 lotNo 들을 역순 정렬해, 맨 앞 행이 현재 최대 lotNo 가 되게 한다.
  @Query("""
      select sp.lotNo
        from ShipmentPlan sp
       where sp.lotNo like concat(:prefix, '%')
       order by sp.lotNo desc
      """)
  List<String> findTopLotNoByPrefix(@Param("prefix") String prefix);

  // LOT 추적용: lotNo 로 첫 일치 계획 1건을 가져온다(findAll 후 필터링을 대신함).
  Optional<ShipmentPlan> findFirstByLotNo(String lotNo);

  interface MonthlySum {
    Integer getMonth();
    Double getQty();
  }
}
