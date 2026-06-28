package com.mes.domain.bom.repository;

import com.mes.domain.bom.dto.BomDto;
import com.mes.domain.bom.entity.BomLine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface BomLineRepository extends JpaRepository<BomLine, Long> {

  List<BomLine> findByBomSqOrderBySeqAscBomLineSqAsc(Long bomSq);

  void deleteByBomSq(Long bomSq);

  // BOM 조회: 헤더+라인+품목(제품 p / 구성품 m) join → DTO 직접 반환
  @Query("SELECT new com.mes.domain.bom.dto.BomDto$Res( " +
      "  h.bomSq, h.bomNo, h.productItemSq, p.itemCode, p.itemName, " +
      "  l.bomLineSq, l.componentItemSq, m.itemCode, m.itemName, m.spec, " +
      "  l.quantity, l.unit, l.seq, " +
      "  l.ratio, l.basisWeight, l.plcMachineNo, l.materialType, l.remark, h.useYn " +
      ") " +
      "FROM BomLine l " +
      "JOIN BomHeader h ON l.bomSq = h.bomSq " +
      "JOIN Item m ON l.componentItemSq = m.itemSq " +
      "JOIN Item p ON h.productItemSq = p.itemSq " +
      "WHERE (:productItemSq IS NULL OR h.productItemSq = :productItemSq) " +
      "ORDER BY h.productItemSq ASC, l.seq ASC, l.bomLineSq ASC")
  List<BomDto.Res> findBomByProduct(@Param("productItemSq") Long productItemSq);

  boolean existsByBomSqAndComponentItemSq(Long bomSq, Long componentItemSq);

  // PLC 자동차감용: 제품 PK 다수 → 사용중인 BOM 라인의 (제품/구성품/PLC호기) 매핑 일괄 조회.
  @Query("SELECT h.productItemSq AS productItemSq, l.componentItemSq AS componentItemSq, " +
      "       l.plcMachineNo AS plcMachineNo " +
      "FROM BomLine l JOIN BomHeader h ON l.bomSq = h.bomSq " +
      "WHERE h.productItemSq IN :productItemSqs AND (h.useYn IS NULL OR h.useYn = true)")
  List<PlcMapping> findPlcMappingByProductItemSqs(@Param("productItemSqs") Collection<Long> productItemSqs);

  // PLC 호기 ↔ 구성품 매핑 projection (제품별 그룹핑 가능)
  interface PlcMapping {
    Long getProductItemSq();
    Long getComponentItemSq();
    String getPlcMachineNo();
  }
}
