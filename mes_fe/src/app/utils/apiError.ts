import axios from "axios";
import { showError, showWarning } from "./toast";

/**
 * 백엔드 공통 응답(ApiCommonResponse)의 에러 형태.
 * GlobalExceptionHandler 가 내려주는 { status:"FAIL", code:"COM-xxx", message } 를 안전하게 추출한다.
 */
export interface ApiError {
  /** HTTP 상태코드 (응답이 없으면 undefined) */
  httpStatus?: number;
  /** 백엔드 고유 에러코드 (예: COM-002, AUTH-003) */
  code?: string;
  /** 사용자에게 보여줄 메시지 (백엔드 message 우선) */
  message?: string;
  /** 서버 응답 자체가 없는 경우(네트워크 끊김/타임아웃 등) */
  isNetworkError: boolean;
}

/**
 * axios 에러/일반 에러 어디서든 일관되게 { code, message, httpStatus } 를 뽑아낸다.
 * 페이지마다 `error?.response?.data?.message` 를 직접 더듬던 중복을 한곳으로 모은다.
 */
export function extractApiError(e: unknown): ApiError {
  if (axios.isAxiosError(e)) {
    const res = e.response;
    if (!res) {
      // 요청은 갔지만 응답이 없음 → 네트워크/타임아웃
      return {
        isNetworkError: true,
        message: "서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.",
      };
    }
    const data = res.data as { code?: string; message?: string } | undefined;
    return {
      httpStatus: res.status,
      code: data?.code,
      message: data?.message,
      isNetworkError: false,
    };
  }
  return {
    isNetworkError: false,
    message: e instanceof Error ? e.message : undefined,
  };
}

/** showApiError 의 폴백 문구. 문자열이면 default 로 간주한다. */
export type ApiErrorFallback = string | { conflict?: string; default?: string };

/**
 * 표준 에러 토스트.
 * - HTTP 409(중복/사용중 등 충돌)는 warning, 그 외는 error 로 띄운다.
 * - 항상 백엔드 message 를 우선 사용하고, 없을 때만 폴백 문구를 쓴다.
 *
 * @example
 *   } catch (e) { showApiError(e, { conflict: "이미 존재하는 거래처번호입니다.", default: "저장 중 오류가 발생했습니다." }); }
 */
export function showApiError(e: unknown, fallback?: ApiErrorFallback): ApiError {
  const err = extractApiError(e);
  const fb: { conflict?: string; default?: string } =
    typeof fallback === "string" ? { default: fallback } : fallback ?? {};

  if (err.httpStatus === 409) {
    showWarning(err.message || fb.conflict || fb.default || "이미 존재하거나 사용 중인 데이터입니다.");
  } else {
    showError(err.message || fb.default || "요청 처리 중 오류가 발생했습니다.");
  }
  return err;
}
