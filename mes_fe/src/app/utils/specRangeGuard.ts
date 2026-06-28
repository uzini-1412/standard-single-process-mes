// 검사/측정 기준의 하한치·기준치·상한치 비교 공통 가드.
// 입고/빈도/출하 검사표준, 작업조건, 설비일상점검 등 여러 화면이 동일 규칙을 쓰므로 한 곳에 모았다.
//
// 규칙: 하한치 ≤ 기준치 ≤ 상한치 (세 값이 모두 같아도 허용).
//   - 상한치 < 하한치                  → 오류
//   - 기준치가 [하한치, 상한치] 밖      → 오류
// 셋 중 하나라도 숫자가 아니면(빈 값, 또는 육안검사 OK/NG 등) 범위 검증을 건너뛰고 null 을 반환한다.
// (필수 입력 가드는 호출처에서 별도 처리)
//
// 사용 예
//   const err = ensureSpecRange(row.minVal, row.baseVal, row.maxVal, { labelPrefix: "입고검사표준의" });
//   if (err) { showError(err); return; }

/**
 * 하한치/기준치/상한치를 비교한다. 위반 시 한국어 메시지를, 정상이면 null 을 반환한다.
 * 세 값 중 숫자로 해석되지 않는 값이 하나라도 있으면 검증을 건너뛴다(null).
 */
export function ensureSpecRange(
  minVal: string | number | null | undefined,
  baseVal: string | number | null | undefined,
  maxVal: string | number | null | undefined,
  opts?: { labelPrefix?: string },
): string | null {
  const lower = parseNumeric(minVal);
  const target = parseNumeric(baseVal);
  const upper = parseNumeric(maxVal);
  // 빈 값 또는 육안검사(OK·NG) 등 숫자가 아니면 범위 비교를 건너뛴다.
  if (lower === null || target === null || upper === null) return null;

  const prefix = opts?.labelPrefix ? `${opts.labelPrefix} ` : "";
  if (upper < lower) return `${prefix}상한치는 하한치보다 작을 수 없습니다.`;
  if (target < lower || target > upper) {
    return `${prefix}기준치는 하한치와 상한치 사이의 값이어야 합니다.`;
  }
  return null;
}

// 빈 값/공백/비숫자는 null, 그 외에는 숫자로 변환한다.
function parseNumeric(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (text === "") return null;
  const num = Number(text);
  return Number.isNaN(num) ? null : num;
}
