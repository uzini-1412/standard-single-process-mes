import apiClient from './apiClient';
import type { ApiResponse } from '../types';

/**
 * 서버 응답은 모두 { code, success, data, message } 봉투로 내려온다.
 * 화면 코드가 매번 `res.data.data` 를 까는 보일러플레이트를 없애기 위해
 * 봉투를 벗겨 실제 payload 만 돌려주는 얇은 래퍼들을 모아 둔다.
 */

type QueryParams = Record<string, unknown>;

/** ApiResponse 봉투에서 payload(data) 만 추출. */
function unwrap<T>(res: { data: ApiResponse<T> }): T {
  return res.data.data;
}

/** JSON 바디를 실어 POST 하고 payload 만 반환. 바디 생략 시 빈 객체로 전송. */
export async function postData<T>(url: string, body: unknown = {}): Promise<T> {
  return unwrap<T>(await apiClient.post<ApiResponse<T>>(url, body));
}

/** 쿼리스트링으로 GET 하고 payload 만 반환. */
export async function getData<T>(url: string, params?: QueryParams): Promise<T> {
  return unwrap<T>(await apiClient.get<ApiResponse<T>>(url, params ? { params } : undefined));
}

/**
 * 결과를 쓰지 않고, 실패해도 호출부 흐름을 막으면 안 되는 비차단 POST.
 * (활동 로그·로그아웃 기록처럼 부가적인 기록 전송에 사용)
 */
export async function postQuietly(url: string, body: unknown): Promise<void> {
  try {
    await apiClient.post(url, body);
  } catch {
    /* 부가 기록 전송 실패는 의도적으로 삼킨다 */
  }
}
