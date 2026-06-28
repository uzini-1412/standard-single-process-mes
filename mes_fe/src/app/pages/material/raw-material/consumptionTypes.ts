/** [원소재사용현황] 화면 전반에서 공유하는 타입·상수·날짜 유틸. */

export type ConsumptionTab = "input-status" | "input-analysis" | "input-analysis-detail";

// 매트릭스에서 콤마 없이 가운데 정렬로 표시할 텍스트 컬럼 key 집합. 그 외는 수량으로 취급.
export const MATRIX_TEXT_KEYS = new Set<string>(["no", "itemCode", "itemName"]);

export interface ConsumptionMatrixRow {
  no: number;
  itemCode: string;
  itemName: string;
  [key: string]: any;
}

// KST 기준 오늘 날짜 문자열. toISOString()은 UTC라 새벽에 하루 밀리는 문제를 피한다.
export function resolveTodayKst(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
