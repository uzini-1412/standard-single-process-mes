package com.mes.domain.shipment.repository;

import com.mes.domain.shipment.entity.ShipmentReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * 출하성적서 헤더용 JPA 저장소.
 *
 * 조회 전략은 두 단계다. 화면은 먼저 발행 출처 키(sourceType + sourceKey)로 찾고,
 * 그래도 없으면 출하지시 식별자(shipOrderSq)로 한 번 더 시도한다.
 */
@Repository
public interface ShipmentReportRepository extends JpaRepository<ShipmentReport, Long> {

  // 폴백 경로 — 출하지시 PK 로 단건을 끌어온다.
  @Query("select rpt from ShipmentReport rpt where rpt.shipOrderSq = :shipOrderSq")
  Optional<ShipmentReport> findByShipOrderSq(@Param("shipOrderSq") Long shipOrderSq);

  // 기본 경로 — 발행 출처(타입 + 키) 조합으로 단건을 찾는다.
  @Query("select rpt from ShipmentReport rpt where rpt.sourceType = :type and rpt.sourceKey = :key")
  Optional<ShipmentReport> findBySourceTypeAndSourceKey(
      @Param("type") String sourceType, @Param("key") String sourceKey);
}
