// Sales status types

// Customer dropdown option
export interface SalesStatusCustomerOption {
  customerCode: string;
  customerName: string;
}

// Detail line returned by the sales-status API
export interface SalesStatusItem {
  shipResultSq: number;
  shipOrderSq: number;
  lotNo: string;
  customerCode: string;
  customerName: string;
  shipDate: string;
  itemCode: string;
  itemName: string;
  qty: number;
  unitPrice: number;
  supplyAmt: number;
  vatAmt: number;
  totalAmt: number;
  remark: string;
}

// Server grouped header row (upper table); items are fetched separately
export interface SalesStatusGroupRes {
  shipOrderSq: number;
  customerCode: string;
  customerName: string;
  shipDate: string;
  lotNo: string;
  salesAmount: number;
}

// Monthly-total trend point
export interface SalesStatusTrendRes {
  yearMonth: string; // "YYYY-MM"
  amount: number;
}

// Upper-table grouped summary held in FE state; items filled on popup open
export interface SalesStatusSummary extends SalesStatusGroupRes {
  no: number;
  items: SalesStatusItem[];
}
