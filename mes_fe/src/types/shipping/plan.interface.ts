/* 출하계획(Shipping Plan) 한 줄 */
export interface ShippingPlanData {
  planSq?: number;
  no?: string | number;
  selected?: boolean;
  itemCode: string;
  itemName: string;
  itemSq?: number;
  basisWeight: string;
  width: string;
  length: string;
  customerName: string;
  customerCode?: string;
  customerSq?: number;
  salesOrderQty: string;
  currentStock: string;
  storageLocation: string;
  planQty: string;
  planQtyEa?: number;
  planStatus?: string;
  lotNo?: string;
  orderNo?: string;
  orderDtlSq?: number;
  expectedShipDate: string;
  remark?: string;
}
