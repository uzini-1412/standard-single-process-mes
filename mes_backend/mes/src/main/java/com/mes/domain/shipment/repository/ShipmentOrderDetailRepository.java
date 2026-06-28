package com.mes.domain.shipment.repository;

import com.mes.domain.shipment.entity.ShipmentOrderDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface ShipmentOrderDetailRepository extends JpaRepository<ShipmentOrderDetail, Long> {

  // ===== 메서드명 파생 쿼리 =====

  // 출하계획(planSq) 한 건에서 파생된 지시 상세
  List<ShipmentOrderDetail> findByPlanSq(Long planSq);

  // 여러 출하계획을 한 번에 — 호출부 N+1 방지
  List<ShipmentOrderDetail> findByPlanSqIn(Collection<Long> planSqs);

  // 출하지시 헤더(shipOrderSq) 1건에 딸린 상세 전체
  List<ShipmentOrderDetail> findByShipmentOrder_ShipOrderSq(Long shipOrderSq);

  // ===== fetch join (헤더 동반 적재) =====

  // 상세 PK 묶음으로 조회하면서 부모 헤더까지 같이 끌어온다
  @Query("""
      select d
        from ShipmentOrderDetail d
        left join fetch d.shipmentOrder
       where d.shipDtlSq in :ids
      """)
  List<ShipmentOrderDetail> findAllByIdWithOrder(@Param("ids") List<Long> ids);

  // 출하검사 대상 = 미출하(WAIT/null) 이면서 아직 검사 이력이 없는 상세. 헤더를 fetch 한다.
  @Query("""
      select d
        from ShipmentOrderDetail d
        left join fetch d.shipmentOrder h
       where (d.shipStatus is null or d.shipStatus = 'WAIT')
         and d.shipDtlSq not in (
             select ins.shipDtlSq from ShipmentInspect ins where ins.shipDtlSq is not null)
       order by h.expectedShipDate desc, d.shipDtlSq desc
      """)
  List<ShipmentOrderDetail> findInspectionTargets();

  // ===== 수량 합계 (계획 기준) =====

  // 단일 출하계획 기준 지시 수량 합계
  @Query("select coalesce(sum(d.orderQty), 0) from ShipmentOrderDetail d where d.planSq = :planSq")
  Double sumOrderQtyByPlanSq(@Param("planSq") Long planSq);

  // 출하계획별 지시 수량 합계를 한 방에 (N+1 방지)
  @Query("""
      select d.planSq, coalesce(sum(d.orderQty), 0)
        from ShipmentOrderDetail d
       where d.planSq in :planSqs
       group by d.planSq
      """)
  List<Object[]> sumOrderQtyByPlanSqIn(@Param("planSqs") Collection<Long> planSqs);

  // ===== 예약 수량 (수주/LOT 기준, NG 제외) =====

  /*
   * 수주상세(salesOrderDtlSq) 단위 누적 출하지시량 (WAIT/SHIPPED 포함).
   * 수주잔여 = 수주수량 − 본 합계. 단, 출하검사 NG 는 출하될 수 없으므로 예약에서 제외해
   * 그만큼 수주잔여로 되돌린다. ShipmentPlan 과는 inner join 으로 묶는다.
   */
  @Query("""
      select p.salesOrderDtlSq, coalesce(sum(d.orderQty), 0)
        from ShipmentOrderDetail d
        join ShipmentPlan p on p.planSq = d.planSq
       where p.salesOrderDtlSq = :salesOrderDtlSq
         and not exists (
             select 1 from ShipmentInspect ins
              where ins.shipDtlSq = d.shipDtlSq
                and ins.judgeCode = com.mes.domain.quality.entity.InspectionResult.NG)
       group by p.salesOrderDtlSq
      """)
  List<Object[]> sumOrderQtyBySalesOrderDtlSq(@Param("salesOrderDtlSq") Long salesOrderDtlSq);

  // 위와 같은 산식을 수주상세 여러 건에 대해 일괄 처리 (NG 제외)
  @Query("""
      select p.salesOrderDtlSq, coalesce(sum(d.orderQty), 0)
        from ShipmentOrderDetail d
        join ShipmentPlan p on p.planSq = d.planSq
       where p.salesOrderDtlSq in :sodSqs
         and not exists (
             select 1 from ShipmentInspect ins
              where ins.shipDtlSq = d.shipDtlSq
                and ins.judgeCode = com.mes.domain.quality.entity.InspectionResult.NG)
       group by p.salesOrderDtlSq
      """)
  List<Object[]> sumOrderQtyBySalesOrderDtlSqIn(@Param("sodSqs") Collection<Long> sodSqs);

  /*
   * LOT 별 예약(미출하 지시) 수량. 현재고에서 빼면 가용수량이 된다.
   * WAIT 이거나 상태가 비어 있는 건만 합산하고, NG 검사 건은 예약을 풀어 합산에서 뺀다.
   */
  @Query("""
      select d.productLotNo, coalesce(sum(d.orderQty), 0)
        from ShipmentOrderDetail d
       where d.productLotNo in :lotNos
         and (d.shipStatus is null or d.shipStatus = 'WAIT')
         and not exists (
             select 1 from ShipmentInspect ins
              where ins.shipDtlSq = d.shipDtlSq
                and ins.judgeCode = com.mes.domain.quality.entity.InspectionResult.NG)
       group by d.productLotNo
      """)
  List<Object[]> sumReservedQtyByLotNoIn(@Param("lotNos") Collection<String> lotNos);
}
