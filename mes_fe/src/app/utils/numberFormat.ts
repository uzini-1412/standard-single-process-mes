/**
 * 숫자 표시 포매터 모음.
 *
 * 끝수(소수) 처리 정책
 *   - 공급액(수량×단가), 부가세  → 원 단위 올림 (ceilMoney)
 *   - Ea 환산 수량(수량÷길이)     → 올림 (ceilEa)
 *   - 거래명세서 세액은 화면 토글(반올림/절사)로 처리하므로 여기서 다루지 않는다.
 */

/** 원 단위 올림. 공급액·부가세 등 통화 금액에 적용한다. */
export function ceilMoney(value: number): number {
  return Math.ceil(value);
}

/** Ea(낱개) 수량 올림. 0.x가 남아도 1개로 올린다. */
export function ceilEa(value: number): number {
  return Math.ceil(value);
}

const BLANK = "";

// 문자열/숫자를 숫자로 환산한다. 문자열 안의 콤마는 제거하고, 해석 불가면 NaN.
function toNumeric(value: number | string): number {
  return typeof value === "number" ? value : Number(value.replace(/,/g, ""));
}

/**
 * 천단위 콤마 포매터(표준 표시).
 * 표/그리드 숫자 셀에 사용한다(숫자 컬럼은 우측정렬과 함께).
 *   - null · undefined · 빈 문자열 → 빈 문자열 (셀을 비워 둔다)
 *   - 숫자로 해석 불가한 값        → 받은 문자열을 그대로 돌려준다
 */
export function formatNumber(value?: number | string | null): string {
  if (value === null || value === undefined || value === BLANK) return BLANK;
  const n = toNumeric(value);
  return Number.isNaN(n) ? String(value) : n.toLocaleString();
}

/**
 * 금액(₩) 포매터. formatNumber 결과 앞에 ₩ 기호를 붙인다.
 * 빈값이면 ₩ 단독 표기를 막기 위해 빈 문자열을 돌려준다.
 */
export function formatCurrency(value?: number | string | null): string {
  const formatted = formatNumber(value);
  return formatted === BLANK ? BLANK : `₩ ${formatted}`;
}
