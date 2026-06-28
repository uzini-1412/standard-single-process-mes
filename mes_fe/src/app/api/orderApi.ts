/** 수주 API 클라이언트 — BE /api/sales-order (SalesOrderController). [고객주문관리 > 수주정보] 외 공용. */
import { emptyPage, postJson, postVoid, type PageEnvelope } from './request';

export interface OrderSearchParams {
  dateFrom?: string;
  dateTo?: string;
  customerSq?: number;
  keyword?: string;
}

export interface OrderDetailDto {
  orderDtlSq?: number;
  itemSq: number;
  orderQty: number;
  orderQtyEa?: number;
  orderQtyM2?: number;
  orderUnit?: string;
  unitPrice: number;
  unitVatAmt?: number;
  spec?: string;
  basisWeight?: number;
  width?: number;
  length?: number;
  weight?: number;
  supplyAmt?: number;
  vatAmt?: number;
  totalAmt?: number;
  remark?: string;
}

export interface OrderSaveReq {
  orderSq?: number;
  orderNo?: string;
  customerSq: number;
  orderDate: string;
  deliveryReqDate?: string;
  deliveryPlace?: string;
  paymentTerms?: string;
  remark?: string;
  taxApplyYn?: boolean;
  taxRate?: number;
  writerId?: string;
  details: OrderDetailDto[];
}

export interface OrderDetailRes {
  orderDtlSq: number;
  itemSq: number;
  itemCode: string;
  itemName: string;
  orderQty: number;
  orderQtyEa: number;
  orderQtyM2: number;
  orderUnit: string;
  unitPrice: number;
  unitVatAmt?: number;
  supplyAmt?: number;
  vatAmt?: number;
  totalAmt: number;
  spec: string;
  basisWeight: number;
  width: number;
  length: number;
  weight: number;
  remark: string;
  plannedQty?: number;
}

export interface OrderRes {
  orderSq: number;
  orderNo: string;
  customerSq: number;
  customerCode: string;
  customerName: string;
  orderDate: string;
  deliveryReqDate: string;
  deliveryPlace: string;
  totalOrderAmt: number;
  paymentTerms: string;
  orderStatus: string;
  remark: string;
  taxApplyYn?: boolean;
  taxRate?: number;
  regDt: string;
  details: OrderDetailRes[];
}

export function fetchOrderList(params: OrderSearchParams = {}): Promise<OrderRes[]> {
  return postJson<OrderRes[]>('/sales-order/list', params);
}

export type OrderPageData<T> = PageEnvelope<T>;

export interface OrderListPagedParams extends OrderSearchParams {
  page?: number;
  size?: number;
  sortField?: string;
  sortDirection?: 'ASC' | 'DESC';
}

export async function fetchOrderListPaged(params: OrderListPagedParams = {}): Promise<OrderPageData<OrderRes>> {
  const page = await postJson<OrderPageData<OrderRes> | null>('/sales-order/list-paged', params);
  return page ?? emptyPage<OrderRes>();
}

export function fetchOrderById(orderSq: number): Promise<OrderRes> {
  return postJson<OrderRes>('/sales-order/detail', { orderSq });
}

export async function generateOrderNo(): Promise<string> {
  const result = await postJson<{ orderNo: string }>('/sales-order/generate-order-no', {});
  return result.orderNo;
}

export function saveOrder(data: OrderSaveReq): Promise<void> {
  return postVoid('/sales-order/save', data);
}

export function deleteOrder(orderIds: number[]): Promise<void> {
  return postVoid('/sales-order/delete', { orderIds });
}
