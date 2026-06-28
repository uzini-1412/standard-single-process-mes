import type { ListColumn } from "../../../components/common/ListTable";
import { productInventoryAnalysisColumns } from "@/app/constants/shipping";
import { ProductInventoryAnalysisData } from "@/types/shipping/inventory.interface";

// 우측 정렬 + 천단위 콤마 대상이 되는 수치형 컬럼 키
const NUMERIC_ANALYSIS_FIELDS = new Set<string>([
  "basisWeight", "width", "length", "currentStockM", "currentStockEa",
  "currentMonthProdM", "prevMonthStockM", "currentMonthShipM",
  "shipMinus3Month", "shipMinus2Month", "shipMinus1Month", "expectedShipM",
]);

// 분석 그리드 컬럼: 공용 정의에 수치형이면 number 포맷을 추가
export const ANALYSIS_GRID_COLUMNS: ListColumn<ProductInventoryAnalysisData>[] =
  productInventoryAnalysisColumns.map((column) => ({
    key: column.key,
    label: column.label,
    width: column.width,
    ...(NUMERIC_ANALYSIS_FIELDS.has(column.key) ? { format: "number" as const } : {}),
  }));

// 서버 stock row를 분석 화면 표시용 데이터로 정규화
export function mapAnalysisRow(raw: any, sequenceNo: number): ProductInventoryAnalysisData {
  return {
    no: sequenceNo,
    itemType: raw.itemType || "",
    itemCode: raw.itemCode || "",
    itemName: raw.itemName || "",
    basisWeight: raw.basisWeight?.toString() || "",
    width: raw.width?.toString() || "",
    length: raw.length?.toString() || "",
    currentStockM: raw.currentStockM?.toString() || "0",
    currentStockEa: Number(raw.currentStockEa) || 0,
    currentMonthProdM: raw.currentMonthProdM?.toString() || "0",
    prevMonthStockM: raw.prevMonthStockM?.toString() || "0",
    currentMonthShipM: raw.currentMonthShipM?.toString() || "0",
    currentMonthShipEa: Number(raw.currentMonthShipEa) || 0,
    shipMinus1Month: raw.shipMinus1Month?.toString() || "0",
    shipMinus2Month: raw.shipMinus2Month?.toString() || "0",
    shipMinus3Month: raw.shipMinus3Month?.toString() || "0",
    expectedShipM: raw.expectedShipM?.toString() || "0",
    storageLoc: raw.storageLoc || "",
    remark: raw.remark || "",
  };
}

// 품번/품명 부분일치(대소문자 무시) 클라이언트 필터
export function matchesTextFilters(
  item: ProductInventoryAnalysisData,
  itemCode: string,
  itemName: string,
): boolean {
  if (itemCode && !item.itemCode.toLowerCase().includes(itemCode.toLowerCase())) return false;
  if (itemName && !item.itemName.toLowerCase().includes(itemName.toLowerCase())) return false;
  return true;
}
