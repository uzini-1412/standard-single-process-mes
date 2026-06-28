import type { ListColumn } from "../../../components/common/ListTable";
import { PRODUCT_INVENTORY_COLUMNS } from "@/app/constants/shipping";
import { ProductInventoryData } from "@/types/shipping/inventory.interface";

// 우측 정렬 + 천단위 콤마가 필요한 수치형 컬럼 키 모음
const NUMERIC_STOCK_FIELDS = new Set<string>([
  "basisWeight", "width", "length", "currentStockM", "currentStockEa",
  "prevMonthStockM", "currentMonthProdM",
]);

// 메인 재고 그리드 컬럼: 공용 컬럼 정의에 수치형이면 number 포맷을 덧붙임
export const STOCK_GRID_COLUMNS: ListColumn<ProductInventoryData>[] = PRODUCT_INVENTORY_COLUMNS.map(
  (column) => ({
    key: column.key,
    label: column.label,
    width: column.width,
    ...(NUMERIC_STOCK_FIELDS.has(column.key) ? { format: "number" as const } : {}),
  }),
);

// 입출고 이력 테이블에서 우측 정렬할 수치 컬럼 (값 가공은 매퍼가 이미 끝냄 → 정렬만)
export const HISTORY_NUMERIC_FIELDS = new Set<string>(["qty", "stockAfter"]);

export interface InOutHistoryRow {
  no: number;
  itemCode: string;
  itemName: string;
  date: string;
  type: string;
  qty: string;
  stockAfter: string;
  storageLoc: string;
  lotNo: string;
}

export const HISTORY_GRID_COLUMNS = [
  { key: "no", label: "No.", width: "50px" },
  { key: "itemCode", label: "품번", width: "100px" },
  { key: "itemName", label: "품명", width: "120px" },
  { key: "date", label: "입출고일자", width: "100px" },
  { key: "type", label: "입출고구분", width: "90px" },
  { key: "qty", label: "입출고수량", width: "100px" },
  { key: "stockAfter", label: "누적재고량", width: "110px" },
  { key: "storageLoc", label: "보관위치", width: "120px" },
  { key: "lotNo", label: "생산 Lot-No", width: "120px" },
];

// 변경 구분 코드를 한글 라벨로 변환
export function resolveChangeTypeLabel(code: string): string {
  switch (code) {
    case "INBOUND":
      return "입고";
    case "SHIP":
      return "출고";
    case "ADJUST":
      return "조정";
    default:
      return code || "";
  }
}

// 증감 수량을 부호(+/-)와 천단위 콤마가 붙은 문자열로 표현
export function renderSignedQuantity(value: number | string): string {
  const numeric = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numeric)) return String(value ?? "");
  const prefix = numeric > 0 ? "+" : numeric < 0 ? "-" : "";
  return prefix + Math.abs(numeric).toLocaleString();
}

// 서버 stock row를 화면 표시용 ProductInventoryData로 정규화
export function mapStockRow(raw: any, sequenceNo: number): ProductInventoryData {
  return {
    no: sequenceNo,
    itemSq: raw.itemSq,
    itemType: raw.itemType || "",
    itemCode: raw.itemCode || "",
    itemName: raw.itemName || "",
    basisWeight: raw.basisWeight?.toString() || "",
    width: raw.width?.toString() || "",
    length: raw.length?.toString() || "",
    currentStockM: raw.currentStockM?.toString() || "0",
    currentStockEa: Number(raw.currentStockEa) || 0,
    prevMonthStockM: raw.prevMonthStockM?.toString() || "0",
    currentMonthProdM: raw.currentMonthProdM?.toString() || "0",
    currentMonthShipM: raw.currentMonthShipM?.toString() || "0",
    warehouseLocation: raw.warehouseLocation || "",
    storageLoc: raw.storageLoc || "",
    remark: raw.remark || "",
  };
}
