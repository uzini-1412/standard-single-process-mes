// 오늘 날짜 문자열 유틸 (태블릿).
//
// toISOString() 은 UTC 로 직렬화한다. KST(UTC+9)에서는 00:00~08:59 사이에 하루 전 날짜가
// 나와서, 야간조가 조회하는 기준일이 하루 밀린다. 화면 기본값에는 쓰지 않는다.
// 기준은 브라우저 로컬 달력(현장 태블릿은 KST)이다.
//
// mes_fe/src/app/utils/dateToday.ts 와 같은 규칙. 앱 간 공유 패키지가 없어 각자 둔다.

const pad2 = (n: number): string => String(n).padStart(2, "0");

/** Date → "YYYY-MM-DD". */
export function toYmd(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** 오늘 "YYYY-MM-DD". 조회 기준일 기본값에 쓴다. */
export function todayYmd(): string {
  return toYmd(new Date());
}
