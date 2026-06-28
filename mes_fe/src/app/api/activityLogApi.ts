import { emptyPage, postJson, postVoid, type PageEnvelope } from './request';

export interface ActivityLogSearchReq {
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  staffName?: string;
  actionType?: string;
  menuCode?: string;
  page?: number;
  size?: number;
}

export interface ActivityLogRecordReq {
  actionType?: string;
  menuCode?: string;
  menuName?: string;
  targetId?: string;
  detail?: string;
}

export interface ActivityLogRes {
  activityLogSq: number;
  staffSq?: number;
  userId?: string;
  staffName?: string;
  actionType: string;
  menuSq?: number;
  menuCode?: string;
  menuName?: string;
  targetId?: string;
  requestUri?: string;
  httpMethod?: string;
  detail?: string;
  ipAddress?: string;
  userAgent?: string;
  regDt: string;
}

export type PageData<T> = PageEnvelope<T>;

export async function searchActivityLogs(req: ActivityLogSearchReq): Promise<PageData<ActivityLogRes>> {
  const page = await postJson<PageData<ActivityLogRes> | null>('/activity-log/list', req);
  return page ?? emptyPage<ActivityLogRes>();
}

export async function fetchActivityLogsForExport(req: ActivityLogSearchReq): Promise<ActivityLogRes[]> {
  return (await postJson<ActivityLogRes[] | null>('/activity-log/list-all', req)) ?? [];
}

export async function recordMenuAccess(req: ActivityLogRecordReq): Promise<void> {
  try {
    await postVoid('/activity-log/menu-access', req);
  } catch {
    // 감사 로그는 부가 기능이라, 기록이 실패해도 화면 흐름은 그대로 진행한다.
  }
}

export type LogoutReason = 'MANUAL' | 'SESSION_TIMEOUT' | 'TOKEN_EXPIRED';

export interface LogoutFallback {
  userId?: string;
  staffSq?: number;
  staffName?: string;
}

/**
 * 자동 로그아웃 상황에선 토큰이 이미 만료됐을 수 있으므로, 식별용 사용자 정보를 fallback 으로 함께 전달한다.
 * 서버는 SecurityContext 의 인증 사용자를 우선 쓰고 없을 때만 이 fallback 을 참조한다.
 */
export async function logout(reason: LogoutReason = 'MANUAL', fallback: LogoutFallback = {}): Promise<void> {
  try {
    await postVoid('/auth/logout', { reason, ...fallback });
  } catch {
    // 로그아웃 감사 기록 실패는 무시한다.
  }
}

export const ACTION_LABEL_MAP: Record<string, string> = {
  LOGIN: '로그인',
  LOGIN_FAIL: '로그인 실패',
  LOGOUT: '로그아웃',
  LOGOUT_TIMEOUT: '자동 로그아웃(미활동)',
  LOGOUT_EXPIRED: '자동 로그아웃(토큰만료)',
  MENU_ACCESS: '메뉴 접근',
  CREATE: '등록',
  UPDATE: '수정',
  DELETE: '삭제',
  READ_DETAIL: '상세 조회',
};

export const ACTION_FILTER_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'LOGIN', label: '로그인' },
  { value: 'LOGIN_FAIL', label: '로그인 실패' },
  { value: 'LOGOUT', label: '로그아웃' },
  { value: 'LOGOUT_TIMEOUT', label: '자동 로그아웃(미활동)' },
  { value: 'LOGOUT_EXPIRED', label: '자동 로그아웃(토큰만료)' },
  { value: 'MENU_ACCESS', label: '메뉴 접근' },
  { value: 'CREATE', label: '등록' },
  { value: 'UPDATE', label: '수정' },
  { value: 'DELETE', label: '삭제' },
  { value: 'READ_DETAIL', label: '상세 조회' },
];
