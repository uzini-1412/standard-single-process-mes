package com.mes.domain.production.repository;

import com.mes.domain.production.entity.WorkOrderDetail;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 작업지시 상세(WorkOrderDetail, LOT 한 건 = 한 행) 접근 계층.
 *
 * <p>제공 기능은 (1) LOT 존재 확인, (2) LOT 단건/다건 조회, (3) 월 단위 채번을 위한
 * prefix 매칭 카운트다.
 */
@Repository
public interface ProductionWorkOrderDetailRepository extends JpaRepository<WorkOrderDetail, Long> {

  /** 해당 LOT 번호가 이미 존재하는지. */
  boolean existsByLotNo(String lotNo);

  /** LOT 번호로 단건 조회. */
  Optional<WorkOrderDetail> findByLotNo(String lotNo);

  /** LOT 번호 묶음을 조회하되 상위 작업지시까지 함께 로딩해 N+1 을 막는다. */
  @EntityGraph(attributePaths = "workOrder")
  List<WorkOrderDetail> findByLotNoIn(List<String> lotNos);

  /**
   * 지정 prefix 로 시작하는 LOT 의 개수.
   * 월별 채번에서 "(연-월 prefix) 다음 일련번호"를 정할 때 현재까지 발급된 수를 센다.
   */
  @Query("""
      select count(d)
        from WorkOrderDetail d
       where d.lotNo like concat(:prefix, '%')
      """)
  long countByLotPrefix(@Param("prefix") String prefix);
}
