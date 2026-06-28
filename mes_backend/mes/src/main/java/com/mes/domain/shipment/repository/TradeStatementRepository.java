package com.mes.domain.shipment.repository;

import com.mes.domain.shipment.entity.TradeStatement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * 거래명세표 헤더용 JPA 저장소.
 *
 * 출하성적서와 동일한 2단계 조회 규칙을 따른다 — 우선 발행 출처
 * (sourceType + sourceKey)로 조회하고, 비어 있으면 출하지시 PK(shipOrderSq)로 폴백한다.
 */
@Repository
public interface TradeStatementRepository extends JpaRepository<TradeStatement, Long> {

  // 폴백 경로 — 출하지시 식별자로 단건을 조회한다.
  @Query("select ts from TradeStatement ts where ts.shipOrderSq = :shipOrderSq")
  Optional<TradeStatement> findByShipOrderSq(@Param("shipOrderSq") Long shipOrderSq);

  // 기본 경로 — 발행 출처(타입 + 키)로 단건을 조회한다.
  @Query("select ts from TradeStatement ts where ts.sourceType = :type and ts.sourceKey = :key")
  Optional<TradeStatement> findBySourceTypeAndSourceKey(
      @Param("type") String sourceType, @Param("key") String sourceKey);
}
