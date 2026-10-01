import axios from 'axios';

// 백엔드 컨트롤러가 전부 /api 하위이고 nginx·vite 프록시도 /api 를 넘긴다.
// .env 가 없는 새 클론에서도 그대로 동작하도록 기본값을 '/api' 로 둔다.
const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api';

const apiClient = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터: localStorage의 JWT 토큰을 Authorization 헤더에 자동 첨부
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터: 401 응답 시 세션 만료 처리 → 자동 로그아웃
let isLoggingOut = false;
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const hasActiveSession = !!localStorage.getItem('token');

    if (error.response?.status === 401 && hasActiveSession && !isLoggingOut) {
      isLoggingOut = true;
      // 토큰 폐기 전에 활동 로그 기록 (TOKEN_EXPIRED) — 토큰이 이미 무효라 BE는 fallback userId 사용
      const userInfoStr = localStorage.getItem('userInfo');
      let fallback: { userId?: string; staffSq?: number; staffName?: string } = {};
      if (userInfoStr) {
        try {
          const u = JSON.parse(userInfoStr);
          fallback = { userId: u.userId, staffSq: u.staffSq, staffName: u.staffName };
        } catch { /* ignore */ }
      }
      apiClient.post('/auth/logout', { reason: 'TOKEN_EXPIRED', ...fallback })
        .catch(() => { /* 활동로그 실패는 무시 */ })
        .finally(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('userInfo');
          localStorage.removeItem('permissions');
          alert('세션이 만료되었습니다. 다시 로그인해주세요.');
          window.location.reload();
          setTimeout(() => { isLoggingOut = false; }, 1000);
        });
    }
    return Promise.reject(error);
  }
);

export default apiClient;
