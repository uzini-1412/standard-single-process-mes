package com.mes.domain.material.repository;

import com.mes.domain.material.entity.InboundInspectResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

/**
 * 가입고 수입검사의 항목별 측정 결과(mes_inbound_inspect_result_tb) 접근 계층.
 *
 * <p>판정을 다시 저장할 때는 기존 행을 통째로 지우고 새로 넣는 방식을 쓰므로
 * 단건 조회·삭제와 다건 일괄 조회를 함께 제공한다.
 */
@Repository
public interface InboundInspectResultRepository extends JpaRepository<InboundInspectResult, Long> {

  /** 검사 상세 화면용 — 가입고 한 건의 항목별 결과를 모두 가져온다. */
  List<InboundInspectResult> findByInboundSq(Long inboundSq);

  /**
   * 자재불량현황 페이징에서 여러 가입고의 NG 시료 수를 한 번에 끌어오는 일괄 조회.
   * 행마다 따로 질의하던 N+1 을 막기 위한 것이다.
   */
  List<InboundInspectResult> findByInboundSqIn(Collection<Long> inboundSqs);

  /** 재검사/재판정에 앞서 해당 가입고의 기존 결과 행을 전부 삭제한다. */
  void deleteByInboundSq(Long inboundSq);
}
