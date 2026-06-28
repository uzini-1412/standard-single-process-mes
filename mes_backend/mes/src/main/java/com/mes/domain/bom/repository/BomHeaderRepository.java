package com.mes.domain.bom.repository;

import com.mes.domain.bom.entity.BomHeader;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BomHeaderRepository extends JpaRepository<BomHeader, Long> {

  // 제품당 BOM 1건 (UNIQUE product_item_sq)
  Optional<BomHeader> findByProductItemSq(Long productItemSq);

  boolean existsByProductItemSq(Long productItemSq);

  // BOM 번호 자동생성용: 특정 prefix 로 시작하는 가장 큰 BOM 번호
  @Query("SELECT MAX(h.bomNo) FROM BomHeader h WHERE h.bomNo LIKE :prefix%")
  Optional<String> findMaxBomNoByPrefix(@Param("prefix") String prefix);
}
