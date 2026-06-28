package com.mes.global.exception;

import lombok.Getter;

@Getter
public class CustomException extends RuntimeException {

  private final ErrorCode errorCode;
  private final String detailMessage; // 상세 메시지를 담을 필드 추가

  // 1. 기본 생성자 (ErrorCode에 정의된 메시지 그대로 사용)
  public CustomException(ErrorCode errorCode) {
    super(errorCode.getMessage());
    this.errorCode = errorCode;
    this.detailMessage = errorCode.getMessage();
  }

  // 2. 메시지 변경 생성자 (ErrorCode는 유지하되, 메시지만 구체적으로 변경)
  public CustomException(ErrorCode errorCode, String detailMessage) {
    super(detailMessage);
    this.errorCode = errorCode;
    this.detailMessage = detailMessage;
  }
}