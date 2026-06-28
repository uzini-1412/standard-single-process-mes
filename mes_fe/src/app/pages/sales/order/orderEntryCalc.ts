import { ceilMoney } from "@/app/utils/numberFormat";
import type { OrderItem } from "@/types/sales/order.interface";

// 빈 결과(파생 수량/금액)를 한 곳에서 만들어 재사용한다.
const EMPTY_DERIVED = {
  orderQtyEa: "",
  orderQtyM2: "",
  weight: "",
  supplyAmt: "",
  vatAmt: "",
  totalAmt: "",
} as const;

// 숫자 문자열을 "₩ 1,234" 형태로. 비었거나 파싱 실패 시 빈 문자열.
export function toWonText(value: string) {
  const numeric = parseFloat(value);
  if (!value || Number.isNaN(numeric)) {
    return "";
  }
  return `₩ ${numeric.toLocaleString()}`;
}

// 오늘 날짜를 YYYY-MM-DD 형태로 반환.
export function resolveTodayIso() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// 한 줄(품목)의 수주수량을 기준으로 EA/㎡/중량/금액을 다시 산출해 새 객체로 돌려준다.
export function recomputeLineMetrics(item: OrderItem): OrderItem {
  const qty = parseFloat(item.orderQty) || 0;
  const width = parseFloat(item.width) || 0;
  const price = parseFloat(item.unitPrice) || 0;
  const vatPerUnit = parseFloat(item.unitVatAmt) || 0;
  const gsm = parseFloat(item.basisWeight) || 0;
  const lengthM = parseFloat(item.length) || 0;

  // 수량이 0 이하이면 파생값을 모두 비운다.
  if (qty <= 0) {
    return { ...item, ...EMPTY_DERIVED };
  }

  const orderQtyEa = lengthM > 0 ? String(Math.ceil(qty / lengthM)) : "";
  const orderQtyM2 =
    width > 0 ? String(Math.round(((qty * width) / 1000) * 100) / 100) : "";
  const weight =
    gsm > 0 && width > 0
      ? String(Math.round(((gsm * qty * width) / 1000000) * 100) / 100)
      : "";

  const areaM2 = parseFloat(orderQtyM2) || 0;

  // ㎡가 잡히지 않으면 금액 산출이 불가하므로 수량/중량만 채워 반환.
  if (!orderQtyM2 || areaM2 <= 0) {
    return {
      ...item,
      ...EMPTY_DERIVED,
      orderQtyEa,
      orderQtyM2,
      weight,
    };
  }

  const supplyAmt = ceilMoney(price * areaM2);
  const vatAmt = ceilMoney(vatPerUnit);

  return {
    ...item,
    orderQtyEa,
    orderQtyM2,
    weight,
    supplyAmt: String(supplyAmt),
    vatAmt: String(vatAmt),
    totalAmt: String(supplyAmt + vatAmt),
  };
}

// 숫자형 필드를 안전하게 문자열로(널이면 빈 문자열).
const asText = (value: unknown) => (value != null ? String(value) : "");

// 품목선택 다이얼로그에서 고른 제품 1건을 수주 라인 초기 상태로 변환.
export function buildLineFromProduct(product: any, no: number): OrderItem {
  return {
    selected: true,
    no,
    itemSq: product.itemSq,
    itemCode: product.itemCode || "",
    itemName: product.itemName || "",
    basisWeight: asText(product.basisWeight),
    width: asText(product.width),
    length: asText(product.length),
    orderQty: "",
    orderQtyEa: "",
    orderQtyM2: "",
    weight: "",
    unitPrice: asText(product.unitPrice),
    unitVatAmt: "0",
    supplyAmt: "",
    vatAmt: "",
    totalAmt: "",
  };
}
