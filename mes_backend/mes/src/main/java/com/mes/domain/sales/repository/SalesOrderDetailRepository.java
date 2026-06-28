package com.mes.domain.sales.repository;

import com.mes.domain.sales.entity.SalesOrderDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 수주 품목(SalesOrderDetail) 저장소. 부모 SalesOrder 의 Cascade 로 영속화되며,
 * 매출현황 단가 fallback 시 findAllById 일괄 조회 용도로 사용된다.
 */
@Repository
public interface SalesOrderDetailRepository extends JpaRepository<SalesOrderDetail, Long> {
}
