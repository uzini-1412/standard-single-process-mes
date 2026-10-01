/** [원소재사용현황] 화면 전반에서 공유하는 타입·상수. */

export type ConsumptionTab = "input-status" | "input-analysis" | "input-analysis-detail";

// 매트릭스에서 콤마 없이 가운데 정렬로 표시할 텍스트 컬럼 key 집합. 그 외는 수량으로 취급.
export const MATRIX_TEXT_KEYS = new Set<string>(["no", "itemCode", "itemName"]);

export interface ConsumptionMatrixRow {
  no: number;
  itemCode: string;
  itemName: string;
  [key: string]: any;
}

