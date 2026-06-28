package com.mes.global.exception;

import com.mes.global.response.ApiCommonResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

  /** 모든 핸들러가 공통으로 쓰는 응답 빌더. */
  private ResponseEntity<ApiCommonResponse<Void>> build(ErrorCode errorCode, String message) {
    return ResponseEntity
        .status(errorCode.getHttpStatus())
        .body(ApiCommonResponse.error(errorCode.getCode(), message));
  }

  /** ErrorCode 기본 메시지를 그대로 쓰는 핸들러용 단축 빌더. */
  private ResponseEntity<ApiCommonResponse<Void>> build(ErrorCode errorCode) {
    return build(errorCode, errorCode.getMessage());
  }

  /**
   * [1] CustomException 처리
   * 개발자가 비즈니스 로직에서 직접 던진 구체적인 에러입니다.
   */
  @ExceptionHandler(CustomException.class)
  protected ResponseEntity<ApiCommonResponse<Void>> handleCustomException(CustomException e) {
    ErrorCode errorCode = e.getErrorCode();

    // e.getDetailMessage()를 우선 사용 (없으면 ErrorCode의 기본 메시지)
    String message = e.getDetailMessage();

    log.warn(">> CustomException: code={}, message={}", errorCode.getCode(), message);
    return build(errorCode, message);
  }

  /**
   * [2] @Valid 유효성 검사 실패 처리
   * DTO의 @NotBlank, @NotNull 등에서 걸린 경우입니다.
   */
  @ExceptionHandler(MethodArgumentNotValidException.class)
  protected ResponseEntity<ApiCommonResponse<Void>> handleMethodArgumentNotValidException(
      MethodArgumentNotValidException e) {
    BindingResult bindingResult = e.getBindingResult();
    StringBuilder sb = new StringBuilder();

    // 첫 번째 에러 메시지만 가져오거나, 여러 개를 합쳐서 보여줄 수 있음
    for (FieldError fieldError : bindingResult.getFieldErrors()) {
      sb.append("[").append(fieldError.getField()).append("](은)는 ").append(fieldError.getDefaultMessage()).append(" ");
    }

    String message = sb.toString().trim();
    log.warn(">> Validation Error: {}", message);

    // 유효성 검사 실패는 COMMON_INVALID_PARAMETER 코드로 통일
    return build(ErrorCode.COMMON_INVALID_PARAMETER, message);
  }

  /**
   * [2-1] @Valid List<Dto> / @RequestParam 등 메서드 인자 단위 검증 실패 처리.
   * Spring Boot 3 / Spring Framework 6+ 에서 List<DTO>·단일 인자 등에는
   * MethodArgumentNotValidException 대신 HandlerMethodValidationException 이 던져진다.
   * 처리하지 않으면 [최종] Exception 핸들러로 떨어져 500 으로 응답되어 사용자에게 원인 미노출.
   */
  @ExceptionHandler(HandlerMethodValidationException.class)
  protected ResponseEntity<ApiCommonResponse<Void>> handleHandlerMethodValidationException(
      HandlerMethodValidationException e) {
    StringBuilder sb = new StringBuilder();
    e.getAllErrors().forEach(err ->
        sb.append(err.getDefaultMessage()).append(" "));
    String message = sb.toString().trim();
    if (message.isEmpty()) message = "요청 값 검증에 실패했습니다.";
    log.warn(">> Method Validation Error: {}", message);

    return build(ErrorCode.COMMON_INVALID_PARAMETER, message);
  }

  /**
   * [2-2] 쿼리스트링/패스변수 타입 불일치 (예: ?page=abc, /api/items/xx).
   * 그동안 500 으로 떨어지던 대표적인 케이스. 어떤 파라미터가 왜 틀렸는지 알려준다.
   */
  @ExceptionHandler(MethodArgumentTypeMismatchException.class)
  protected ResponseEntity<ApiCommonResponse<Void>> handleTypeMismatch(MethodArgumentTypeMismatchException e) {
    String required = e.getRequiredType() != null ? e.getRequiredType().getSimpleName() : "알 수 없음";
    String message = String.format("파라미터 '%s'의 값 '%s'을(를) %s 타입으로 변환할 수 없습니다.",
        e.getName(), e.getValue(), required);
    log.warn(">> TypeMismatch: {}", message);
    return build(ErrorCode.COMMON_TYPE_MISMATCH, message);
  }

  /**
   * [2-3] 필수 @RequestParam 누락.
   */
  @ExceptionHandler(MissingServletRequestParameterException.class)
  protected ResponseEntity<ApiCommonResponse<Void>> handleMissingParam(MissingServletRequestParameterException e) {
    String message = String.format("필수 파라미터 '%s'(%s)이(가) 누락되었습니다.",
        e.getParameterName(), e.getParameterType());
    log.warn(">> MissingParam: {}", message);
    return build(ErrorCode.COMMON_MISSING_PARAMETER, message);
  }

  /**
   * [2-4] 요청 본문(JSON) 파싱 실패 (깨진 JSON, 숫자 자리에 문자열 등).
   */
  @ExceptionHandler(HttpMessageNotReadableException.class)
  protected ResponseEntity<ApiCommonResponse<Void>> handleNotReadable(HttpMessageNotReadableException e) {
    log.warn(">> MessageNotReadable: {}", e.getMessage());
    return build(ErrorCode.COMMON_MESSAGE_NOT_READABLE);
  }

  /**
   * [2-5] 잘못된 인자/상태값 — 비즈니스 코드에서 흔히 던지는 IllegalArgument/IllegalState.
   * CustomException 으로 감싸지 않아도 메시지가 그대로 사용자에게 노출되도록 한다.
   */
  @ExceptionHandler(IllegalArgumentException.class)
  protected ResponseEntity<ApiCommonResponse<Void>> handleIllegalArgument(IllegalArgumentException e) {
    String message = e.getMessage() != null ? e.getMessage() : ErrorCode.COMMON_BAD_REQUEST.getMessage();
    log.warn(">> IllegalArgument: {}", message);
    return build(ErrorCode.COMMON_BAD_REQUEST, message);
  }

  @ExceptionHandler(IllegalStateException.class)
  protected ResponseEntity<ApiCommonResponse<Void>> handleIllegalState(IllegalStateException e) {
    String message = e.getMessage() != null ? e.getMessage() : ErrorCode.COMMON_ILLEGAL_STATUS.getMessage();
    log.warn(">> IllegalState: {}", message);
    return build(ErrorCode.COMMON_ILLEGAL_STATUS, message);
  }

  /**
   * [3] 무결성 위반 (FK 등) 처리
   * DB에서 삭제나 수정 시 다른 테이블 참조로 인해 실패하는 경우입니다.
   */
  @ExceptionHandler(DataIntegrityViolationException.class)
  protected ResponseEntity<ApiCommonResponse<Void>> handleDataIntegrityViolationException(
      DataIntegrityViolationException e) {
    log.error(">> DataIntegrityViolationException: {}", e.getMessage());
    return build(ErrorCode.COMMON_INFO_IN_USE);
  }

  /**
   * [3-1] 그 밖의 DB 접근 오류 (무결성 위반 제외).
   * 그동안 500/COM-001 로 뭉뚱그려지던 것을 "DB 오류(COM-013)"로 구분해 원인 파악을 돕는다.
   */
  @ExceptionHandler(DataAccessException.class)
  protected ResponseEntity<ApiCommonResponse<Void>> handleDataAccess(DataAccessException e) {
    log.error(">> DataAccessException: ", e);
    return build(ErrorCode.COMMON_DATABASE_ERROR);
  }

  /**
   * [4] 권한 거부 (@PreAuthorize 등) → 403 Forbidden
   */
  @ExceptionHandler(AccessDeniedException.class)
  protected ResponseEntity<ApiCommonResponse<Void>> handleAccessDenied(AccessDeniedException e) {
    log.warn(">> AccessDenied: {}", e.getMessage());
    return build(ErrorCode.AUTH_FORBIDDEN);
  }

  /**
   * [5] 인증 실패 → 401 Unauthorized
   */
  @ExceptionHandler(AuthenticationException.class)
  protected ResponseEntity<ApiCommonResponse<Void>> handleAuthentication(AuthenticationException e) {
    log.warn(">> AuthenticationException: {}", e.getMessage());
    return build(ErrorCode.AUTH_UNAUTHORIZED);
  }

  /**
   * [5-1] 허용되지 않은 HTTP method (예: POST 전용에 GET) → 405.
   */
  @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
  protected ResponseEntity<ApiCommonResponse<Void>> handleMethodNotSupported(HttpRequestMethodNotSupportedException e) {
    String message = String.format("'%s' 방식은 지원하지 않습니다. 지원: %s",
        e.getMethod(), e.getSupportedHttpMethods());
    log.warn(">> MethodNotSupported: {}", message);
    return build(ErrorCode.COMMON_METHOD_NOT_ALLOWED, message);
  }

  /**
   * [5-2] 존재하지 않는 경로/정적 리소스 → 404.
   */
  @ExceptionHandler(NoResourceFoundException.class)
  protected ResponseEntity<ApiCommonResponse<Void>> handleNoResource(NoResourceFoundException e) {
    log.warn(">> NoResourceFound: {}", e.getResourcePath());
    return build(ErrorCode.COMMON_NOT_FOUND, "요청 경로를 찾을 수 없습니다: " + e.getResourcePath());
  }

  /**
   * [5-3] 업로드 파일 용량 초과 → 413.
   */
  @ExceptionHandler(MaxUploadSizeExceededException.class)
  protected ResponseEntity<ApiCommonResponse<Void>> handleMaxUpload(MaxUploadSizeExceededException e) {
    log.warn(">> MaxUploadSizeExceeded: {}", e.getMessage());
    return build(ErrorCode.COMMON_FILE_SIZE_EXCEEDED);
  }

  /**
   * [최종] 위에서 잡지 못한 모든 예외.
   * 진짜 예상치 못한 서버 오류. 원인(클래스명/메시지)은 내부 정보 노출 방지를 위해
   * 응답에는 싣지 않고 서버 로그에만 남긴다. (위 세분화 핸들러들이 대부분의 케이스를 먼저 잡아냄)
   */
  @ExceptionHandler(Exception.class)
  protected ResponseEntity<ApiCommonResponse<Void>> handleException(Exception e) {
    log.error(">> Unhandled Exception: ", e);
    return build(ErrorCode.COMMON_SYSTEM_ERROR);
  }
}
