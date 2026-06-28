import { postQuietly } from './http';

export interface ActivityLogRecordReq {
  menuCode?: string;
  menuName?: string;
  targetId?: string;
  detail?: string;
}

export type LogoutReason = 'MANUAL' | 'SESSION_TIMEOUT' | 'TOKEN_EXPIRED';

export interface LogoutFallback {
  userId?: string;
  staffSq?: number;
  staffName?: string;
}

/**
 * 메뉴 진입 이력을 서버에 적재한다. 화면 전환 부수효과로 호출되므로
 * 실패가 사용자 경험을 끊지 않도록 비차단으로 전송한다.
 */
export function recordMenuAccess(req: ActivityLogRecordReq): Promise<void> {
  return postQuietly('/activity-log/menu-access', req);
}

/**
 * 로그아웃 사유와(토큰이 이미 무효일 수 있어) 보조 사용자 식별 정보를 함께 보낸다.
 * 이 역시 기록용이라 실패해도 무시한다.
 */
export function logout(reason: LogoutReason = 'MANUAL', fallback: LogoutFallback = {}): Promise<void> {
  return postQuietly('/auth/logout', { reason, ...fallback });
}
