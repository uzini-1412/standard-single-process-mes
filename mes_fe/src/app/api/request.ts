/**
 * 도메인 API 모듈 공용 요청 헬퍼.
 *
 * 백엔드는 모든 응답을 `{ data: T }` 봉투로 감싸 내려준다. 각 API 모듈이
 * `apiClient.post<{ data: T }>(...).then(r => r.data.data)` 를 반복하는 대신
 * 여기서 봉투를 한 번만 벗긴다. 엔드포인트 경로·요청 본문·반환 타입은 호출부가
 * 그대로 정하므로 BE 계약에는 영향이 없다.
 */
import type { AxiosRequestConfig } from "axios";
import apiClient from "./apiClient";

/** 서버 표준 응답 봉투. 실제 페이로드는 항상 `data` 안에 담겨 온다. */
type Wrapped<T> = { data: T };

/** 서버 페이지네이션 응답(PageResponse<T>)의 공통 형태. */
export interface PageEnvelope<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** content 가 빈 기본 페이지 — 널/실패 응답의 폴백으로 쓴다. */
export const emptyPage = <T>(): PageEnvelope<T> => ({
  content: [],
  page: 0,
  size: 0,
  totalElements: 0,
  totalPages: 0,
});

/** POST 후 응답 봉투를 벗겨 본문만 반환. */
export async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await apiClient.post<Wrapped<T>>(url, body);
  return data.data;
}

/** PUT 후 응답 봉투를 벗겨 본문만 반환. */
export async function putJson<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await apiClient.put<Wrapped<T>>(url, body);
  return data.data;
}

/** GET 후 응답 봉투를 벗겨 본문만 반환. */
export async function getJson<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  const { data } = await apiClient.get<Wrapped<T>>(url, config);
  return data.data;
}

/** DELETE 후 응답 봉투를 벗겨 본문만 반환. */
export async function deleteJson<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  const { data } = await apiClient.delete<Wrapped<T>>(url, config);
  return data.data;
}

/** 본문이 필요 없는 POST(저장/삭제 등). 봉투를 벗기지 않고 완료만 기다린다. */
export async function postVoid(url: string, body?: unknown): Promise<void> {
  await apiClient.post(url, body);
}

/**
 * 호출 실패를 라벨과 함께 한곳에서 로깅하고 그대로 다시 던진다.
 * 도메인별로 try/catch + console.error 를 반복하던 패턴을 대체한다.
 */
export async function withErrorLog<T>(
  label: string,
  run: () => Promise<T>,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.error(`Error ${label}:`, error);
    throw error;
  }
}
