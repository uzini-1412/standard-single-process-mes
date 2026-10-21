/** [생산관리 > 생산계획] 보드 화면에서 쓰는 순수 계산/포맷 유틸 모음. 외부 노출 없음. */

/** 우측 정렬 + 천단위 콤마가 필요한 수량성 컬럼 키 (금액 컬럼은 존재하지 않음). */
export const QUANTITY_COLUMN_KEYS = new Set<string>([
  "currentStock",
  "planQty",
  "productionSpeed",
  "estimatedProductionTime",
]);

/** API 응답 1건을 보드 테이블 행 형태로 정규화한다. */
export function normalizePlanRow(plan: any, index: number) {
  return {
    planSq: plan.planSq,
    itemSq: plan.itemSq,
    no: String(index + 1),
    lineName: plan.lineName,
    planDate: plan.planDate,
    itemCode: plan.itemCode,
    itemName: plan.itemName,
    basisWeight: plan.basisWeight,
    width: plan.width,
    length: plan.length,
    currentStock: plan.currentStock,
    planQty: plan.planQty,
    weight: plan.weight,
    manageWeight: plan.weight,
    productionSpeed: plan.productionSpeed,
    estimatedProductionTime: plan.estimatedProductionTime,
    startTime: plan.startTime,
    endTime: plan.endTime,
    remark: plan.remark,
    regDt: plan.regDt,
  };
}
