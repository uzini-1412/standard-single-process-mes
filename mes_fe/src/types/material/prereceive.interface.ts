// Available view states for the pre-receiving page
export type PreReceivingViewMode = "list" | "detail" | "create" | "edit";

// Expanded purchase-order line shown when picking pre-receipt targets
export interface AvailableOrderItem {
  no: number;
  orderDtlSq: number;
  itemSq: number;
  orderNo: string;
  customerCode: string;
  customerName: string;
  accountType: string;
  itemCode: string;
  itemName: string;
  spec: string;
  orderUnit: string;
  orderDate: string;
  inReqDate: string;
  orderQty: string;
  totalInboundQty: string;
}

// Editable order-line row rendered in the lower input table
export interface PreReceivingTableItem extends AvailableOrderItem {
  selected: boolean;
  inboundDate: string;
  inboundQty: string;
  purchaseLotNoPreview: string;
}
