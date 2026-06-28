package com.mes.domain.inspect.repository;

import com.mes.domain.inspect.entity.InspectStandard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * 검사 기준서 헤더에 대한 JPA 저장소.
 *
 * <p>중복 등록 방지용 단건 조회, 다중 조건 목록 조회, 이미지 경로만 부분 갱신하는
 * 벌크 업데이트를 노출한다.
 */
@Repository
public interface InspectStandardRepository extends JpaRepository<InspectStandard, Long> {

  /**
   * 검사유형과 기준번호가 동시에 일치하는 기준서를 찾는다.
   * 같은 유형 안에서 기준번호가 겹치는지 확인할 때 쓴다.
   */
  Optional<InspectStandard> findByInspectTypeAndStdNo(String inspectType, String stdNo);

  /**
   * 검색 조건 네 가지(검사유형, 품목, 기준번호 키워드, 사용여부)를 모두 옵션으로 받는 목록 조회.
   *
   * <p>각 조건은 파라미터가 {@code null} 이면 {@code (:p is null or ...)} 패턴에 의해 무력화되어
   * 필터에서 빠진다. 기준번호 부분일치는 {@code concat} 으로 와일드카드를 감싸 표현했으며,
   * 정렬은 기준번호 오름차순이다.
   */
  @Query("""
      select std
        from InspectStandard std
       where (:inspectType is null or std.inspectType = :inspectType)
         and (:itemSq      is null or std.itemSq      = :itemSq)
         and (:keyword     is null or std.stdNo like concat('%', :keyword, '%'))
         and (:useYn       is null or std.useYn       = :useYn)
       order by std.stdNo asc
      """)
  List<InspectStandard> findBySearchCondition(
      @Param("inspectType") String inspectType,
      @Param("itemSq") Long itemSq,
      @Param("keyword") String keyword,
      @Param("useYn") Boolean useYn);

  /**
   * (검사유형, 기준번호) 로 식별되는 행의 이미지 경로 JSON 컬럼만 갈아끼운다.
   * 엔티티 전체를 다시 저장하지 않고 한 컬럼만 손대는 벌크 갱신.
   */
  @Modifying
  @Query("""
      update InspectStandard std
         set std.imgPaths = :imgPaths
       where std.inspectType = :inspectType
         and std.stdNo = :stdNo
      """)
  int updateImgPathsByTypeAndStdNo(
      @Param("inspectType") String inspectType,
      @Param("stdNo") String stdNo,
      @Param("imgPaths") String imgPaths);
}
