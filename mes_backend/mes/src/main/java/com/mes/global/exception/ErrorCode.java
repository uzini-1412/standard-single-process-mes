package com.mes.global.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

  // [Common] 공통 에러
  COMMON_SYSTEM_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "COM-001", "서버 내부 오류가 발생했습니다. 관리자에게 문의하세요."),
  COMMON_BAD_REQUEST(HttpStatus.BAD_REQUEST, "COM-002", "잘못된 요청입니다."),
  COMMON_INVALID_PARAMETER(HttpStatus.BAD_REQUEST, "COM-003", "입력값이 유효하지 않습니다."),
  COMMON_ENTITY_NOT_FOUND(HttpStatus.BAD_REQUEST, "COM-004", "존재하지 않는 엔티티입니다."),
  COMMON_ILLEGAL_STATUS(HttpStatus.BAD_REQUEST, "COM-005", "잘못된 상태 변경 요청입니다."),
  COMMON_INVALID_FILE_EXTENSION(HttpStatus.BAD_REQUEST, "COM-006", "허용되지 않은 파일 형식입니다."),
  // 아래 6개는 그동안 전부 500(COM-001)으로 뭉뚱그려지던 프레임워크 예외들을 구분하기 위한 코드.
  COMMON_TYPE_MISMATCH(HttpStatus.BAD_REQUEST, "COM-007", "요청 파라미터의 타입이 올바르지 않습니다."),
  COMMON_MISSING_PARAMETER(HttpStatus.BAD_REQUEST, "COM-008", "필수 요청 파라미터가 누락되었습니다."),
  COMMON_MESSAGE_NOT_READABLE(HttpStatus.BAD_REQUEST, "COM-009", "요청 본문(JSON) 형식이 올바르지 않습니다."),
  COMMON_METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "COM-010", "지원하지 않는 요청 방식(HTTP method)입니다."),
  COMMON_NOT_FOUND(HttpStatus.NOT_FOUND, "COM-011", "요청하신 경로 또는 리소스를 찾을 수 없습니다."),
  COMMON_FILE_SIZE_EXCEEDED(HttpStatus.CONTENT_TOO_LARGE, "COM-012", "허용된 파일 크기를 초과했습니다."),
  COMMON_DATABASE_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "COM-013", "데이터 처리(DB) 중 오류가 발생했습니다."),

  // [CommonInfo] 공통정보 관련
  COMMON_INFO_DUPLICATE(HttpStatus.CONFLICT, "INFO-001", "이미 존재하는 코드 또는 명칭입니다."),
  COMMON_INFO_IN_USE(HttpStatus.CONFLICT, "INFO-002", "다른 메뉴에서 사용 중인 데이터라 삭제/수정할 수 없습니다."),

  // [Auth] 인증 관련 (추후 확장 대비)
  AUTH_UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "AUTH-001", "인증되지 않은 사용자입니다."),
  AUTH_FORBIDDEN(HttpStatus.FORBIDDEN, "AUTH-002", "접근 권한이 없습니다."),
  // 로그인 잠금(사용 중지/퇴사) — 아이디·비밀번호 오류와 구분하기 위한 별도 코드. FE가 code로 식별해 전용 안내문 노출.
  AUTH_ACCOUNT_DISABLED(HttpStatus.FORBIDDEN, "AUTH-003", "현재 사용여부를 담당자에게 확인해주세요."),

  // [Facility] 설비 일상점검 관련
  FACILITY_CHECK_ITEM_RANGE_INVALID(HttpStatus.BAD_REQUEST, "FAC-001", "기준치는 하한치와 상한치 사이여야 하며, 하한치는 상한치보다 작아야 합니다."),

  // [Stock] 재고 관련
  STOCK_INSUFFICIENT(HttpStatus.BAD_REQUEST, "STK-001", "출하수량이 가용 재고를 초과합니다.");

  // 필요할 때마다 여기에 계속 추가하면 됩니다.

  private final HttpStatus httpStatus;
  private final String code; // 프론트에서 식별할 고유 코드 (예: COM-001)
  private final String message; // 토스트 메시지로 띄울 내용
}