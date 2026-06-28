import { WorkOrderResponse } from "@/types/workOrder.interface";

// 작업 실행 화면에서 표 우측 칼럼을 채우기 위한 순수 계산 모음.
// 모든 함수는 상태 없이 입력만으로 결과를 만들며, 빈 값은 빈 문자열/0 으로 떨어진다.

type OrderLike = WorkOrderResponse | null | undefined;

// 디테일 목록을 항상 배열로 돌려준다(없으면 빈 배열).
function detailsOf(order: OrderLike): any[] {
  return order?.details || [];
}

// 문자열에 실제 내용이 들어 있는지 판정.
export function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

// 전폭(mm): 디테일 폭의 총합. 합이 0이면 주문 자체의 전폭/폭으로 대체한다.
export function deriveTotalWidthMm(order: OrderLike): number {
  const rows = detailsOf(order);
  if (rows.length > 0) {
    const summed = rows.reduce((acc, d) => acc + (Number(d?.width) || 0), 0);
    if (summed > 0) return summed;
  }
  return Number(order?.totalWidth ?? order?.width) || 0;
}

// 폭(mm): 디테일별 폭을 양수만 추려 쉼표로 이어 보여준다. 없으면 주문 폭 한 개.
export function deriveWidthsText(order: OrderLike): string {
  const rows = detailsOf(order);
  if (rows.length > 0) {
    const positives = rows
      .map((d) => Number(d?.width) || 0)
      .filter((w) => w > 0);
    if (positives.length > 0) return positives.join(", ");
  }
  return order?.width?.toString() || "";
}

// 길이(m): 디테일별 길이를 양수만 추려 쉼표로 이어 보여준다. 없으면 주문 길이 한 개.
export function deriveLengthsText(order: OrderLike): string {
  const rows = detailsOf(order);
  if (rows.length > 0) {
    const positives = rows
      .map((d) => Number(d?.length) || 0)
      .filter((l) => l > 0);
    if (positives.length > 0) return positives.join(", ");
  }
  return order?.length?.toString() || "";
}

// 면적(m²): 디테일이 있으면 (폭/1000)*길이 를 건별로 더하고, 없으면 전폭과 단일 길이로 환산한다.
export function deriveAreaText(order: OrderLike, totalWidthMm: number): string {
  const rows = detailsOf(order);
  if (rows.length > 0) {
    const summed = rows.reduce((acc, d) => {
      const w = Number(d?.width) || 0;
      const l = Number(d?.length) || 0;
      return acc + (w / 1000) * l;
    }, 0);
    if (summed > 0) return summed.toFixed(2);
  }
  const singleLength = Number(order?.length) || 0;
  if (totalWidthMm > 0 && singleLength > 0) {
    return ((totalWidthMm / 1000) * singleLength).toFixed(2);
  }
  return "";
}

// 계획생산시간: 계획량/생산속도(분)를 "H시간 M분" 형태로 변환. 값이 모자라면 빈 문자열.
export function derivePlannedTimeText(order: OrderLike): string {
  if (!order) return "";
  const qty = Number(order.targetQty) || 0;
  const speed = Number(order.prodSpeed) || 0;
  if (speed > 0 && qty > 0) {
    const totalMinutes = Math.round(qty / speed);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}시간 ${minutes}분`;
  }
  return "";
}

// 작업상태 코드 → 한글 표기. 매핑이 없으면 원본 코드를 그대로 둔다.
export function statusLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "작업대기";
    case "IN_PROGRESS":
      return "작업진행중";
    case "COMPLETED":
      return "작업완료";
    case "STOPPED":
      return "작업중지";
    default:
      return status || "";
  }
}
