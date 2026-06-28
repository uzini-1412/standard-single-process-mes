/* 출하지시(Shipping Order) 타입 */
export interface ShippingOrderData {
  shipOrderSq?: number;
  planSq?: number;
  salesOrderDtlSq?: number;   // 동일 수주의 plan/지시 묶음 키 (잔여수량 계산)
  customerCode: string;
  customerName: string;
  itemCode: string;
  itemName: string;
  basisWeight: string;
  width: string;
  length: string;
  planQty: string;
  planQtyEa?: number;
  currentStock: string;
  salesOrderQty: string;
  storageLocation: string;
  customerReq: string;
  destination: string;
  expectedShipDate: string;
  expectedShipTime: string;
  orderStatus?: string;
  shipStatus?: string;
  lotNo?: string;
  productLotNo?: string;      // 출하지시 확정 제품재고 LOT (검사·출고에 사용)
  inspectRegistered?: boolean; // 검사 등록 split은 수정 화면에서 LOT/수량 잠금
  inspectJudge?: string;      // 판정코드 OK/NG/null — NG면 예약수량 자동 해제
}

export type ShippingOrderFormData = Omit<ShippingOrderData, "shipOrderSq">;

export interface ShippingOrderItem extends ShippingOrderData {
  no: number;
  selected: boolean;
  force?: boolean;            // 수주잔여 초과 등록 확인 플래그 (LOT 모달 "초과 확인")
}
