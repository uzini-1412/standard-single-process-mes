// 비가동 등록 화면 전용 순수 헬퍼/상수 모음 (외부 import 대상 아님).

// 공통정보 미수신 시 사용할 기본 비가동 유형 목록.
export const DEFAULT_DOWNTIME_TYPES: string[] = [
  '계획정지', '품목변경', '전기고장',
  '기계고장', '니들문제', '원료문제',
  '온도문제', '교육/청소', '기타',
];

// 화면 표시용 유형명 → 백엔드 저장용 downtimeCode 매핑.
export const DOWNTIME_CODE_MAP: Record<string, string> = {
  '계획정지': '계획정지',
  '품목변경': '품목변경',
  '기계고장': '기계',
  '전기고장': '전기',
  '니들문제': '니들',
  '원료문제': '원료',
  '온도문제': '온도',
  '교육/청소': '교육청소',
  '기타': '기타',
};

// 작업상태 코드를 한글 표기로 환산.
export function statusLabel(status: string): string {
  switch (status) {
    case 'PENDING': return '작업대기';
    case 'IN_PROGRESS': return '작업진행중';
    case 'COMPLETED': return '작업완료';
    case 'STOPPED': return '작업중지';
    default: return status || '';
  }
}

// downtimeCode 로부터 화면 표시 유형명을 역으로 찾아준다.
export function labelFromDowntimeCode(code: string): string {
  const found = Object.entries(DOWNTIME_CODE_MAP).find(([, value]) => value === code);
  return found?.[0] ?? '';
}

// 평면 배열을 가로 columns 개씩 끊어 2차원 행 배열로 변환.
export function chunkIntoRows<T>(items: T[], columns: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += columns) {
    rows.push(items.slice(i, i + columns));
  }
  return rows;
}

// 세 사유 필드 중 하나라도 공백 제거 후 값이 남는지 여부.
export function hasAnyReason(equipment: string, action: string, owner: string): boolean {
  return Boolean(
    (equipment || '').trim() ||
    (action || '').trim() ||
    (owner || '').trim()
  );
}

// 미완료(endDt 없음) 이벤트들 중 downtimeSq 가 가장 큰(최신) 행을 고른다.
export function pickLatestOpenEvent(events: any[] | null | undefined): any | null {
  const opens = (events || []).filter((e: any) => !e.endDt);
  if (opens.length === 0) return null;
  opens.sort((a: any, b: any) => (b.downtimeSq || 0) - (a.downtimeSq || 0));
  return opens[0];
}

// 응답 PK 가 비거나 NaN 이면 미완료 행을 재조회해 PK 를 회수한다.
export async function resolveDowntimeSq(
  rawSq: unknown,
  refetchOpen: () => Promise<any | null>,
): Promise<number | null> {
  let sq = Number(rawSq);
  if (!sq || Number.isNaN(sq)) {
    const after = await refetchOpen();
    if (after?.downtimeSq) sq = Number(after.downtimeSq);
  }
  return sq && !Number.isNaN(sq) ? sq : null;
}
