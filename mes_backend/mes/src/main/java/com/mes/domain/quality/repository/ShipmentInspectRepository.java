package com.mes.domain.quality.repository;

import com.mes.domain.quality.entity.ShipmentInspect;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * 출하검사 결과 영속 계층.
 */
@Repository
public interface ShipmentInspectRepository extends JpaRepository<ShipmentInspect, Long> {

  // ---- 단순 lookup ----

  /** 출하지시 상세 1건에 딸린 검사 이력. */
  List<ShipmentInspect> findByShipDtlSq(Long shipDtlSq);

  /** 여러 출하지시 상세를 한 번에 (목록 화면 검사 진행여부/판정 표기, N+1 회피). */
  List<ShipmentInspect> findByShipDtlSqIn(Collection<Long> shipDtlSqs);

  /** LOT 번호 단건 역추적. */
  List<ShipmentInspect> findByLotNo(String lotNo);

  /** LOT 번호 다건 일괄 (N+1 회피). */
  List<ShipmentInspect> findByLotNoIn(Collection<String> lotNos);

  /** 최신순 전체 — 하위호환 용도. */
  List<ShipmentInspect> findAllByOrderByInspectDateDescShipInspectSqDesc();

  // ---- 채번 ----

  /** 채번용: 지정 prefix로 시작하는 LOT 중 최댓값. */
  @Query("SELECT MAX(s.lotNo) FROM ShipmentInspect s WHERE s.lotNo LIKE CONCAT(:prefix, '%')")
  Optional<String> findMaxLotNo(@Param("prefix") String prefix);

  // ---- 검색 ----

  /** 검색 조건 전체조회(페이징 없음). 엑셀 export 등에 사용. */
  @Query("""
      SELECT s FROM ShipmentInspect s
      WHERE (:dateFrom IS NULL OR s.inspectDate >= :dateFrom)
        AND (:dateTo IS NULL OR s.inspectDate <= :dateTo)
        AND (:itemCode IS NULL OR LOWER(s.itemCode) LIKE LOWER(CONCAT('%', :itemCode, '%')))
        AND (:itemName IS NULL OR LOWER(s.itemName) LIKE LOWER(CONCAT('%', :itemName, '%')))
        AND (:lotNo IS NULL OR LOWER(s.lotNo) LIKE LOWER(CONCAT('%', :lotNo, '%')))
        AND (:keyword IS NULL OR LOWER(s.itemCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
                              OR LOWER(s.itemName) LIKE LOWER(CONCAT('%', :keyword, '%')))
      ORDER BY s.inspectDate DESC, s.shipInspectSq DESC
      """)
  List<ShipmentInspect> findBySearch(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo,
      @Param("itemCode") String itemCode,
      @Param("itemName") String itemName,
      @Param("lotNo") String lotNo,
      @Param("keyword") String keyword);

  /** 검색 조건 페이징 조회(출하검사 화면). Pageable.sort 반영. */
  @Query(value = """
      SELECT s FROM ShipmentInspect s
      WHERE (:dateFrom IS NULL OR s.inspectDate >= :dateFrom)
        AND (:dateTo IS NULL OR s.inspectDate <= :dateTo)
        AND (:itemCode IS NULL OR LOWER(s.itemCode) LIKE LOWER(CONCAT('%', :itemCode, '%')))
        AND (:itemName IS NULL OR LOWER(s.itemName) LIKE LOWER(CONCAT('%', :itemName, '%')))
        AND (:lotNo IS NULL OR LOWER(s.lotNo) LIKE LOWER(CONCAT('%', :lotNo, '%')))
        AND (:keyword IS NULL OR LOWER(s.itemCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
                              OR LOWER(s.itemName) LIKE LOWER(CONCAT('%', :keyword, '%')))
      """,
      countQuery = """
          SELECT COUNT(s) FROM ShipmentInspect s
          WHERE (:dateFrom IS NULL OR s.inspectDate >= :dateFrom)
            AND (:dateTo IS NULL OR s.inspectDate <= :dateTo)
            AND (:itemCode IS NULL OR LOWER(s.itemCode) LIKE LOWER(CONCAT('%', :itemCode, '%')))
            AND (:itemName IS NULL OR LOWER(s.itemName) LIKE LOWER(CONCAT('%', :itemName, '%')))
            AND (:lotNo IS NULL OR LOWER(s.lotNo) LIKE LOWER(CONCAT('%', :lotNo, '%')))
            AND (:keyword IS NULL OR LOWER(s.itemCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
                                  OR LOWER(s.itemName) LIKE LOWER(CONCAT('%', :keyword, '%')))
          """)
  Page<ShipmentInspect> findBySearchPaged(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo,
      @Param("itemCode") String itemCode,
      @Param("itemName") String itemName,
      @Param("lotNo") String lotNo,
      @Param("keyword") String keyword,
      Pageable pageable);

  /** 검색 조건에 걸리는 행들의 sampleCnt 최댓값 (화면 동적 컬럼 수 산정용). */
  @Query("""
      SELECT COALESCE(MAX(s.sampleCnt), 0) FROM ShipmentInspect s
      WHERE (:dateFrom IS NULL OR s.inspectDate >= :dateFrom)
        AND (:dateTo IS NULL OR s.inspectDate <= :dateTo)
        AND (:itemCode IS NULL OR LOWER(s.itemCode) LIKE LOWER(CONCAT('%', :itemCode, '%')))
        AND (:itemName IS NULL OR LOWER(s.itemName) LIKE LOWER(CONCAT('%', :itemName, '%')))
        AND (:lotNo IS NULL OR LOWER(s.lotNo) LIKE LOWER(CONCAT('%', :lotNo, '%')))
        AND (:keyword IS NULL OR LOWER(s.itemCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
                              OR LOWER(s.itemName) LIKE LOWER(CONCAT('%', :keyword, '%')))
      """)
  Integer findMaxSampleCntBySearch(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo,
      @Param("itemCode") String itemCode,
      @Param("itemName") String itemName,
      @Param("lotNo") String lotNo,
      @Param("keyword") String keyword);

  /**
   * 태블릿 제품출하 대기 목록 단일 쿼리.
   * 조건: 출하검사 판정 OK + 미출하(SHIPPED 아님) + 활성품목 + 출하계획 LOT 채워짐.
   * 전체 풀스캔 후 클라이언트 교집합 대신 DB에서 한 번에 거른다.
   */
  @Query("""
      SELECT s FROM ShipmentInspect s
      WHERE s.judgeCode = com.mes.domain.quality.entity.InspectionResult.OK
        AND s.shipDtlSq IN (
          SELECT d.shipDtlSq FROM ShipmentOrderDetail d
          WHERE d.shipStatus <> com.mes.domain.shipment.entity.ShipmentStatus.SHIPPED
            AND d.itemSq IN (SELECT i.itemSq FROM Item i WHERE i.useYn = true)
            AND d.planSq IN (SELECT p.planSq FROM ShipmentPlan p WHERE p.lotNo IS NOT NULL AND p.lotNo <> '')
        )
      ORDER BY s.inspectDate DESC, s.shipInspectSq DESC
      """)
  List<ShipmentInspect> findTabletShipPending();
}
