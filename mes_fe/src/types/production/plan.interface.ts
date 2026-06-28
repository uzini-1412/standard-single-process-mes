/**
 * 생산계획 화면 모델.
 *
 * 라인·일자 단위 계획 한 건을 폼에서 다루는 형태. 품목·라인·시트치수 공통부는
 * `_shared` 조립 블록에서 가져오고, 계획 고유 수치만 여기에 둔다.
 */
import type { ItemRefView, LineRefView, SheetMetricsText } from "./_shared";

/**
 * 생산계획 한 건의 폼 모델.
 * 공통 식별·치수 위에 계획 수량/생산성/가동 시간대를 얹는다.
 */
export interface ProductionPlanData extends ItemRefView, LineRefView, SheetMetricsText {
  planSq?: number;
  planDate: string;

  // ── 수량·재고 ──
  currentStock: number;
  planQty: number;

  // ── 평량·생산성 (폼 문자열) ──
  weight: string;
  manageWeight: string;
  productionSpeed: string;
  estimatedProductionTime: string;

  // ── 가동 시간대 (HH:mm) ──
  startTime?: string;
  endTime?: string;

  // ── 부가 ──
  remark: string;
  itemType?: string;
  regDt?: string;
  orderDate?: string;
}

/** 스케줄 그리드에 뿌리는 계획 행 (선택 상태·행번호 포함). */
export interface ProductionPlanTableRow extends ProductionPlanData {
  selected: boolean;
  no: string;
}
