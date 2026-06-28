package com.mes.domain.collection.repository;

import com.mes.domain.collection.entity.CollectionDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CollectionDetailRepository extends JpaRepository<CollectionDetail, Long> {
}
