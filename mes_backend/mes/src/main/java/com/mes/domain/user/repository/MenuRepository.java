package com.mes.domain.user.repository;

import com.mes.domain.user.entity.Menu;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/** 메뉴 트리(mes_menu_tb) 조회. 권한 그리드는 정렬순서대로 펼친 전체 메뉴를 기준으로 그린다. */
@Repository
public interface MenuRepository extends JpaRepository<Menu, Integer> {

  /** sort_order 오름차순 전체 메뉴 — 화면 표시 순서를 DB 정렬에 위임. */
  List<Menu> findAllByOrderBySortOrderAsc();
}
