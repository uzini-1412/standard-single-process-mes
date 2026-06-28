package com.mes.domain.item.repository;

import com.mes.domain.item.entity.Item;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ItemRepository extends JpaRepository<Item, Long> {

    /* 품번 단건 조회 / 존재 여부 */
    Optional<Item> findByItemCode(String itemCode);

    boolean existsByItemCode(String itemCode);

    /* 주어진 품번들 중 이미 존재하는 것만 반환. 일괄 등록 시 건별 exists 호출을 1회 IN 조회로 대체. */
    @Query("SELECT i.itemCode FROM Item i WHERE i.itemCode IN :codes")
    List<String> findExistingItemCodes(@Param("codes") Collection<String> codes);

    /*
     * 검색 조건 목록. 조건은 전부 nullable 이며 null 이면 해당 필터를 건너뛴다.
     * specs 를 fetch join 해 N+1 을 막고 품번 오름차순으로 정렬한다.
     */
    @Query("SELECT DISTINCT i FROM Item i "
        + "LEFT JOIN FETCH i.specs "
        + "WHERE (:keyword IS NULL OR i.itemName LIKE %:keyword% OR i.itemCode LIKE %:keyword%) "
        + "AND (:itemType IS NULL OR i.itemType = :itemType) "
        + "AND (:accountType IS NULL OR i.accountType = :accountType) "
        + "AND (:spec IS NULL OR i.spec = :spec) "
        + "AND (:useYn IS NULL OR i.useYn = :useYn) "
        + "ORDER BY i.itemCode ASC")
    List<Item> findBySearchCondition(
        @Param("keyword") String keyword,
        @Param("itemType") String itemType,
        @Param("accountType") String accountType,
        @Param("spec") String spec,
        @Param("useYn") Boolean useYn);

    /* PK 묶음으로 specs 까지 한 번에 끌어오는 용도 (N+1 회피). */
    @Query("SELECT DISTINCT i FROM Item i LEFT JOIN FETCH i.specs WHERE i.itemSq IN :ids")
    List<Item> findAllByIdWithSpecs(@Param("ids") Collection<Long> ids);

    /*
     * 사용중(useYn) 품목 전체 + specs. 자재/제품 재고 화면이 입고·실적이 없는
     * 품목도 0 수량 빈 행으로 노출해야 하므로 마스터 기준 일괄 로딩에 쓰인다.
     */
    @Query("SELECT DISTINCT i FROM Item i LEFT JOIN FETCH i.specs WHERE i.useYn = :useYn")
    List<Item> findAllByUseYnWithSpecs(@Param("useYn") Boolean useYn);

    /* 이미지 경로(JSON 문자열) 만 품번 기준으로 부분 갱신. */
    @Modifying
    @Query("UPDATE Item i SET i.imgPaths = :imgPaths WHERE i.itemCode = :itemCode")
    int updateImgPathsByItemCode(@Param("itemCode") String itemCode, @Param("imgPaths") String imgPaths);

    /* 대시보드 자재 후보 추출: 계정구분이 일치하는 item_sq 목록. */
    @Query("SELECT i.itemSq FROM Item i WHERE i.accountType IN :accountTypes")
    List<Long> findItemSqsByAccountTypes(@Param("accountTypes") Collection<String> accountTypes);
}
