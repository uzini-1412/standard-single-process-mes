/** 부적합 화면 공통으로 쓰는 코드→한글 표기 변환 도우미. */

// 발생분류 코드와 한글 명칭 대응표
export const OCCUR_TYPE_TEXT: Record<string, string> = {
  MATERIAL: "입고",
  PROCESS: "공정",
  SHIPMENT: "출하",
  CUSTOMER: "고객",
};

// 발생분류 코드를 한글로, 없으면 원본 코드를 그대로 돌려줌
export function resolveOccurTypeText(code: string): string {
  return OCCUR_TYPE_TEXT[code] || code;
}

// 자동 등록건 여부 — 고객 발생건이거나 분류가 비어 있으면 수동 등록으로 간주
export function isManualNcr(occurType: string): boolean {
  return occurType === "CUSTOMER" || !occurType;
}
