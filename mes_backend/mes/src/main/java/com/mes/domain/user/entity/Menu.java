package com.mes.domain.user.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 권한 화면의 메뉴 한 줄(mes_menu_tb). parentMenuSq + sortOrder 로 트리/정렬이 결정되고,
 * menuCode 가 프론트 라우팅과 매칭되는 불변 식별자다.
 */
@Entity
@Table(name = "mes_menu_tb")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Menu {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "menu_sq")
  private Integer menuSq;

  // 식별/표시
  @Column(name = "menu_code", length = 50, nullable = false, unique = true)
  private String menuCode;

  @Column(name = "menu_name", length = 100, nullable = false)
  private String menuName;

  // 트리 구조 및 정렬
  @Column(name = "parent_menu_sq")
  private Integer parentMenuSq;

  @Column(name = "sort_order")
  private Integer sortOrder;

  // 사용 여부 플래그('Y'/'N')
  @Column(name = "use_yn")
  private String useYn;
}
