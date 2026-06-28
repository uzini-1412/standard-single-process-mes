/** [자재관리 > 발주관리] 상세/목록 화면용 순수 변환 헬퍼 모음. 컴포넌트 외부에서 재사용 가능한 계산만 모음. */
import type { PurchaseOrderListItem } from "@/types/material/purchaseorder.intergace";

// 화면에서 ₩ 통화로 표기할 컬럼 키.
export const CURRENCY_FIELD_KEYS = new Set<string>(["unitPrice", "supplyAmt"]);
// 천단위 콤마 수량으로 표기할 컬럼 키.
export const QUANTITY_FIELD_KEYS = new Set<string>(["orderQty"]);
// 우측 정렬 대상(통화 + 수량) 전체.
export const RIGHT_ALIGN_FIELD_KEYS = new Set<string>([
  ...CURRENCY_FIELD_KEYS,
  ...QUANTITY_FIELD_KEYS,
]);

// 상세 화면에서 쓰는 한 품목 행 형태(읽기 전용).
export interface PurchaseOrderDetailRow {
  no: number;
  itemCode: string;
  itemName: string;
  spec: string;
  orderUnit: string;
  orderQty: string;
  unitPrice: string;
  supplyAmt: string;
}

// 발주 응답의 details 배열을 상세 화면용 행 배열로 정리한다(빈 값은 공백 처리).
export function toDetailRows(details: any[] | undefined): PurchaseOrderDetailRow[] {
  if (!details) return [];
  return details.map((entry, position) => ({
    no: position + 1,
    itemCode: entry.itemCode || "",
    itemName: entry.itemName || "",
    spec: entry.spec || "",
    orderUnit: entry.orderUnit || "",
    orderQty: entry.orderQty ?? "",
    unitPrice: entry.unitPrice ?? "",
    supplyAmt: entry.supplyAmt ?? "",
  }));
}

// 한 발주(헤더)와 그에 딸린 품목들을 평면화하여 목록 행으로 전개한다.
// 품목이 없는 발주는 품목 칸이 빈 단일 행으로 들어간다.
export function flattenOrderToListRows(
  order: any,
  startNo: number,
): PurchaseOrderListItem[] {
  const baseFields = {
    orderSq: order.orderSq,
    orderNo: order.orderNo,
    customerName: order.customerName || "",
    customerCode: order.customerCode || "",
    orderDate: order.orderDate,
  };

  const details: any[] = order.details || [];
  if (details.length === 0) {
    return [
      {
        no: startNo,
        ...baseFields,
        itemCode: "",
        itemName: "",
        spec: "",
        orderUnit: "",
        orderQty: "",
        unitPrice: "",
        supplyAmt: "",
      },
    ];
  }

  return details.map((line, offset) => ({
    no: startNo + offset,
    ...baseFields,
    itemCode: line.itemCode || "",
    itemName: line.itemName || "",
    spec: line.spec || "",
    orderUnit: line.orderUnit || "",
    orderQty: line.orderQty || "",
    unitPrice: line.unitPrice || "",
    supplyAmt: line.supplyAmt || "",
  }));
}

// 발주 응답 전체를 받아 목록 행으로 펼친다(연속된 일련번호 부여).
export function buildListRows(orders: any[]): PurchaseOrderListItem[] {
  const rows: PurchaseOrderListItem[] = [];
  let runningNo = 1;
  for (const order of orders) {
    const expanded = flattenOrderToListRows(order, runningNo);
    runningNo += expanded.length;
    rows.push(...expanded);
  }
  return rows;
}
