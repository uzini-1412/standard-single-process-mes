/**
 * mes_op 공용 HTTP 호출 헬퍼.
 *
 * 백엔드 응답은 `{ data: ... }` 봉투(envelope)로 내려오기도 하고 원시 payload로
 * 바로 내려오기도 한다. 호출부가 매번 분기하지 않도록 여기서 한 번에 풀어준다.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

/** 기본 JSON 헤더에 호출부가 넘긴 헤더를 덧씌운다. */
function withJsonHeaders(extra?: HeadersInit): HeadersInit {
  return { 'Content-Type': 'application/json', ...extra };
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: withJsonHeaders(init.headers),
  });

  if (!response.ok) {
    // 본문을 못 읽는 경우(빈 응답 등)에는 statusText로 대체한다.
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(`API ${response.status} (${path}): ${detail}`);
  }

  const payload = await response.json();
  // data 봉투가 있으면 내용물을, 없으면 응답 전체를 그대로 반환.
  return (payload?.data ?? payload) as T;
}
