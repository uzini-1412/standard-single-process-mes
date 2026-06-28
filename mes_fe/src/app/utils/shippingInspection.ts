// =====================================================================
// 출하검사 화면 공통 동작 헬퍼
// =====================================================================
// 출하검사는 "한 제품 LOT = 한 롤" 단위로 이루어지므로 시료수는 항상 1이다.
// 등록/수정/상세 화면이 모두 다음 규칙을 공유한다.
//
//   - 시료수는 항상 1 (한 제품 LOT = 한 롤)
//   - x1 측정값은 출하지시 시점에 확정된 productLotNo의 생산일보 롤중량을
//     자동 채움
//   - 합부판정은 출하검사 표준의 max/min 범위로 자동 계산
//
// 호출처 검색 키워드: "shippingInspection" 또는 "FIXED_SAMPLE_CNT".
// =====================================================================

export const FIXED_SAMPLE_CNT = 1;

// x1 측정값 + 표준 상/하한치로 합부 자동 판정.
// 빈 값/숫자 변환 실패 시 "" 반환(=판정 보류).
export function autoJudgeFromX1(
  x1: string | number | null | undefined,
  minVal: string | number | null | undefined,
  maxVal: string | number | null | undefined,
): string {
  if (x1 === "" || x1 == null) return "";
  const v = typeof x1 === "number" ? x1 : parseFloat(String(x1));
  const min = typeof minVal === "number" ? minVal : parseFloat(String(minVal ?? ""));
  const max = typeof maxVal === "number" ? maxVal : parseFloat(String(maxVal ?? ""));
  if (!Number.isFinite(v) || !Number.isFinite(min) || !Number.isFinite(max)) return "";
  return v < min || v > max ? "불합격" : "합격";
}

// 저장 payload용 x1 변환. 빈 값/NaN은 undefined.
export function x1ToNumber(x1Raw: unknown): number | undefined {
  if (x1Raw === "" || x1Raw == null) return undefined;
  const v = parseFloat(String(x1Raw));
  return Number.isFinite(v) ? v : undefined;
}

// 출하지시 대상 행에서 x1 자동 입력값 추출.
// rollWeight(생산일보 측정 롤중량)가 있으면 문자열로, 없으면 빈 문자열.
export function autoX1String(rollWeight: number | null | undefined): string {
  return rollWeight == null ? "" : String(rollWeight);
}
