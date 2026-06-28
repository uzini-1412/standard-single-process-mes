/* 출하실적 — 화면 표시용 행 (수량은 문자열 decimal 유지) */
export interface ShippingPerformanceData {
  id: string;
  no: string;
  shipDate: string;       // 납품일
  customerName: string;
  itemCode: string;
  itemName: string;
  basisWeight: string;
  width: string;
  length: string;
  lotNo: string;
  orderQty: string;       // 출하지시량(m)
  orderQtyEa: number;     // 출하지시량(EA) 정수
  shippedQty: string;     // 출하량(m)
  shippedQtyEa: number;   // 출하량(EA) 정수
}

/* 출하실적 — 백엔드 응답 (수량은 number) */
export interface ShipmentResultRes {
  shipResultSq: number;
  shipDate: string;
  customerName: string;
  itemCode: string;
  itemName: string;
  basisWeight: number;
  width: number;
  length: number;
  lotNo: string;
  orderQty: number;
  orderQtyEa: number;
  shippedQty: number;
  shippedQtyEa: number;
  regDt: string;
}
