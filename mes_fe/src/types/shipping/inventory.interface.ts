export type ViewMode = "list" | "detail" | "edit" | "create";

/* 제품 재고 현황 한 줄 */
export interface ProductInventoryData {
  no: string | number;
  itemSq?: number;
  itemType: string;          // 제품구분
  itemCode: string;          // 품번
  itemName: string;          // 품명
  basisWeight: string;       // 평량
  width: string;             // 폭
  length: string;            // 길이
  currentStockM: string;     // 현재고(m)
  currentStockEa: number;    // 재고롤수(EA) - 정수
  prevMonthStockM: string;   // 전월재고량
  currentMonthProdM: string; // 당월 생산량
  currentMonthShipM: string; // 당월 출하량(m)
  warehouseLocation: string; // 창고구분
  storageLoc: string;        // 제품보관위치
  remark: string;            // 비고
}

/* 재고 입출고 이력 */
export interface InventoryHistoryData {
  no: number;
  warehouseLoc: string;
  changeType: string;
  changeDetail: string;
  changeQty: string;
  changeDate: string;
}

/* 제품 재고 분석 한 줄 */
export interface ProductInventoryAnalysisData {
  no: string | number;
  itemType: string;
  itemCode: string;
  itemName: string;
  basisWeight: string;
  width: string;
  length: string;
  currentStockM: string;
  currentStockEa: number;
  currentMonthProdM: string;
  prevMonthStockM: string;
  currentMonthShipM: string;
  currentMonthShipEa: number;
  shipMinus1Month: string;
  shipMinus2Month: string;
  shipMinus3Month: string;
  expectedShipM: string;
  storageLoc: string;
  remark: string;
}

/* 제품 창고 입고 현황 한 줄 */
export interface ProductLocationData {
  no: number;
  itemCode: string;
  itemName: string;
  basisWeight: string;
  width: string;
  length: string;
  warehouseLocation: string;
  storageLoc: string;
  currentStockM: string;
  currentStockEa: number;
  remark: string;
}
