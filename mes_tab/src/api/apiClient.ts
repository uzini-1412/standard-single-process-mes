import axios from 'axios';

const TOKEN_KEY = 'tab_token';
const USER_KEY = 'tab_userInfo';

const apiHost = import.meta.env.VITE_API_BASE_URL ?? '/api';

const apiClient = axios.create({
  baseURL: apiHost,
  headers: { 'Content-Type': 'application/json' },
});

// 저장된 토큰을 꺼내 Authorization 헤더에 실어 보낸다
apiClient.interceptors.request.use((req) => {
  const savedToken = localStorage.getItem(TOKEN_KEY);
  if (savedToken) {
    req.headers['Authorization'] = `Bearer ${savedToken}`;
  }
  return req;
});

type LogoutPayload = { userId?: string; staffSq?: number; staffName?: string };

// 로컬에 보관된 사용자 정보를 읽어 로그아웃 로그용 형태로 변환
function buildUserPayload(): LogoutPayload {
  const rawUser = localStorage.getItem(USER_KEY);
  if (!rawUser) {
    return {};
  }
  try {
    const parsed = JSON.parse(rawUser);
    return { userId: parsed.userId, staffSq: parsed.staffSq, staffName: parsed.userName };
  } catch {
    // 파싱이 깨지면 빈 정보로 진행
    return {};
  }
}

// 토큰이 사라지기 직전에 TOKEN_EXPIRED 활동 로그를 남긴다.
// 토큰이 이미 무효이므로 서버는 본문의 fallback userId 를 활용한다.
function reportExpiredSession(): Promise<unknown> {
  return apiClient.post('/auth/logout', { reason: 'TOKEN_EXPIRED', ...buildUserPayload() });
}

let logoutInProgress = false;

apiClient.interceptors.response.use(
  (res) => res,
  (rejection) => {
    const httpStatus = rejection.response?.status;
    // 토큰 만료나 누락이면 Spring Security 가 403 을 돌려주므로 401 과 403 을 같은 인증 실패로 본다
    const tokenPresent = !!localStorage.getItem(TOKEN_KEY);
    const authFailed = httpStatus === 401 || httpStatus === 403;

    if (authFailed && tokenPresent && !logoutInProgress) {
      logoutInProgress = true;
      reportExpiredSession()
        .catch(() => { /* 로그 전송 실패는 그냥 넘어간다 */ })
        .finally(() => {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          alert('세션이 만료되었습니다. 다시 로그인해주세요.');
          window.location.reload();
          setTimeout(() => { logoutInProgress = false; }, 1000);
        });
    }
    return Promise.reject(rejection);
  }
);

export default apiClient;
