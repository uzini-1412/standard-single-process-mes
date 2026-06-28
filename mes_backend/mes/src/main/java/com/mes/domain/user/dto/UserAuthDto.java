package com.mes.domain.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

/**
 * 사용자정보관리(/api/user) 요청·응답 묶음. 계정 정보 + 메뉴별 CRUD 권한 그리드.
 * 필드명은 프론트 JSON 계약이라 고정.
 */
public class UserAuthDto {

  // ─────────────────────────── 요청 ───────────────────────────

  /** 목록 검색(사번/사원명 키워드). */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class SearchReq {
    @Schema(description = "검색 키워드 (사원번호 또는 사원명)")
    private String keyword;
  }

  /** 상세 조회 — PK 노출을 피하려 POST 본문으로 받는다. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class DetailReq {
    @Schema(description = "직원 PK", example = "1")
    private Long staffSq;
  }

  /** 계정/권한 저장. password 는 변경 시에만 채워 보냄. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class SaveReq {
    @Schema(description = "직원 PK", example = "1")
    private Long staffSq;

    @Schema(description = "로그인 아이디 (수정 시)")
    private String userId;

    @Schema(description = "로그인 비밀번호 (변경 시에만 입력, 없으면 기존 유지)")
    private String password;

    @Schema(description = "계정 사용(로그인) 여부")
    private Boolean useGb;

    @Schema(description = "메뉴별 권한 리스트")
    private List<MenuAuthReq> permissionList;
  }

  /** 사용여부(로그인 잠금) 단건 토글. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class UseStatusReq {
    @Schema(description = "직원 PK", example = "1")
    private Long staffSq;

    @Schema(description = "사용(로그인) 여부")
    private Boolean useGb;
  }

  /** 계정 삭제. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class DeleteReq {
    @Schema(description = "삭제할 직원 PK 목록")
    private List<Long> staffIds;
  }

  /** 메뉴 한 줄에 대한 CRUD 권한 플래그(요청·응답 공통). */
  @Getter
  @Setter
  @NoArgsConstructor
  public static abstract class CrudAuth {
    private Boolean createAuth;
    private Boolean readAuth;
    private Boolean updateAuth;
    private Boolean deleteAuth;
  }

  /** 저장 요청의 메뉴별 권한 행. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class MenuAuthReq extends CrudAuth {
    @Schema(description = "메뉴 PK")
    private Integer menuSq;
  }

  // ─────────────────────────── 응답 ───────────────────────────

  /** 목록 행. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class ListRes {
    private Long staffSq;
    private String staffNo;
    private String staffName;
    private String userId;
    private Boolean useGb; // 사용(로그인) 여부
  }

  /** 상세 응답 = 계정 정보 + 전체 메뉴 권한 그리드. 비밀번호는 내려주지 않는다. */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class Res {
    private Long staffSq;
    private String staffName;
    private String staffNo;
    private String userId;
    private Boolean useGb; // 사용(로그인) 여부

    private List<MenuAuthRes> permissionList;
  }

  /** 메뉴 정보 + 해당 직원의 권한 플래그(없으면 전부 false). */
  @Getter
  @Setter
  @NoArgsConstructor
  public static class MenuAuthRes extends CrudAuth {
    private Integer menuSq;
    private String menuName;
    private String menuCode;
    private Integer parentMenuSq;
    private Integer sortOrder;
  }
}
