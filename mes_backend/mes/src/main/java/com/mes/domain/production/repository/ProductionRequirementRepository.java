package com.mes.domain.production.repository;

import com.mes.domain.production.entity.ProductionRequirement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * 자재 소요량(MRP 결과) 접근 계층.
 *
 * <p>현재 화면에서는 기준일 구간 조회 한 가지만 쓴다. 구간은 시작일·종료일을 모두
 * 포함하는 닫힌 구간이다.
 */
@Repository
public interface ProductionRequirementRepository extends JpaRepository<ProductionRequirement, Long> {

  /**
   * 기준일이 두 날짜 사이(양끝 포함)에 들어오는 소요량 행을 모두 반환한다.
   * 정렬 보장 없이 매칭 행만 돌려주며, 정렬은 호출 측 책임이다.
   */
  @Query("""
      select req
        from ProductionRequirement req
       where req.reqDate >= :from
         and req.reqDate <= :to
      """)
  List<ProductionRequirement> findByReqDateBetween(
      @Param("from") LocalDate from,
      @Param("to") LocalDate to);
}
