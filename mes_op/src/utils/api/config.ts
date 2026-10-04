/**
 * mes_op 공용 HTTP 호출 헬퍼.
 *
 * 백엔드 응답은 `{ data: ... }` 봉투(envelope)로 내려오기도 하고 원시 payload로
 * 바로 내려오기도 한다. 호출부가 매번 분기하지 않도록 여기서 한 번에 풀어준다.
 */

// 호출부 경로는 '/production/...' 처럼 /api 가 빠져 있으므로 기본값에 /api 가 있어야 한다.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

const TOKEN_KEY = 'op_token';
const USER_KEY = 'op_userInfo';

/** 기본 JSON 헤더 + 로그인 토큰(있으면) + 호출부가 넘긴 헤더를 덧씌운다. */
function withJsonHeaders(extra?: HeadersInit): HeadersInit {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: withJsonHeaders(init.headers),
  });

  if (response.status === 401 || response.status === 403) {
    // 토큰이 이미 있던 상태에서 인증 실패면 세션 만료로 보고 강제 로그아웃.
    // 토큰이 없던 상태(로그인 자격증명 오류 등)는 일반 에러로 흘려보낸다.
    if (localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      alert('세션이 만료되었습니다. 다시 로그인해주세요.');
      window.location.reload();
      throw new Error('세션이 만료되었습니다.');
    }
  }

  if (!response.ok) {
    // 본문을 못 읽는 경우(빈 응답 등)에는 statusText로 대체한다.
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(`API ${response.status} (${path}): ${detail}`);
  }

  const payload = await response.json();
  // data 봉투가 있으면 내용물을, 없으면 응답 전체를 그대로 반환.
  return (payload?.data ?? payload) as T;
}
