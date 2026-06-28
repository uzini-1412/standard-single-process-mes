import { format } from "date-fns";
import type { WorkProgressRow } from "@/types/workProgress.interface";
import type { WorkOrderResponse } from "@/types/workOrder.interface";

// 작업 상태 코드를 사용자에게 보여줄 한글 문구로 변환
export function statusLabel(code: string): string {
  const labelByCode: Record<string, string> = {
    PENDING: "작업대기",
    IN_PROGRESS: "작업진행중",
    COMPLETED: "작업완료",
    STOPPED: "작업중지",
  };
  return labelByCode[code] ?? (code || "");
}

// 보드에 노출할 지시 건만 추리는 규칙:
//  - 오늘자 작업지시는 전부 포함
//  - 과거 지시는 아직 끝나지 않았으면 포함
//  - 과거 지시라도 오늘 마감됐다면 포함
export function shouldDisplayOrder(order: WorkOrderResponse, today: string): boolean {
  const orderDate = order.workOrderDate || "";
  const dated = order.workEndTime ? String(order.workEndTime) : "";
  const finishedToday = dated.startsWith(today);
  const done = order.workStatus === "COMPLETED";

  if (orderDate === today) return true;
  if (orderDate < today) {
    if (!done) return true;
    if (done && finishedToday) return true;
  }
  return false;
}

// 응답 DTO 목록을 보드 행 모델로 정리
export function toProgressRows(orders: WorkOrderResponse[]): WorkProgressRow[] {
  return orders.map((order, idx) => ({
    no: idx + 1,
    productType: order.itemType || "",
    lineType: order.lineName || "",
    productionNumber: order.details?.[0]?.lotNo || order.lotNo || "",
    productionLotNo: order.productionLotNo || "",
    partNumber: order.itemCode || "",
    partName: order.itemName || "",
    spec: order.itemSpec || "",
    orderQty: order.targetQty?.toString() || "",
    workStatus: statusLabel(order.workStatus),
    remarks: order.remark || "",
  }));
}

// 응답 전체를 오늘 기준으로 거른 뒤 행 모델로 변환하는 합성 헬퍼
export function buildProgressRows(orders: WorkOrderResponse[]): WorkProgressRow[] {
  const today = format(new Date(), "yyyy-MM-dd");
  const visible = orders.filter((order) => shouldDisplayOrder(order, today));
  return toProgressRows(visible);
}
