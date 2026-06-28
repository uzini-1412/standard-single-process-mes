import { format } from "date-fns";
import { DowntimeStatusRow } from "@/types/downtime.interface";

// 비가동 유형 표에 미리 깔아둘 행 골격. 모든 칸은 빈 문자열로 시작한다.
const DOWNTIME_TYPE_LABELS = [
  "계획정지",
  "품목변경",
  "전기고장",
  "기계고장",
  "니들문제",
  "원료문제",
  "온도문제",
  "교육/청소",
  "기타",
] as const;

// 위 라벨 목록을 빈 행 데이터로 변환해 초기 상태를 만든다.
export function buildEmptyDowntimeRows(): DowntimeStatusRow[] {
  return DOWNTIME_TYPE_LABELS.map((label) => ({
    type: label,
    startTime: "",
    endTime: "",
    downtimeDuration: "",
    actionContent: "",
    actionResponsible: "",
  }));
}

// 백엔드가 내려주는 비가동 코드 → 화면 표기용 유형명 매핑.
const codeToDisplayType: Record<string, string> = {
  계획정지: "계획정지",
  품목변경: "품목변경",
  전기: "전기고장",
  기계: "기계고장",
  니들: "니들문제",
  원료: "원료문제",
  온도: "온도문제",
  교육청소: "교육/청소",
  기타: "기타",
};

// 코드값을 화면 유형명으로 바꾼다. 매핑에 없으면 원본 코드를 그대로 돌려준다.
export function resolveDisplayType(downtimeCode: string): string {
  return codeToDisplayType[downtimeCode] || downtimeCode;
}

// 이벤트 한 건을 받아 해당 유형 행에 덮어쓸 값 묶음을 만든다.
function rowFromEvent(event: any): Partial<DowntimeStatusRow> {
  const begun = event.startDt ? new Date(event.startDt) : null;
  const ended = event.endDt ? new Date(event.endDt) : null;
  return {
    startTime: begun ? format(begun, "HH:mm") : "",
    endTime: ended ? format(ended, "HH:mm") : "",
    downtimeDuration: event.downtimeMin ? `${event.downtimeMin}분` : "",
    actionContent: event.actionContent || "",
    actionResponsible: event.actionResponsible || "",
  };
}

// 기존 행 배열에 서버 이벤트들을 반영한 새 배열을 반환한다(불변 처리).
export function applyEventsToRows(
  rows: DowntimeStatusRow[],
  events: any[]
): DowntimeStatusRow[] {
  const next = rows.map((row) => ({ ...row }));
  for (const event of events) {
    const displayType = resolveDisplayType(event.downtimeCode || "");
    const target = next.findIndex((r) => r.type === displayType);
    if (target === -1) continue;
    next[target] = { ...next[target], ...rowFromEvent(event) };
  }
  return next;
}
