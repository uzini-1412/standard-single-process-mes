/** [생산관리 > 생산소요량산출] 화면 전용 순수 유틸. 수주/소요량 응답 가공과 페이징 계산을 담당한다. */
import type {
  ProductionCustomerOrder,
  ProductionRequirement,
} from "@/types/production/requirement.interface";
import type { OrderRes } from "../../../api/orderApi";

// 수주 표에서 우측정렬 + 콤마 처리할 수량 컬럼 키.
export const ORDER_NUMERIC_KEYS = new Set<string>(["orderQty", "orderQtyEa"]);

// 소요량 표에서 우측정렬 + 콤마 처리할 수량/측정값 컬럼 키. (금액 항목 없음)
export const REQUIREMENT_NUMERIC_KEYS = new Set<string>([
  "width",
  "basisWeight",
  "length",
  "orderQty",
  "currentStock",
  "safetyStock",
  "shortageQty",
  "deliveryPlannedQty",
  "productionReqQty",
  "productionSpeed",
  "productionPerHourM2",
  "estimatedProductionTime",
]);

// 수주 한 건의 상세 합계(수량/EA)를 누적해서 돌려준다.
const sumOrderDetailQty = (details: OrderRes["details"]) => {
  let qtySum = 0;
  let eaSum = 0;
  (details || []).forEach((detail) => {
    qtySum += detail.orderQty || 0;
    eaSum += detail.orderQtyEa || 0;
  });
  return { qtySum, eaSum };
};

// 수주 응답 한 건을 상단 표 행 형태로 정규화. 품번/품명은 첫 상세 기준.
export const mapOrderToRow = (order: OrderRes): ProductionCustomerOrder => {
  const details = order.details || [];
  const leadItem = details[0];
  const { qtySum, eaSum } = sumOrderDetailQty(details);
  return {
    orderSq: order.orderSq,
    orderDate: order.orderDate || "",
    orderNo: order.orderNo || "",
    customerCode: order.customerCode || "",
    customerName: order.customerName || "",
    itemCode: leadItem?.itemCode || "",
    itemName: leadItem?.itemName || "",
    orderQty: String(qtySum),
    orderQtyEa: String(eaSum),
    details,
  };
};

// 백엔드가 join·계산까지 끝낸 소요량 응답 한 건을 표시용 행으로 환산.
const mapRequirementRow = (raw: any): ProductionRequirement => ({
  orderDtlSq: raw.orderDtlSq,
  itemSq: raw.itemSq,
  orderDate: raw.orderDate || "",
  orderNo: raw.orderNo || "",
  customerCode: raw.customerCode || "",
  customerName: raw.customerName || "",
  itemCode: raw.itemCode || "",
  itemName: raw.itemName || "",
  basisWeight: raw.basisWeight != null ? String(raw.basisWeight) : "",
  width: raw.width != null ? String(raw.width) : "",
  length: raw.length != null ? String(raw.length) : "",
  orderQty: Number(raw.orderQty) || 0,
  currentStock: Number(raw.currentStock) || 0,
  safetyStock: Number(raw.safetyStock) || 0,
  shortageQty: Number(raw.shortageQty) || 0,
  deliveryPlannedQty: Number(raw.deliveryPlannedQty) || 0,
  productionReqQty: Number(raw.productionReqQty) || 0,
  productionSpeed: raw.productionSpeed != null ? String(raw.productionSpeed) : "0",
  productionPerHourM2: raw.productionPerHourM2 != null ? Number(raw.productionPerHourM2).toFixed(2) : "0.00",
  estimatedProductionTime: raw.estimatedProductionTime != null ? Number(raw.estimatedProductionTime).toFixed(2) : "0.00",
});

// 소요량 응답 전체를 orderNo로 묶은 Map으로 구성. key 없는 행은 버린다.
export const groupRequirementsByOrderNo = (
  rawList: any[],
): Map<string, ProductionRequirement[]> => {
  const grouped = new Map<string, ProductionRequirement[]>();
  rawList.forEach((raw) => {
    const key = raw.orderNo;
    if (!key) return;
    const bucket = grouped.get(key) ?? [];
    bucket.push(mapRequirementRow(raw));
    grouped.set(key, bucket);
  });
  return grouped;
};

// 선택된 orderNo 집합에 대응하는 BE 산출 행을 평면 배열로 모은다.
export const collectSelectedRequirements = (
  selectedOrderNos: Set<string>,
  groupedByOrderNo: Map<string, ProductionRequirement[]>,
): ProductionRequirement[] => {
  const merged: ProductionRequirement[] = [];
  selectedOrderNos.forEach((orderNo) => {
    const rows = groupedByOrderNo.get(orderNo);
    if (rows) merged.push(...rows);
  });
  return merged;
};

// 클라이언트 슬라이싱용 페이징 메타 계산 결과.
export interface ClientSlice {
  safePage: number;
  totalPages: number;
  baseNo: number;
}

// 총건수/페이지크기/현재페이지로 안전한 슬라이스 메타를 산출. 최소 1페이지 보장.
export const computeClientSlice = (total: number, size: number, page: number): ClientSlice => {
  const totalPages = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(page, totalPages - 1);
  return { safePage, totalPages, baseNo: safePage * size };
};
