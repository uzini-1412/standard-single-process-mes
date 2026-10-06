package com.mes.domain.commoninfo.repository;

import com.mes.domain.commoninfo.entity.CommonValue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 내용 값(CommonValue) 영속 계층.
 * 신규 값 한 건을 즉석 등록할 때 부모(CommonDetail)를 거치지 않고 직접 persist하기 위해 쓴다
 * (부모가 이미 영속 상태라 save()가 merge로 처리되면서, cascade로 새로 끼워 넣은 자식의
 *  생성된 PK가 merge가 만든 복사본에만 채워지고 원본 객체에는 반영되지 않는 문제를 피한다).
 */
@Repository
public interface CommonValueRepository extends JpaRepository<CommonValue, Long> {
}
