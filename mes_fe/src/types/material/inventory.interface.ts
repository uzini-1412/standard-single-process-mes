// Row model for the material-stock grid
export interface MaterialInventoryData {
  no: number;
  stockSq: number;
  itemSq: number;
  itemCode: string;
  itemName: string;
  accountType: string;
  itemColor: string;
  itemWeight: string;
  optimalStock: string;
  stockStatus: string;
  currentQty: number;
  warehouseLocation: string;
  warehouseLoc: string;
}

// View states for the inventory page
export type MaterialInventoryViewMode = "list" | "detail" | "edit";

// Row model for the stock-movement (in/out) ledger
export interface InventoryHistoryData {
  no: number;
  regDt: string;
  warehouseLoc: string;
  lotNo: string;          // purchase LOT identifier
  changeType: string;     // inbound / outbound / adjustment / pre-receipt adjustment
  changeQty: number;      // signed movement amount (negative when stock decreases)
  currQty: number;        // running balance after the movement
}
