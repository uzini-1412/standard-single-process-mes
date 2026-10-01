// 오늘 날짜 문자열 유틸.
//
// toISOString() 은 UTC 로 직렬화한다. KST(UTC+9)에서는 00:00~08:59 사이에 하루 전 날짜가
// 나와서, 야간조가 입력하는 가입고일·발주일·검사일·부적합발생일이 전부 하루 밀렸다.
// 화면 기본값 계산에는 toISOString() 대신 이 파일을 쓴다.
//
// 기준은 브라우저 로컬 달력(현장/사무 PC 는 KST)이다. Intl 로 Asia/Seoul 을 고정하지 않는
// 이유는, 여기서 만든 문자열이 `new Date(y, m, d)` 로 조립한 Date 와 같은 달력 위에 있어야
// 날짜 비교·가감산이 어긋나지 않기 때문이다.
//
// 날짜 순서 검증(A는 B 이전일 수 없음)은 utils/dateGuard.ts 를 쓴다.

const pad2 = (n: number): string => String(n).padStart(2, "0");

/** Date → "YYYY-MM-DD". */
export function toYmd(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Date → "YYYY-MM". */
export function toYm(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

/** 오늘 "YYYY-MM-DD". 폼의 날짜 기본값에 쓴다. */
export function todayYmd(): string {
  return toYmd(new Date());
}

/** 이번 달 "YYYY-MM". 월 단위 조회 조건 기본값에 쓴다. */
export function todayYm(): string {
  return toYm(new Date());
}

/** 오늘 기준 days 일 전 "YYYY-MM-DD". 음수를 주면 미래 날짜가 된다. */
export function daysAgoYmd(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toYmd(date);
}
