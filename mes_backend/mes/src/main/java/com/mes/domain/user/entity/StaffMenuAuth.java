package com.mes.domain.user.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 직원 1명이 메뉴 1개에 대해 갖는 CRUD 접근권한 한 줄(mes_staff_menu_auth_tb).
 * (staff_sq, menu_sq) 조합이 사실상 키이며, 네 플래그가 화면의 등록/조회/수정/삭제 버튼 노출을 결정한다.
 */
@Entity
@Table(name = "mes_staff_menu_auth_tb")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffMenuAuth {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "auth_sq")
  private Long authSq;

  // 어떤 직원의 / 어떤 메뉴에 대한 권한인지
  @Column(name = "staff_sq", nullable = false)
  private Long staffSq;

  @Column(name = "menu_sq", nullable = false)
  private Integer menuSq;

  // CRUD 플래그 (null = 미설정 → 화면에선 false 로 간주)
  @Column(name = "create_auth")
  private Boolean createAuth;

  @Column(name = "read_auth")
  private Boolean readAuth;

  @Column(name = "update_auth")
  private Boolean updateAuth;

  @Column(name = "delete_auth")
  private Boolean deleteAuth;

  /** 네 권한 플래그를 한 번에 덮어쓴다(기존 행 갱신용). */
  public void updateAuth(Boolean create, Boolean read, Boolean update, Boolean delete) {
    this.createAuth = create;
    this.readAuth = read;
    this.updateAuth = update;
    this.deleteAuth = delete;
  }
}
