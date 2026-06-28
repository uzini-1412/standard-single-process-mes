export interface MaterialChildRow {
  id: string;
  materialItemSq: number; // 구성품(소재) itemSq — 투입 저장 키
  materialType: string;   // 소재구분
  materialCode: string;   // 소재품번
  materialName: string;   // 소재품명
  materialSpec: string;   // 규격
  reqQty: number;         // 소요량(g) = requiredQty(g/m²) × 면적(m²)
  ratio: number;          // 비중(%)
}

export interface RecipeParentRow {
  id: string;
  workOrderSq: number;
  productionLotNo: string;
  lineName: string;
  prodCode: string;       // = productItemCode
  prodName: string;       // = productItemName
  planQty: number;
  recipeNo: string;
  children: MaterialChildRow[];
}

/** 자재 LOT별 재고 선택지 (mes_material_stock_tb → /material/stock/list) */
export interface StockLotOption {
  stockSq: number;
  lotNo: string;
  availableQty: number;
  currentQty: number;
}

/** 화면에서 작업자가 입력 중인 자재별 투입 초안 */
export interface MaterialInputDraft {
  stockSq: number | null;
  purchaseLotNo: string;
  stockLotNo: string;
  inputQty: number;
}

/** 저장된 투입 기록 (/production/material-input/list) */
export interface SavedInputRecord {
  materialItemSq: number;
  inputQty: number;
  calculatedQty: number;
  inputStatus: string;        // RESERVED | CONFIRMED | PLC_AUTO
  plcRawG: number | null;
  purchaseLotNo: string;
}

export interface MaterialFeedSheetProps {
  onBack: () => void;
  onHome: () => void;
  workOrderData?: any;
}
