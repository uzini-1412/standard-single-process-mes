/* LOT 추적(정/역방향) 화면에서 쓰는 타입 모음 */

/* ----- 검색 조건 / 결과 행 ----- */
export interface LotTraceSearchReq {
  direction?: string;    // FORWARD, BACKWARD
  searchType?: string;   // PURCHASE, MFG, SHIP
  searchValue?: string;
  customerName?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface LotTraceSearchItem {
  id: number;
  lotNo: string;
  type: string;       // 구매LOT, 제조LOT, 출하
  typeBg: string;     // purchase, mfg, ship
  party: string;
  date: string;
  itemCode: string;
  basisWeight: number;
  width: string;
  qty: string;
  linkedLot: string;
}

/* ----- 수주 역참조 행 ----- */
export interface SalesOrderRefItem {
  shipLotNo: string;
  shipDate: string;
  shippedQty: string;
  customerName: string;
  itemCode: string;
  salesOrderNo: string;
  salesOrderDate: string;
  salesOrderQty: string;
  remainQty: string;
}

/* ===== 구매 LOT 상세 ===== */
export interface PurchaseInspectionItem {
  inspectNo: string;
  inspectDate: string;
  inspectorName: string;
  sampleCount: number;
  result: string;
}

export interface PurchaseMfgLinkItem {
  mfgLotNo: string;
  inputTime: string;
  inputQty: string;
  standardRatio: string;
  overRate: string;
  over: boolean;
}

export interface PurchaseStockItem {
  lotNo: string;
  inboundDate: string;
  vendorName: string;
  receivedQty: string;
  consumedQty: string;
  currentQty: string;
  status: string;
  location: string;
}

export interface PurchaseLotDetailRes {
  lotNo: string;
  receiptDate: string;
  vendorName: string;
  vendorCode: string;
  itemCode: string;
  itemName: string;
  purchaseOrderNo: string;
  orderedQty: string;
  receivedQty: string;
  storageLocation: string;
  inspections: PurchaseInspectionItem[];
  mfgLinks: PurchaseMfgLinkItem[];
  stockByLot: PurchaseStockItem[];
}

/* ===== 제조 LOT 상세 ===== */
export interface MfgProductWeightItem {
  lotNo: string;
  rollNo: number;
  prodWidth: string;
  prodLength: string;
  realBasisWeight: string;
  netWeight: string;
  grossWeight: string;
  judgeCode: string;
  workDate: string;
}

export interface MfgMaterialItem {
  purchaseLotNo: string;
  itemCode: string;
  materialType: string;
  standardRatio: string;
  inputQty: string;
  overRate: string;
  over: boolean;
}

export interface MfgQaItem {
  inspectType: string;
  inspectTime: string;
  inspectItem: string;
  standard: string;
  measured: string;
  pass: boolean;
}

export interface MfgShipLinkItem {
  shipLotNo: string;
  shipDate: string;
  customerName: string;
  shippedQty: string;
  qaResult: string;
  salesOrderNo: string;
}

export interface MfgDefectItem {
  defectType: string;
  qty: string;
  occurTime: string;
  action: string;
}

export interface MfgLotDetailRes {
  lotNo: string;
  prodDate: string;
  itemCode: string;
  itemName: string;
  basisWeight: string;
  width: string;
  orderedQty: string;
  actualQty: string;
  lineTime: string;
  goodDefect: string;
  speed: string;
  managedWeight: string;
  productWeights: MfgProductWeightItem[];
  materials: MfgMaterialItem[];
  qaResults: MfgQaItem[];
  qaLotNo: string;
  shipLinks: MfgShipLinkItem[];
  defects: MfgDefectItem[];
}
