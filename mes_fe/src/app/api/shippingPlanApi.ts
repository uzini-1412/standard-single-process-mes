/** 출하계획 API 클라이언트 — BE /api/shipment/plan (ShipmentController). [출하관리 > 출하계획] 외 출하지시 폼에서도 사용. */
import { deleteJson, getJson, postJson, postVoid, putJson, type PageEnvelope } from './request';

export interface ShippingPlanSearchReq {
  dateFrom?: string;
  dateTo?: string;
}

export interface ShippingPlanSaveReq {
  planSq?: number;
  salesOrderDtlSq?: number;
  customerSq?: number;
  itemSq?: number;
  customerCode?: string;
  customerName?: string;
  itemCode?: string;
  itemName?: string;
  basisWeight?: string;
  width?: string;
  length?: string;
  salesOrderQty?: string;
  currentStock?: string;
  storageLocation?: string;
  expectedShipDate: string;
  planQty: string;
  planQtyEa?: number;
  lotNo?: string;
  orderNo?: string;
  remark?: string;
  writerId?: string;
}

export interface ItemStockRes {
  itemCode: string;
  itemName: string;
  basisWeight: number | null;
  width: number | null;
  length: number | null;
  currentStock: number;
  storageLocation: string;
}

// 조건에 맞는 출하계획 목록을 가져온다.
export async function loadShippingPlans(params: ShippingPlanSearchReq = {}) {
  return (await postJson<any[] | null>('/shipment/plan/list', params)) ?? [];
}

// 출하계획 한 건을 등록한다.
export function saveShippingPlan(data: ShippingPlanSaveReq) {
  return postVoid('/shipment/plan/save', data);
}

// 여러 건의 출하계획을 한 번에 등록한다.
export function saveShippingPlanBatch(data: ShippingPlanSaveReq[]) {
  return postVoid('/shipment/plan/save-list', data);
}

// 기존 출하계획 한 건을 수정한다.
export function modifyShippingPlan(planSq: number, data: ShippingPlanSaveReq) {
  return putJson<void>(`/shipment/plan/${planSq}`, data);
}

// 출하계획 한 건을 제거한다.
export function removeShippingPlan(planSq: number) {
  return deleteJson<void>(`/shipment/plan/${planSq}`);
}

// 품목코드로 현재고와 보관위치를 조회한다.
export function loadItemStockByCode(itemCode: string): Promise<ItemStockRes> {
  return getJson<ItemStockRes>('/shipment/item-stock', { params: { itemCode } });
}

// 저장 전에 다음 출하계획 Lot-No를 미리 받아온다.
export function peekNextShippingLotNo(): Promise<string> {
  return getJson<string>('/shipment/plan/next-lot-no');
}

// 품목별 개별 LOT 재고 조회 (완제품재고 페이지용)
export interface ProductStockLot {
  stockSq: number;
  itemSq: number;
  itemCode: string;
  itemName: string;
  accountType: string;
  lotNo: string;
  productionLotNo: string;
  currentQtyM: number;
  currentQtyEa: number;
  basisWeight: number;
  width: number;
  length: number;
  storageLoc: string;
  stockStatus: string;
  lastInDate: string;
}

export type PageData<T> = PageEnvelope<T>;

export async function loadProductStockLots(params: {
  itemCode?: string;
  itemName?: string;
} = {}): Promise<ProductStockLot[]> {
  const r = await postJson<PageData<ProductStockLot> | null>(
    '/product-stock/lot-list',
    { ...params, page: 0, size: 10000 }
  );
  return r?.content ?? [];
}
