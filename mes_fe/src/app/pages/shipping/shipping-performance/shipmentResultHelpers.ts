import type {
  ShippingPerformanceData,
  ShipmentResultRes,
} from "@/types/shipping/performance.interface";
import type { ListColumn } from "../../../components/common/ListTable";
import { UNITS, withUnit } from "@/app/utils/unitConvert";

export type ScreenMode = "list" | "detail" | "report";
export type OrderDirection = "ASC" | "DESC";

// 우측 정렬 + 천단위 콤마로 표시할 수치형 컬럼 키. 별도 금액 컬럼은 존재하지 않음.
export const NUMERIC_RESULT_KEYS = new Set<string>([
  "basisWeight",
  "width",
  "length",
  "orderQty",
  "orderQtyEa",
  "shippedQty",
  "shippedQtyEa",
]);

export interface ShipmentQuery {
  dateFrom: string;
  dateTo: string;
  itemCode: string;
  itemName: string;
  customerName: string;
}

export const EMPTY_SHIPMENT_QUERY: ShipmentQuery = {
  dateFrom: "",
  dateTo: "",
  itemCode: "",
  itemName: "",
  customerName: "",
};

// 서버 출하실적 응답을 화면 표시용 행 배열로 변환한다 (No.는 페이지 기준 누적 번호)
export const mapResultsToRows = (
  results: ShipmentResultRes[],
  startOffset: number,
): ShippingPerformanceData[] =>
  results.map((r, idx) => ({
    id: String(r.shipResultSq),
    no: String(startOffset + idx + 1),
    customerName: r.customerName || "",
    itemCode: r.itemCode || "",
    itemName: r.itemName || "",
    basisWeight: r.basisWeight ? String(r.basisWeight) : "",
    width: r.width ? String(r.width) : "",
    length: r.length ? String(r.length) : "",
    orderQty: r.orderQty ? String(r.orderQty) : "",
    orderQtyEa: Number(r.orderQtyEa) || 0,
    shippedQty: r.shippedQty ? String(r.shippedQty) : "",
    shippedQtyEa: Number(r.shippedQtyEa) || 0,
    shipDate: r.shipDate || "",
    lotNo: r.lotNo || "",
  }));

// 목록 테이블 컬럼 정의. No. 컬럼은 페이지 오프셋 기준으로 행 번호를 렌더한다.
export const buildResultColumns = (
  rowOffset: number,
): ListColumn<ShippingPerformanceData>[] => [
  { key: "no", label: "No.", width: "60px", render: (_row, i) => rowOffset + i + 1 },
  { key: "shipDate", label: "출하일", width: "100px", sortable: true },
  { key: "customerName", label: "거래처", width: "120px" },
  { key: "itemCode", label: "품번", width: "100px" },
  { key: "itemName", label: "품명", width: "120px" },
  { key: "basisWeight", label: "평량\n(g/m²)", width: "80px", format: "number" },
  { key: "width", label: "폭\n(mm)", width: "80px", format: "number" },
  { key: "length", label: "길이\n(m)", width: "80px", format: "number" },
  { key: "orderQty", label: "출하지시량\n(m)", width: "100px", format: "number" },
  { key: "orderQtyEa", label: "출하지시\n(EA)", width: "80px", format: "number" },
  { key: "shippedQty", label: "출하량\n(m)", width: "100px", format: "number", sortable: true },
  { key: "shippedQtyEa", label: "출하량\n(EA)", width: "80px", format: "number", sortable: true },
  { key: "lotNo", label: "출하 Lot-No", width: "100px", sortable: true },
];

export interface DetailField {
  label: string;
  key: keyof ShippingPerformanceData;
  readOnly?: boolean;
}

// 상세 화면에서 2열 표로 보여줄 필드 순서/라벨 정의
export const DETAIL_FIELDS: DetailField[] = [
  { label: "품번", key: "itemCode" },
  { label: "품명", key: "itemName" },
  { label: withUnit("평량", UNITS.basisWeight), key: "basisWeight" },
  { label: withUnit("폭", UNITS.width), key: "width" },
  { label: withUnit("길이", UNITS.length), key: "length" },
  { label: "출하 Lot-No", key: "lotNo" },
  { label: withUnit("출하지시량", UNITS.length), key: "orderQty" },
  { label: "출하지시(EA)", key: "orderQtyEa" },
  { label: withUnit("출하량", UNITS.length), key: "shippedQty" },
  { label: "출하량(EA)", key: "shippedQtyEa" },
  { label: "거래처", key: "customerName" },
  { label: "출하일", key: "shipDate" },
];
