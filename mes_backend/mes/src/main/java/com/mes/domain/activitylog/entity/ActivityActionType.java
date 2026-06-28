package com.mes.domain.activitylog.entity;

/**
 * 활동 이력의 행위 종류 코드.
 * 값 문자열은 DB(action_type 컬럼)에 그대로 저장되고 상수명은 외부 도메인이
 * 참조하므로 둘 다 고정 계약이다.
 */
public final class ActivityActionType {

  private ActivityActionType() {
  }

  // 인증 관련
  public static final String LOGIN = "LOGIN";
  public static final String LOGIN_FAIL = "LOGIN_FAIL";
  public static final String LOGOUT = "LOGOUT";
  public static final String LOGOUT_TIMEOUT = "LOGOUT_TIMEOUT"; // 비활동 자동 로그아웃
  public static final String LOGOUT_EXPIRED = "LOGOUT_EXPIRED"; // 토큰 만료 자동 로그아웃

  // 화면/데이터 행위
  public static final String MENU_ACCESS = "MENU_ACCESS";
  public static final String READ_DETAIL = "READ_DETAIL";
  public static final String CREATE = "CREATE";
  public static final String UPDATE = "UPDATE";
  public static final String DELETE = "DELETE";
}
