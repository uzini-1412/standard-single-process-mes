package com.mes.domain.production.repository;

import com.mes.domain.production.entity.Downtime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 비가동(설비 정지) 기록 접근 계층.
 *
 * <p>비가동 행은 항상 특정 작업지시에 종속되므로, 조회 진입점은 작업지시 PK 한 가지로 충분하다.
 */
@Repository
public interface DowntimeRepository extends JpaRepository<Downtime, Long> {

  /** 지정한 작업지시(workOrderSq)에 속한 비가동 행 전체. */
  @Query("""
      select down
        from Downtime down
       where down.workOrderSq = :orderSq
      """)
  List<Downtime> findByWorkOrderSq(@Param("orderSq") Long workOrderSq);
}
