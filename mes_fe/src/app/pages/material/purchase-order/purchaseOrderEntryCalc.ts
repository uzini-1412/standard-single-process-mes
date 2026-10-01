/** 발주 등록/수정 화면용 순수 계산 헬퍼. 금액 표기·재계산·발주번호 placeholder 등. */
import { ceilMoney } from "@/app/utils/numberFormat";
import type { PurchaseOrderItem } from "@/types/material/purchaseorder.intergace";

// 입력 문자열을 ₩ 통화 표기로. 숫자가 아니면 빈 문자열.
export function toCurrencyLabel(value: string): string {
  const parsed = parseFloat(value);
  if (!value || isNaN(parsed)) return "";
  return `₩ ${parsed.toLocaleString()}`;
}

// 현재 연월 기준 발주번호 placeholder 예시(PO-YYYYMM-001).
export function buildOrderNoPlaceholder(): string {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  return `PO-${yearMonth}-001`;
}

// 수량×단가로 공급가액(올림)을 다시 계산. 부가세는 현재 미적용이라 0으로 둔다.
// 수량/단가가 0 이하면 금액 필드를 모두 비운다.
export function recomputeLineAmounts(item: PurchaseOrderItem): PurchaseOrderItem {
  const quantity = parseFloat(item.orderQty) || 0;
  const price = parseFloat(item.unitPrice) || 0;
  if (quantity <= 0 || price <= 0) {
    return { ...item, supplyAmt: "", vatAmt: "", totalAmt: "" };
  }
  const supply = ceilMoney(quantity * price);
  return {
    ...item,
    supplyAmt: String(supply),
    vatAmt: "0",
    totalAmt: String(supply),
  };
}

// 한 발주 안에 수입검사유무 true/false 품목이 섞여 있는지 판정.
export function hasMixedImportInspection(items: PurchaseOrderItem[]): boolean {
  const flags = items
    .map((it) => it.importInspGb)
    .filter((v) => v === true || v === false);
  return flags.includes(true) && flags.includes(false);
}

// 선택 다이얼로그에서 받은 자재 목록을 발주품목 행으로 변환.
export function materialsToOrderItems(
  materials: any[],
  startIndex: number,
): PurchaseOrderItem[] {
  return materials.map((material, offset) => ({
    no: startIndex + offset + 1,
    selected: true,
    itemSq: material.itemSq,
    itemCode: material.itemCode || "",
    itemName: material.itemName || "",
    spec: material.spec || "",
    orderUnit: material.packingUnit || material.orderUnit || "",
    orderQty: "",
    unitPrice: material.unitPrice ? String(material.unitPrice) : material.price || "0",
    supplyAmt: "",
    vatAmt: "",
    totalAmt: "",
    importInspGb: material.importInspGb ?? null,
  }));
}

// 발주 상세 응답의 details를 수정 화면 품목 행으로 복원.
export function detailsToOrderItems(details: any[] | undefined): PurchaseOrderItem[] {
  if (!details) return [];
  return details.map((entry, position) => ({
    no: position + 1,
    selected: true,
    orderDtlSq: entry.orderDtlSq,
    itemSq: entry.itemSq,
    itemCode: entry.itemCode || "",
    itemName: entry.itemName || "",
    spec: entry.spec || "",
    orderUnit: entry.orderUnit || "",
    orderQty: entry.orderQty != null ? String(entry.orderQty) : "",
    unitPrice: entry.unitPrice != null ? String(entry.unitPrice) : "",
    supplyAmt: entry.supplyAmt != null ? String(entry.supplyAmt) : "",
    vatAmt: entry.vatAmt != null ? String(entry.vatAmt) : "",
    totalAmt: entry.totalAmt != null ? String(entry.totalAmt) : "",
    importInspGb: entry.importInspGb ?? null,
  }));
}
