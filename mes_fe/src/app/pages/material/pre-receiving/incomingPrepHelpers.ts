/** 가입고 등록 화면 순수 헬퍼: 발주·품목·입고 데이터를 합쳐 후보 행 구성, 수량 유효성 검증. */
import * as preReceivingApi from "../../../api/preReceivingApi";
import { AvailableOrderItem } from "@/types/material/prereceive.interface";

/**
 * 발주 목록을 상세 단위로 펼쳐 가입고 후보 행을 만든다.
 * 품목 마스터에서 계정구분·규격·단위를 보강하고, 기존 입고분 합계를 누적한다.
 */
export function buildAvailableOrders(
  orders: any[],
  items: any[],
  inbounds: preReceivingApi.InboundRes[],
): AvailableOrderItem[] {
  const result: AvailableOrderItem[] = [];
  let seq = 1;

  orders.forEach((order: any) => {
    if (!order.details || order.details.length === 0) return;
    order.details.forEach((detail: any) => {
      const matchedItem = items.find(
        (it: any) => it.itemCode === detail.itemCode && it.itemName === detail.itemName,
      );
      const relatedInbounds = inbounds.filter((ib) => ib.orderDtlSq === detail.orderDtlSq);
      const inboundSum = relatedInbounds.reduce(
        (acc: number, ib: any) => acc + (Number(ib.inboundQty) || 0),
        0,
      );

      result.push({
        no: seq++,
        orderDtlSq: detail.orderDtlSq,
        itemSq: detail.itemSq,
        orderNo: order.orderNo,
        accountType: matchedItem?.accountType || "",
        itemCode: detail.itemCode || "",
        itemName: detail.itemName || "",
        spec: matchedItem?.spec || "",
        orderUnit: matchedItem?.packingUnit || detail.orderUnit || "",
        customerName: order.customerName || "",
        customerCode: order.customerCode || "",
        orderDate: order.orderDate || "",
        inReqDate: order.inReqDate || "",
        orderQty: detail.orderQty != null ? String(detail.orderQty) : "",
        totalInboundQty: inboundSum.toString(),
      });
    });
  });

  return result;
}

/**
 * 입고 수량 검증 결과 메시지를 반환(빈 문자열이면 정상).
 * 음수 금지, 그리고 기존 누적 + 입력값이 발주수량을 넘지 못하도록 제한.
 */
export function validateInboundQty(
  inboundQtyStr: string,
  orderQtyStr: string,
  existingTotalStr: string,
): string {
  const inboundQty = parseInt(inboundQtyStr, 10) || 0;
  const orderQty = parseInt(orderQtyStr, 10) || 0;
  const existingTotal = parseInt(existingTotalStr, 10) || 0;

  if (inboundQty < 0) {
    return "음수 값은 입력할 수 없습니다.";
  }
  if (orderQty > 0 && existingTotal + inboundQty > orderQty) {
    const remaining = Math.max(0, orderQty - existingTotal);
    return existingTotal > 0
      ? `남은 발주수량(${remaining})을 초과할 수 없습니다.`
      : `발주수량(${orderQty})을 초과할 수 없습니다.`;
  }
  return "";
}
