/**
 * Type contracts used across the tablet front-end.
 *
 * Most of the shapes below correspond one-to-one with server-side DTOs, so the
 * property names cannot drift away from what the API actually emits.
 */

/* =================================================================== */
/*  Common                                                             */
/* =================================================================== */

/**
 * Standard wrapper that the backend wraps around every response payload.
 * The concrete payload lives in `data`; the rest is status metadata.
 */
export interface ApiResponse<T> {
  code: string;
  success: boolean;
  data: T;
  message: string;
}

/* =================================================================== */
/*  Sign-in / session                                                  */
/* =================================================================== */

/** What the login form posts to authenticate a user. */
export interface LoginReq {
  password: string;
  userId: string;
}

/** Server response handed back once authentication succeeds. */
export interface LoginRes {
  staffNo: string;
  staffSq: number;
  role: string;
  token: string;
  userName: string;
  userId: string;
}

/**
 * The signed-in user as the client keeps it in memory. Mirrors `LoginRes`
 * but represents the active session rather than the raw login reply.
 */
export interface UserInfo {
  staffSq: number;
  staffNo: string;
  token: string;
  userId: string;
  userName: string;
  role: string;
}

/* =================================================================== */
/*  Item master & BOM                                                  */
/* =================================================================== */

/** One row of the item master table. */
export interface ItemRes {
  itemSq: number;
  itemCode: string;
  itemName: string;
  itemType: string;
  accountType: string;
  spec: string;
  basisWeight: number;
  width: number;
  length: number;
  weight: number;
  storageLocation: string;
  safetyStock: number;
  optimalStock: number;
  useYn: boolean;
}

/**
 * A single material entry within a recipe (i.e. one BOM line). Many of the
 * descriptive fields are optional because they are only populated on the
 * detailed list view.
 */
export interface RecipeRes {
  recipeSq: number;
  recipeNo: string;

  // product side of the BOM line
  productItemSq: number;
  productItemCode?: string;
  productItemName?: string;
  productCode?: string;
  productName?: string;
  recipeWeight?: number;
  accountType?: string;

  // material (component) side of the BOM line
  materialItemSq: number;
  materialItemCode?: string;
  materialItemName?: string;
  materialCode?: string;
  materialName?: string;
  materialSpec?: string;
  materialType: string;

  requiredQty: number;
  ratio: number;
  remark: string;
  useYn: boolean;
}

/* =================================================================== */
/*  Work orders                                                        */
/* =================================================================== */

/** A detail line nested under a work order. */
export interface WorkOrderDetailRes {
  woDtlSq: number;
  itemSq: number;
  itemCode: string;
  itemName: string;
  lotNo: string;
  orderQty: number;
  manageWeight: number;
  width: number;
  length: number;
}

/** A work order header bundled with its associated detail lines. */
export interface WorkOrderRes {
  workOrderSq: number;
  workOrderDate: string;
  workStatus: string;

  lineSq: number;
  lineName: string;

  itemSq: number;
  itemCode: string;
  itemName: string;

  recipeSq: number;
  targetQty: number;
  basisWeight: number;
  totalWidth: number;

  lotNo: string;
  productionLotNo: string;

  details: WorkOrderDetailRes[];
}

/* =================================================================== */
/*  Stock / inventory                                                  */
/* =================================================================== */

/** On-hand quantity snapshot for a particular material lot. */
export interface MaterialStockRes {
  stockSq: number;
  itemSq: number;
  itemCode: string;
  itemName: string;
  accountType: string;
  lotNo: string;
  itemWeight: number;
  currentQty: number;
  warehouseLoc: string;
  stockStatus: string;
  lastInDate: string;
  optimalStock: number;
}

/* =================================================================== */
/*  Shipping                                                           */
/* =================================================================== */

/**
 * A shipment order row as delivered by the order-list endpoint. The shape is
 * pre-flattened on the server: header-level summary attributes sit alongside
 * the per-detail attributes in a single object.
 */
export interface ShipmentOrderRes {
  // header summary portion
  shipOrderSq: number;
  expectedShipDate: string;
  expectedShipTime: string;
  customerName: string;
  destination: string;
  orderStatus: string;
  representativeItemName: string;
  totalOrderQty: number;

  // detail portion that has been merged into this same row
  shipDtlSq: number;
  planSq: number;
  itemSq: number;
  itemCode: string;
  itemName: string;
  basisWeight: number;
  width: number;
  length: number;
  planQty: number;
  planQtyEa: number;
  lotNo: string;
  customerSq: number;
  customerCode: string;
}

/** Request body used to register the actual outcome of a shipment. */
export interface ShipmentResultSaveReq {
  shipDtlSq: number;
  customerSq: number;
  itemSq: number;
  lotNo: string;
  shippedQty: number;
  shippedQtyEa: number;
  shipDate: string;
  remark: string;
  writerId: string;
}
