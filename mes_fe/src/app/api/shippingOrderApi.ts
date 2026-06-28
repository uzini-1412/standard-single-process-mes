/** 출하지시 API 클라이언트 — BE /api/shipment/order (ShipmentController). [출하관리 > 출하지시관리]. */
import { deleteJson, postJson, postVoid, putJson } from './request';

export interface ShippingOrderSearchReq {
  dateFrom?: string;
  dateTo?: string;
}

export interface ShippingOrderSaveReq {
  planSq?: number;
  expectedShipDate: string;
  expectedShipTime?: string;
  customerCode?: string;
  customerName?: string;
  itemCode?: string;
  itemName?: string;
  basisWeight?: string;
  width?: string;
  length?: string;
  planQty?: string;
  planQtyEa?: number;
  currentStock?: string;
  salesOrderQty?: string;
  storageLocation?: string;
  destination?: string;
  customerReq?: string;
  writerId?: string;
  productLotNo?: string;
  // 사용자가 수주 잔량 초과 등록을 명시적으로 승인한 플래그. true면 백엔드 cap 검증을 생략한다.
  force?: boolean;
}

// 조건에 맞는 출하지시 목록을 가져온다.
export async function loadShippingOrders(params: ShippingOrderSearchReq = {}) {
  return (await postJson<any[] | null>('/shipment/order/list', params)) ?? [];
}

// 여러 건의 출하지시를 한 번에 등록한다.
export function saveShippingOrderBatch(items: ShippingOrderSaveReq[]) {
  return postVoid('/shipment/order/save-list', items);
}

// 기존 출하지시 한 건을 수정한다.
export function modifyShippingOrder(shipOrderSq: number, data: ShippingOrderSaveReq) {
  return putJson<void>(`/shipment/order/${shipOrderSq}`, data);
}

// 출하지시 한 건을 제거한다.
export function removeShippingOrder(shipOrderSq: number) {
  return deleteJson<void>(`/shipment/order/${shipOrderSq}`);
}
