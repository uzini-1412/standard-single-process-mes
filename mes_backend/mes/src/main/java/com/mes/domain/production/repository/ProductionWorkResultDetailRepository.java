package com.mes.domain.production.repository;

import com.mes.domain.production.entity.WorkResultDetail;
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
 * 작업실적 상세(롤 단위) 접근 계층.
 *
 * <p>상세 행은 LOT/롤 한 개를 표현한다. 메서드는 크게 (a) LOT 키 단건/다건 조회,
 * (b) 마스터 PK 기준 일괄 로딩, (c) 기간 검색, (d) 대시보드 raw 추출로 나뉜다.
 * 마스터(WorkResult)는 별칭 {@code res}, 상세는 {@code det}, 품목은 {@code itm}로 둔다.
 */
@Repository
public interface ProductionWorkResultDetailRepository extends JpaRepository<WorkResultDetail, Long> {

  /* ----- (a) LOT 키 기반 조회 ------------------------------------------------ */

  /** 단일 LOT 번호로 첫 상세 한 건. findAll() 뒤 메모리 필터를 대신한다. */
  Optional<WorkResultDetail> findFirstByLotNo(String lotNo);

  /** LOT 번호 묶음 일괄 — 추적 엑셀에서 연계 행을 한 번에 끌어올 때. 마스터를 함께 fetch. */
  @Query("""
      select det
        from WorkResultDetail det
        join fetch det.workResult res
       where det.lotNo in :lotNos
      """)
  List<WorkResultDetail> findByLotNoIn(@Param("lotNos") Collection<String> lotNos);

  /* ----- (b) 마스터 PK 기준 일괄 로딩 (N+1 회피) ---------------------------- */

  /**
   * 마스터 resultSq 묶음으로 상세를 한 번에 읽는다.
   * 목록 매핑에서 details 를 lazy 로 건드릴 때 생기는 N+1 을 없애려는 용도라
   * 호출 측이 resultSq 로 다시 그룹핑한다.
   */
  @Query("""
      select det
        from WorkResultDetail det
        join det.workResult res
       where res.resultSq in :resultSqs
      """)
  List<WorkResultDetail> findByWorkResultResultSqIn(@Param("resultSqs") Collection<Long> resultSqs);

  /** 단일 품목의 모든 상세 (구매LOT→제조LOT 연계 추적용). 추가순 역순으로 내려준다. */
  @Query("""
      select det
        from WorkResultDetail det
        join fetch det.workResult res
       where res.itemSq = :itemSq
       order by res.workDate desc, det.resultDtlSq desc
      """)
  List<WorkResultDetail> findByWorkResultItemSq(@Param("itemSq") Long itemSq);

  /** 여러 품목 동시 (추적 리스트의 linkedLot 채우기). 정렬은 단일 품목판과 동일. */
  @Query("""
      select det
        from WorkResultDetail det
        join fetch det.workResult res
       where res.itemSq in :itemSqs
       order by res.workDate desc, det.resultDtlSq desc
      """)
  List<WorkResultDetail> findByWorkResultItemSqIn(@Param("itemSqs") List<Long> itemSqs);

  /* ----- (c) 기간 검색 (불량/전체/페이징) ----------------------------------- */

  /**
   * 완제품 중량 현황 — 기간/라인에 걸리는 전체 상세.
   * dateFrom·dateTo 는 한쪽만 채워도 반대쪽은 무시(IS NULL)된다.
   */
  @Query("""
      select det
        from WorkResultDetail det
        join det.workResult res
       where (:dateFrom is null or res.workDate >= :dateFrom)
         and (:dateTo   is null or res.workDate <= :dateTo)
         and (:lineSq   is null or res.lineSq = :lineSq)
       order by res.workDate desc
      """)
  List<WorkResultDetail> findResults(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo,
      @Param("lineSq") Long lineSq);

  /** 불량(NG) 상세만 — findResults 와 같은 기간/라인 필터에 judgeCode='NG' 한 줄을 더했다. */
  @Query("""
      select det
        from WorkResultDetail det
        join det.workResult res
       where (:dateFrom is null or res.workDate >= :dateFrom)
         and (:dateTo   is null or res.workDate <= :dateTo)
         and (:lineSq   is null or res.lineSq = :lineSq)
         and det.judgeCode = 'NG'
       order by res.workDate desc
      """)
  List<WorkResultDetail> findDefects(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo,
      @Param("lineSq") Long lineSq);

  /** LOT 추적 검색 페이징 — 기간 + lotNo 부분 일치(대소문자 무시). 정렬·페이징은 Pageable 로. */
  @Query("""
      select det
        from WorkResultDetail det
        join det.workResult res
       where (:dateFrom is null or res.workDate >= :dateFrom)
         and (:dateTo   is null or res.workDate <= :dateTo)
         and (:keyword  is null or lower(det.lotNo) like lower(concat('%', :keyword, '%')))
       order by res.workDate desc, det.resultDtlSq desc
      """)
  Page<WorkResultDetail> findForLotTracePaged(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo,
      @Param("keyword") String keyword,
      Pageable pageable);

  /* ----- (d) 대시보드 raw 추출 / 집계 --------------------------------------- */

  /** 품목+기간의 양품 생산길이 합계(재고 통계). NG 는 제외, 합계가 없으면 0. */
  @Query("""
      select coalesce(sum(det.prodLength), 0)
        from WorkResultDetail det
        join det.workResult res
       where res.itemSq = :itemSq
         and res.workDate between :dateFrom and :dateTo
         and (det.judgeCode is null or det.judgeCode <> 'NG')
      """)
  Double sumGoodProdLengthByItemAndDateRange(
      @Param("itemSq") Long itemSq,
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo);

  /**
   * 중량편차 분석 raw 행.
   * 기준 평량은 품목 마스터(itm.basisWeight, 생산일보 "평량"), 관리중량은 LOT 실측(det.realBasisWeight).
   * 정렬 키로 쓰는 workDate/rollNo/resultDtlSq 까지 함께 투영한다("최근 N롤" / "추가순").
   * 평량이 없거나 0 인 품목은 편차 계산 불가라 미리 제외한다.
   */
  @Query("""
      select res.lineName        as lineName,
             month(res.workDate) as month,
             res.workDate        as workDate,
             itm.itemCode        as itemCode,
             itm.itemName        as itemName,
             itm.basisWeight     as basisWeight,
             det.realBasisWeight as realBasisWeight,
             det.lotNo           as lotNo,
             det.rollNo          as rollNo,
             det.resultDtlSq     as resultDtlSq
        from WorkResultDetail det
        join det.workResult res
        join com.mes.domain.item.entity.Item itm on itm.itemSq = res.itemSq
       where res.workDate between :dateFrom and :dateTo
         and det.realBasisWeight is not null
         and itm.basisWeight is not null
         and itm.basisWeight > 0
      """)
  List<WeightDevRow> findWeightDeviationRows(
      @Param("dateFrom") LocalDate dateFrom,
      @Param("dateTo") LocalDate dateTo);

  interface WeightDevRow {
    String getLineName();
    Integer getMonth();
    LocalDate getWorkDate();
    String getItemCode();
    String getItemName();
    Double getBasisWeight();         // 품목 마스터 평량 (기준)
    Double getRealBasisWeight();     // LOT 실측 관리중량
    String getLotNo();
    Integer getRollNo();
    Long getResultDtlSq();           // 추가순 정렬 키 (PK 오름차순 = 추가순)
  }
}
