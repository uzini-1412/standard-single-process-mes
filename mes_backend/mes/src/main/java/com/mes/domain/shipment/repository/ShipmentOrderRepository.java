package com.mes.domain.shipment.repository;

import com.mes.domain.shipment.entity.ShipmentOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ShipmentOrderRepository extends JpaRepository<ShipmentOrder, Long> {

  /*
   * 출하예정일 범위로 출하지시 헤더를 가져온다.
   *
   * 동작 요점:
   *   • dateFrom/dateTo 중 null 인 쪽은 비교에서 빠진다 → 둘 다 null 이면 사실상 전체 조회.
   *   • 평탄화 변환 시 자식(details) 접근으로 인한 N+1 을 피하려 fetch join 을 건다.
   *   • fetch join 으로 늘어난 중복 헤더 행은 distinct 로 접는다.
   */
  @Query("""
      select distinct ord
        from ShipmentOrder ord
        left join fetch ord.details
       where (:dateFrom is null or ord.expectedShipDate >= :dateFrom)
         and (:dateTo   is null or ord.expectedShipDate <= :dateTo)
       order by ord.expectedShipDate asc, ord.shipOrderSq desc
      """)
  List<ShipmentOrder> findBySearchCondition(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo);
}
