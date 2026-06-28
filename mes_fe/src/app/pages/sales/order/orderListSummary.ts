import type { OrderData } from "@/types/sales/order.interface";
import type { OrderRes } from "@/app/api/orderApi";

// 소수 둘째 자리까지 반올림.
const round2 = (value: number) => Math.round(value * 100) / 100;
// 0보다 클 때만 문자열로, 아니면 빈 칸.
const positiveText = (value: number) => (value > 0 ? String(value) : "");

// 수주 응답 목록을 수주번호 기준으로 중복 제거하고, 품목 합계를 채워 목록 행으로 만든다.
export function summarizeOrders(orders: OrderRes[]): OrderData[] {
  const rows: OrderData[] = [];
  const seenNumbers = new Set<string>();
  let serial = 0;

  for (const order of orders) {
    if (seenNumbers.has(order.orderNo)) {
      continue;
    }
    seenNumbers.add(order.orderNo);

    const details = order.details || [];
    const head = details[0];

    // 한 수주에 속한 품목들의 수량/중량/금액을 모두 더한다.
    let qtySum = 0;
    let qtyEaSum = 0;
    let qtyM2Sum = 0;
    let weightSum = 0;
    let amountSum = 0;

    for (const detail of details) {
      qtySum += detail.orderQty || 0;
      qtyEaSum += detail.orderQtyEa || 0;
      qtyM2Sum += detail.orderQtyM2 || 0;
      weightSum += detail.weight || 0;
      amountSum += detail.totalAmt || 0;
    }

    serial += 1;
    rows.push({
      no: serial,
      orderSq: order.orderSq,
      orderNo: order.orderNo,
      orderDate: order.orderDate || "",
      customerSq: order.customerSq,
      customerCode: order.customerCode || "",
      customerName: order.customerName || "",
      itemCode: head?.itemCode || "",
      itemName: head?.itemName || "",
      basisWeight: "",
      width: "",
      length: "",
      orderQty: positiveText(qtySum),
      orderQtyEa: positiveText(qtyEaSum),
      orderQtyM2: qtyM2Sum > 0 ? String(round2(qtyM2Sum)) : "",
      totalWeight: weightSum > 0 ? String(round2(weightSum)) : "",
      unitPrice: "",
      totalAmt: positiveText(amountSum),
      deliveryReqDate: order.deliveryReqDate || "",
      deliveryPlace: order.deliveryPlace || "",
      remark: order.remark || "",
    });
  }

  return rows;
}

// 거래처명으로 부분일치 필터링(대소문자 무시). 검색어가 없으면 원본 그대로.
export function filterByCustomerName(
  rows: OrderData[],
  keyword: string,
): OrderData[] {
  if (!keyword) {
    return rows;
  }
  const needle = keyword.toLowerCase();
  return rows.filter((row) => row.customerName.toLowerCase().includes(needle));
}
