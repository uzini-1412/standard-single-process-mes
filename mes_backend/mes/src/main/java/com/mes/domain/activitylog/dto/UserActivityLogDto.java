package com.mes.domain.activitylog.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 활동 이력 관련 요청/응답 DTO 묶음.
 * 필드 식별자는 FE 와의 JSON 계약이므로 이름을 바꾸지 않는다.
 */
public class UserActivityLogDto {

  private UserActivityLogDto() {
  }

  /** 목록/엑셀 공통 검색 조건. 모든 항목은 선택적이다. */
  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "활동 이력 검색 조건")
  public static class SearchReq {
    @Schema(description = "조회 시작일")
    private LocalDate dateFrom;
    @Schema(description = "조회 종료일")
    private LocalDate dateTo;
    @Schema(description = "로그인 계정 부분일치")
    private String userId;
    @Schema(description = "이름 부분일치")
    private String staffName;
    @Schema(description = "행위 종류")
    private String actionType;
    @Schema(description = "메뉴 코드")
    private String menuCode;
    @Schema(description = "페이지 번호(0-base)")
    private Integer page;
    @Schema(description = "페이지 크기")
    private Integer size;
  }

  /** FE 라우팅 가드/로그아웃 등에서 직접 기록을 요청할 때 사용. */
  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "활동 이력 기록 요청")
  public static class RecordReq {
    @Schema(description = "행위 종류")
    private String actionType;
    @Schema(description = "메뉴 코드")
    private String menuCode;
    @Schema(description = "메뉴 이름")
    private String menuName;
    @Schema(description = "대상 식별자")
    private String targetId;
    @Schema(description = "비고")
    private String detail;
  }

  /** 단일 활동 이력 응답 행. */
  @Getter
  @Setter
  @NoArgsConstructor
  @Schema(description = "활동 이력 응답")
  public static class Res {
    @Schema(description = "이력 PK")
    private Long activityLogSq;
    @Schema(description = "행위 종류")
    private String actionType;
    @Schema(description = "행위 발생 시각")
    private LocalDateTime regDt;

    @Schema(description = "사번")
    private Long staffSq;
    @Schema(description = "로그인 계정")
    private String userId;
    @Schema(description = "이름")
    private String staffName;

    @Schema(description = "메뉴 PK")
    private Integer menuSq;
    @Schema(description = "메뉴 코드")
    private String menuCode;
    @Schema(description = "메뉴 이름")
    private String menuName;

    @Schema(description = "대상 식별자")
    private String targetId;
    @Schema(description = "비고")
    private String detail;

    @Schema(description = "요청 URI")
    private String requestUri;
    @Schema(description = "HTTP method")
    private String httpMethod;
    @Schema(description = "클라이언트 IP")
    private String ipAddress;
    @Schema(description = "User-Agent")
    private String userAgent;
  }
}
