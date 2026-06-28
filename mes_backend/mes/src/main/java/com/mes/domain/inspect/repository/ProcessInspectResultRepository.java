package com.mes.domain.inspect.repository;

import com.mes.domain.inspect.entity.ProcessInspectResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * 공정(자주)검사 결과 JPA 저장소.
 *
 * <p>단일 작업지시 조회, 여러 작업지시를 한 번에 묶어 가져오는 IN 조회, 그리고 초/종품을
 * 이어서 기록할 때 기존 행을 집어내기 위한 복합키 단건 조회를 제공한다.
 */
@Repository
public interface ProcessInspectResultRepository extends JpaRepository<ProcessInspectResult, Long> {

  /** 작업지시 한 건에 속한 검사결과 전부를 가져온다. */
  List<ProcessInspectResult> findByWorkOrderSq(Long workOrderSq);

  /**
   * 작업지시 여러 건을 IN 절로 묶어 한 번의 질의로 결과를 끌어온다.
   * 전체를 {@code findAll()} 한 뒤 메모리에서 그룹핑하던 방식을 대신한다.
   */
  List<ProcessInspectResult> findByWorkOrderSqIn(Collection<Long> workOrderSqs);

  /**
   * (작업지시, 검사항목) 복합키로 결과 한 건을 조회한다.
   * 초품을 먼저 남긴 뒤 같은 항목에 종품 값을 덧쓸 때 대상 행을 찾는다.
   */
  Optional<ProcessInspectResult> findByWorkOrderSqAndItemDtlSq(Long workOrderSq, Long itemDtlSq);
}
