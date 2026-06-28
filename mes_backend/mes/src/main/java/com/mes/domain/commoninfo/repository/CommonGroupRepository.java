package com.mes.domain.commoninfo.repository;

import com.mes.domain.commoninfo.entity.CommonGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * 상위 분류(CommonGroup) 영속 계층.
 * 세부항목을 저장하기 전, 부모 분류가 이미 존재하는지 코드로 확인할 때 쓴다.
 */
@Repository
public interface CommonGroupRepository extends JpaRepository<CommonGroup, Long> {

  /** 유일 코드로 분류 한 건을 찾는다(없으면 신규 생성 대상). */
  Optional<CommonGroup> findByGroupCode(String groupCode);
}
