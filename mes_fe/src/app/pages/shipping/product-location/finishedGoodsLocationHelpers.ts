import { ProductLocationData } from "@/types/shipping/inventory.interface";
import { productLocationColumns } from "@/app/constants/shipping";
import type { ListColumn } from "../../../components/common/ListTable";

// 우측 정렬 + 천단위 콤마로 표기할 수치형 컬럼 키 집합
const NUMERIC_COLUMN_KEYS = new Set<string>([
  "basisWeight",
  "width",
  "length",
  "currentStockM",
  "currentStockEa",
]);

// 도메인 컬럼 정의를 ListTable 컬럼으로 변환하고, 수치 컬럼에는 number 포맷을 부여한다
export const stockGridColumns: ListColumn<ProductLocationData>[] = productLocationColumns.map(
  (column) => ({
    key: column.key,
    label: column.label,
    width: column.width,
    ...(NUMERIC_COLUMN_KEYS.has(column.key) ? { format: "number" as const } : {}),
  }),
);

// 서버 응답 한 건을 화면 표시용 행 객체로 정규화한다 (널/빈값 방어)
export const toLocationRow = (raw: any, rowIndex: number): ProductLocationData => ({
  no: rowIndex + 1,
  itemCode: raw.itemCode || "",
  itemName: raw.itemName || "",
  basisWeight: raw.basisWeight?.toString() || "",
  width: raw.width?.toString() || "",
  length: raw.length?.toString() || "",
  warehouseLocation: raw.warehouseLocation || "",
  storageLoc: raw.storageLoc || "",
  currentStockM: raw.currentStockM?.toString() || "0",
  currentStockEa: Number(raw.currentStockEa) || 0,
  remark: raw.remark || "",
});

export interface LocationQueryState {
  itemCode: string;
  itemName: string;
  storageLoc: string;
}

export const EMPTY_LOCATION_QUERY: LocationQueryState = {
  itemCode: "",
  itemName: "",
  storageLoc: "",
};

// 입력된 조회 조건으로 행을 부분 일치(대소문자 무시) 필터링한다
const matchesField = (value: string, keyword: string): boolean =>
  !keyword || value.toLowerCase().includes(keyword.toLowerCase());

export const applyLocationFilter = (
  rows: ProductLocationData[],
  query: LocationQueryState,
): ProductLocationData[] =>
  rows.filter(
    (row) =>
      matchesField(row.itemCode, query.itemCode) &&
      matchesField(row.itemName, query.itemName) &&
      matchesField(row.storageLoc, query.storageLoc),
  );
