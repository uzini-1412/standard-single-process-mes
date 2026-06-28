/* 수주(주문) 관련 타입 */
import type { CreatePageMode } from "../common/pageMode";

export type OrderPageMode = CreatePageMode;

/* 수주 등록 폼의 품목 행 */
export interface OrderItem {
  no: number;
  selected: boolean;
  itemSq?: number;
  itemCode: string;
  itemName: string;
  basisWeight: string;
  width: string;
  length: string;
  orderQty: string;
  orderQtyEa: string;
  orderQtyM2: string;
  weight: string;
  unitPrice: string;
  unitVatAmt: string;
  supplyAmt: string;
  vatAmt: string;
  totalAmt: string;
}

/* 수주 목록 한 줄 */
export interface OrderData {
  no: number;
  orderSq?: number;
  orderNo: string;
  orderDate: string;
  customerSq?: number;
  customerCode: string;
  customerName: string;
  itemCode: string;
  itemName: string;
  basisWeight: string;
  width: string;
  length: string;
  orderQty: string;
  orderQtyEa: string;
  orderQtyM2: string;
  totalWeight: string;
  unitPrice: string;
  totalAmt: string;
  deliveryReqDate: string;
  deliveryPlace: string;
  remark: string;
}
