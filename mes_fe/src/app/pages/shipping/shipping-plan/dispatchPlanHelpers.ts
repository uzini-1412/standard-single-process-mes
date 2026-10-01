import type { ListColumn } from "../../../components/common/ListTable";
import { ShippingPlanData } from "@/types/shipping/plan.interface";
import { shippingPlanColumns } from "@/app/constants/shipping";

// 오른쪽 정렬 + 천단위 콤마로 표기할 수치형(수량/측정) 컬럼 모음. 금액 항목은 해당 없음.
const RIGHT_ALIGNED_NUMERIC_KEYS = new Set<string>([
  "basisWeight",
  "width",
  "length",
  "salesOrderQty",
  "currentStock",
  "planQty",
  "planQtyEa",
]);

// 공통 컬럼 정의를 ListTable 스펙으로 옮기되, 수치형 키에는 number 포맷을 덧붙인다.
export const dispatchPlanBoardColumns: ListColumn<ShippingPlanData>[] = shippingPlanColumns.map(
  (column) => ({
    key: column.key,
    label: column.label,
    width: column.width,
    ...(RIGHT_ALIGNED_NUMERIC_KEYS.has(column.key) ? { format: "number" as const } : {}),
  }),
);

// 길이가 양수일 때만 출하량 / 길이를 올림하여 롤수(EA)를 산출한다.
export const computeRollCount = (planQtyText: string, lengthText: string): number => {
  const qty = parseFloat(planQtyText);
  const len = parseFloat(lengthText);
  if (!isNaN(qty) && !isNaN(len) && len > 0) {
    return Math.ceil(qty / len);
  }
  return 0;
};

// 서버 응답 한 건을 화면 행 모델로 정규화한다(빈 값은 빈 문자열, 번호는 1부터).
export const normalizePlanRow = (raw: any, rowIndex: number): ShippingPlanData => ({
  planSq: raw.planSq,
  no: String(rowIndex + 1),
  itemCode: raw.itemCode || "",
  itemName: raw.itemName || "",
  basisWeight: raw.basisWeight?.toString() || "",
  width: raw.width?.toString() || "",
  length: raw.length?.toString() || "",
  salesOrderQty: raw.salesOrderQty?.toString() || "",
  customerName: raw.customerName || "",
  currentStock: raw.currentStock?.toString() || "",
  planQty: raw.planQty?.toString() || "",
  planQtyEa: raw.planQtyEa?.toString() || "",
  lotNo: raw.lotNo || "",
  orderNo: raw.orderNo || "",
  expectedShipDate: raw.expectedShipDate || "",
  storageLocation: raw.storageLocation || "",
  customerCode: raw.customerCode || "",
  remark: raw.remark || "",
  planStatus: raw.planStatus || "",
});

export interface DispatchBoardFilters {
  dateFrom: string;
  dateTo: string;
  itemCode: string;
  itemName: string;
  client: string;
}

// 화면단 필터 조건을 모두 통과하는 행인지 판정한다(부분일치, 대소문자 무시).
export const matchesBoardFilters = (row: ShippingPlanData, filters: DispatchBoardFilters): boolean => {
  const { dateFrom, dateTo, itemCode, itemName, client } = filters;
  if (dateFrom && (!row.expectedShipDate || row.expectedShipDate < dateFrom)) return false;
  if (dateTo && (!row.expectedShipDate || row.expectedShipDate > dateTo)) return false;
  if (itemCode && !row.itemCode.toLowerCase().includes(itemCode.toLowerCase())) return false;
  if (itemName && !row.itemName.toLowerCase().includes(itemName.toLowerCase())) return false;
  if (client && !row.customerName.toLowerCase().includes(client.toLowerCase())) return false;
  return true;
};

// 수주 목록을 행 단위(상세 펼침)로 풀어, 선택 가능한 형태로 가공한다.
export const flattenOrderDetails = (orders: any[]): any[] => {
  const flattened: any[] = [];
  orders.forEach((order: any) => {
    if (order.details && Array.isArray(order.details)) {
      order.details.forEach((detail: any, detailIndex: number) => {
        flattened.push({
          id: `${order.orderSq}_${detailIndex}`,
          orderDate: order.orderDate,
          orderNo: order.orderNo,
          customerCode: order.customerCode,
          customerName: order.customerName,
          customerSq: order.customerSq,
          itemCode: detail.itemCode,
          itemName: detail.itemName,
          basisWeight: detail.basisWeight?.toString() || "",
          width: detail.width?.toString() || "",
          length: detail.length?.toString() || "",
          salesOrderQty: detail.orderQty?.toString() || "",
          salesOrderQtyEa: detail.orderQtyEa?.toString() || "",
          itemSq: detail.itemSq,
          orderDtlSq: detail.orderDtlSq,
          plannedQty: detail.plannedQty ?? 0,
        });
      });
    }
  });
  return flattened;
};

// 이미 계획 수량이 수주량을 모두 채운 항목은 추가 선택 대상에서 제외한다.
export const keepUnplannedDetails = (details: any[]): any[] =>
  details.filter((d) => {
    const orderQty = parseFloat(d.salesOrderQty || "0");
    const planned = d.plannedQty || 0;
    return !(orderQty > 0 && planned >= orderQty);
  });
