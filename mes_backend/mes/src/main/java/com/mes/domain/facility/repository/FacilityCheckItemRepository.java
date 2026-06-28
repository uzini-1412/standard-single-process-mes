package com.mes.domain.facility.repository;

import com.mes.domain.facility.entity.FacilityCheckItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FacilityCheckItemRepository extends JpaRepository<FacilityCheckItem, Long> {

  /**
   * 활성 점검항목 검색. 특정 설비로 한정하거나(facilitySq) 항목명 일부로 거를 수 있으며
   * 두 조건 모두 null 허용이다. 같은 설비끼리 묶이도록 설비 PK 로 1차 정렬한 뒤,
   * 화면 노출 순서(sortOrder)로 2차 정렬한다.
   */
  @Query("""
      SELECT item
      FROM FacilityCheckItem item
      WHERE item.useYn = true
        AND (:facilitySq IS NULL OR item.facilitySq = :facilitySq)
        AND (:keyword IS NULL OR item.checkItemNm LIKE CONCAT('%', :keyword, '%'))
      ORDER BY item.facilitySq ASC, item.sortOrder ASC
      """)
  List<FacilityCheckItem> findBySearchCondition(
      @Param("facilitySq") Long facilitySq,
      @Param("keyword") String keyword);
}
