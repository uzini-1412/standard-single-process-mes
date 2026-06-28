package com.mes.domain.collection.repository;

import com.mes.domain.collection.entity.Collection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface CollectionRepository extends JpaRepository<Collection, Long> {

    /**
     * 수금일자 구간으로 전표를 조회한다. 구간 양끝은 nullable 이며,
     * null 이면 해당 방향 제한을 두지 않는다. 최신 수금 건이 먼저 온다.
     */
    @Query("""
            SELECT c FROM Collection c
            WHERE (:from IS NULL OR c.receiptDate >= :from)
              AND (:to   IS NULL OR c.receiptDate <= :to)
            ORDER BY c.receiptDate DESC, c.receiptSeq DESC
            """)
    List<Collection> search(@Param("from") LocalDate from,
                            @Param("to") LocalDate to);
}
