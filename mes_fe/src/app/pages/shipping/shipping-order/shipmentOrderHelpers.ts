// 출하지시 화면들이 공통으로 쓰는 순수 계산/포맷 유틸 모음.
import type { ShippingOrderData } from "@/types/shipping/order.interface";

// 문자열/숫자/널을 안전하게 number 로 환산. 변환 실패는 0 으로 떨어뜨린다.
export function toFiniteNumber(raw: string | number | null | undefined): number {
  const parsed = typeof raw === "string" ? parseFloat(raw) : (raw ?? 0);
  return Number.isNaN(parsed as number) ? 0 : (parsed as number);
}

// 길이(length)로 출하지시량을 나눠 롤 수(EA)를 올림 산출. 길이가 0 이하면 0.
export function deriveRollCount(planQty: number, length: number): number {
  if (Number.isNaN(planQty) || Number.isNaN(length) || length <= 0) return 0;
  return Math.ceil(planQty / length);
}

// 출하상태 enum 코드를 화면 표기용 한글로. 알 수 없는 값은 대기로 간주.
export function describeShipStatus(code?: string): string {
  return code === "SHIPPED" ? "출하완료" : "출하대기";
}

// API 원시 응답 한 건을 화면 모델(ShippingOrderData)로 정규화.
export function normalizeOrderRow(raw: any): ShippingOrderData {
  return {
    shipOrderSq: raw.shipOrderSq,
    planSq: raw.planSq,
    salesOrderDtlSq: raw.salesOrderDtlSq,
    expectedShipDate: raw.expectedShipDate || "",
    expectedShipTime: raw.expectedShipTime || "",
    customerCode: raw.customerCode || "",
    customerName: raw.customerName || "",
    itemCode: raw.itemCode || "",
    itemName: raw.itemName || "",
    basisWeight: raw.basisWeight?.toString() || "",
    width: raw.width?.toString() || "",
    length: raw.length?.toString() || "",
    planQty: raw.planQty?.toString() || "",
    planQtyEa: Number(raw.planQtyEa) || 0,
    currentStock: raw.currentStock?.toString() || "",
    salesOrderQty: raw.salesOrderQty?.toString() || "",
    storageLocation: raw.storageLocation || "",
    destination: raw.destination || "",
    customerReq: raw.customerReq || "",
    orderStatus: raw.orderStatus || "",
    shipStatus: raw.shipStatus || "",
    lotNo: raw.lotNo || "",
    productLotNo: raw.productLotNo || "",
    inspectRegistered: raw.inspectRegistered === true,
    inspectJudge: raw.inspectJudge || "",
  };
}

// 출하예정일 내림차순 정렬. 빈 날짜는 항상 뒤로 밀어낸다.
export function compareByShipDateDesc(a: ShippingOrderData, b: ShippingOrderData): number {
  if (!a.expectedShipDate && !b.expectedShipDate) return 0;
  if (!a.expectedShipDate) return 1;
  if (!b.expectedShipDate) return -1;
  return b.expectedShipDate.localeCompare(a.expectedShipDate);
}

// 품번/품명/거래처 키워드로 행을 솎아낸다. 거래처는 명칭·코드 양쪽을 본다.
export function matchesSearchKeywords(
  row: ShippingOrderData,
  itemCodeKey: string,
  itemNameKey: string,
  clientKey: string
): boolean {
  if (itemCodeKey && !row.itemCode.toLowerCase().includes(itemCodeKey)) return false;
  if (itemNameKey && !row.itemName.toLowerCase().includes(itemNameKey)) return false;
  if (
    clientKey &&
    !row.customerName.toLowerCase().includes(clientKey) &&
    !row.customerCode.toLowerCase().includes(clientKey)
  ) {
    return false;
  }
  return true;
}

// 출하LOT(lotNo) 단위로 수량/롤수를 합산. lotNo 없는 건은 단건으로 노출.
// lotNo 가 품목+거래처+출하예정일 단위 발급이라 품목이 다르면 자연히 별행으로 갈린다.
export function collapseByShipLot(rows: ShippingOrderData[]): ShippingOrderData[] {
  const grouped = new Map<string, ShippingOrderData>();
  const singles: ShippingOrderData[] = [];
  rows.forEach((row) => {
    if (!row.lotNo) {
      singles.push({ ...row });
      return;
    }
    const acc = grouped.get(row.lotNo);
    if (!acc) {
      grouped.set(row.lotNo, { ...row });
    } else {
      acc.planQty = String(toFiniteNumber(acc.planQty) + toFiniteNumber(row.planQty));
      acc.planQtyEa = toFiniteNumber(acc.planQtyEa) + toFiniteNumber(row.planQtyEa);
    }
  });
  return [...Array.from(grouped.values()), ...singles];
}
