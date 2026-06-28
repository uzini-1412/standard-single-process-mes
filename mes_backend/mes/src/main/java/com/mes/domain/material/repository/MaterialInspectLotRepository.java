package com.mes.domain.material.repository;

import com.mes.domain.material.entity.MaterialInspectLot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

/**
 * 합격 가입고를 포장 단위로 분할한 자식 LOT(mes_material_inspect_lot_tb) 저장소.
 *
 * <p>입고현황 화면의 펼침 표시는 여러 가입고의 자식 LOT 을 한 번에 모아 보여 주므로
 * 단건 조회와 다건 일괄 조회를 모두 둔다.
 */
@Repository
public interface MaterialInspectLotRepository extends JpaRepository<MaterialInspectLot, Long> {

  /** 단일 가입고의 자식 LOT 을 분할 순번 오름차순으로 가져온다. */
  List<MaterialInspectLot> findByInboundSqOrderByLotSeqAsc(Long inboundSq);

  /**
   * 입고현황 펼침용 — 여러 가입고의 자식 LOT 을 한 번에 조회한다.
   * 가입고 단위로 모은 뒤 분할 순번 순으로 정렬해 돌려준다.
   */
  @Query("SELECT lot FROM MaterialInspectLot lot "
      + "WHERE lot.inboundSq IN :inboundSqs "
      + "ORDER BY lot.inboundSq, lot.lotSeq")
  List<MaterialInspectLot> findByInboundSqIn(@Param("inboundSqs") Collection<Long> inboundSqs);

  /** 판정 재저장 직전, 해당 가입고에 딸린 자식 LOT 을 일괄 삭제한다. */
  @Modifying
  @Query("DELETE FROM MaterialInspectLot lot WHERE lot.inboundSq = :inboundSq")
  void deleteByInboundSq(@Param("inboundSq") Long inboundSq);
}
