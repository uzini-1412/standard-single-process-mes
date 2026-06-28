package com.mes.global.response;

import lombok.Getter;

@Getter
public class ApiCommonResponse<T> {

    private final String status;  // SUCCESS, FAIL
    private final String code;    // 추가됨: 구체적인 에러 코드 (성공 시엔 NULL 또는 200)
    private final String message; // 토스트 메시지 내용
    private final T data;

    // private 생성자
    private ApiCommonResponse(String status, String code, String message, T data) {
        this.status = status;
        this.code = code;
        this.message = message;
        this.data = data;
    }

    // 성공 시
    public static <T> ApiCommonResponse<T> success(T data) {
        return new ApiCommonResponse<>("SUCCESS", "200", "요청이 성공적으로 처리되었습니다.", data);
    }
    
    // 성공 시 (메시지 커스텀)
    public static <T> ApiCommonResponse<T> success(String message, T data) {
        return new ApiCommonResponse<>("SUCCESS", "200", message, data);
    }

    // 실패 시 (에러 코드를 받아서 처리)
    public static <T> ApiCommonResponse<T> error(String code, String message) {
        return new ApiCommonResponse<>("FAIL", code, message, null);
    }
}