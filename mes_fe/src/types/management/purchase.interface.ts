// Purchase status (supplier ledger) types

// Customer dropdown option
export interface PurchaseStatusCustomerOption {
  customerCode: string;
  customerName: string;
}

// Detail line returned by the purchase-status API
export interface PurchaseStatusItem {
  inboundSq: number;
  accountType: string;
  customerCode: string;
  customerName: string;
  inboundDate: string;
  itemCode: string;
  itemName: string;
  qty: number;
  unitPrice: number;
  supplyAmt: number;
  vatAmt: number;
  totalAmt: number;
  remark: string;
}

// Server-side grouped header row
export interface PurchaseStatusGroupRes {
  accountType: string;
  customerCode: string;
  customerName: string;
  inboundDate: string;
  purchaseAmount: number;
}

// Monthly-total trend point
export interface PurchaseStatusTrendRes {
  yearMonth: string; // "YYYY-MM"
  amount: number;
}

// Upper-table grouped summary held in FE state (group row + its detail lines)
export interface PurchaseStatusSummary extends PurchaseStatusGroupRes {
  no: number;
  items: PurchaseStatusItem[];
}
