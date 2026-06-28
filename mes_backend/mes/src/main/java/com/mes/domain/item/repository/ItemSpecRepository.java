package com.mes.domain.item.repository;

import com.mes.domain.item.entity.ItemSpec;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface ItemSpecRepository extends JpaRepository<ItemSpec, Long> {

    /*
     * 여러 품목의 규격을 한 번에 로딩 (제품재고현황 N+1 제거용).
     * item 을 fetch join 으로 함께 초기화하므로 호출 측에서
     * s.getItem().getItemSq() 접근이 안전하다.
     */
    @Query("SELECT s FROM ItemSpec s JOIN FETCH s.item i WHERE i.itemSq IN :itemSqs ORDER BY s.specOrder ASC")
    List<ItemSpec> findByItemSqInFetch(@Param("itemSqs") Collection<Long> itemSqs);

    /* 단일 품목의 규격을 정렬 순서대로 조회. */
    List<ItemSpec> findByItem_ItemSqOrderBySpecOrderAsc(Long itemSq);

    void deleteByItem_ItemSq(Long itemSq);
}
