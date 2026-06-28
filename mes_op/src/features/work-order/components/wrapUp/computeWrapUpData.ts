// 작업 마무리 화면에서 쓰는 순수 계산/집계 헬퍼 모음.
// 어떤 React 상태에도 의존하지 않으며, 입력값만으로 결과를 도출한다.
import {
  fetchItemDetail,
  fetchNonOperationEvents,
  fetchCommonInfoByCategory,
  fetchProcessInspectStandards,
  fetchProcessInspectResults,
} from "../../../../utils/api/api";

// 공통정보가 비어 있을 때 대체로 쓰는 비가동 유형 기본 목록
const DEFAULT_DOWNTIME_LABELS = [
  "계획정지", "품목변경", "전기고장", "기계고장",
  "니들문제", "원료문제", "온도문제", "교육/청소", "기타",
];

// 비가동 코드 → 화면 표시명 매핑표
const DOWNTIME_CODE_TO_LABEL: Record<string, string> = {
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

// 두 시각(분 단위) 차이를 안전하게 계산. 음수면 0으로 막는다.
function diffMinutes(startMs: number, endMs: number): number {
  return Math.max(0, Math.round((endMs - startMs) / 60000));
}

// 비가동유형 공통정보를 펼쳐서 라벨 배열로 만든다. 없으면 기본 목록.
async function resolveDowntimeLabels(): Promise<string[]> {
  const raw = await fetchCommonInfoByCategory("비가동유형");
  const collected: string[] = [];
  (raw || []).forEach((entry: any) => {
    if (Array.isArray(entry.contentValues)) {
      collected.push(...entry.contentValues);
    }
  });
  return collected.length > 0 ? collected : DEFAULT_DOWNTIME_LABELS;
}

export interface StorageLocationResult {
  storageLocation: string;
}

// 보관위치 단건 조회. 실패하거나 정보가 없으면 빈 문자열.
export async function loadStorageLocation(itemSq?: number | null): Promise<StorageLocationResult> {
  if (!itemSq) return { storageLocation: "" };
  try {
    const itemInfo = await fetchItemDetail(itemSq);
    return { storageLocation: itemInfo?.storageLocation || "" };
  } catch {
    return { storageLocation: "" };
  }
}

export interface DowntimeSummary {
  nonOperationTime: string;
  downtimeTypes: { label: string; value: string }[];
  // workStartTime이 없으면 가동시간/가동율은 갱신하지 않으므로 undefined로 둔다.
  operationTime?: string;
  operationRate?: string;
}

// 비가동 이벤트를 집계해 비가동시간/유형별 시간/가동시간/가동율을 산출.
export async function loadDowntimeSummary(workOrderData: any): Promise<DowntimeSummary> {
  try {
    const labels = await resolveDowntimeLabels();

    // 유형별 누적 분(分) 저장소를 0으로 초기화
    const perTypeMinutes = new Map<string, number>();
    labels.forEach((label) => perTypeMinutes.set(label, 0));

    let nonOpTotalMin = 0;

    if (workOrderData.workOrderSq) {
      const events = await fetchNonOperationEvents(workOrderData.workOrderSq);
      (events || []).forEach((ev: any) => {
        const code = ev.downtimeCode || "";

        // downtimeMin이 채워져 있으면 그대로, 아니면 start/end로 직접 환산
        let minutes = ev.downtimeMin || 0;
        if (!minutes && ev.startDt) {
          const startedAt = new Date(ev.startDt).getTime();
          const endedAt = ev.endDt ? new Date(ev.endDt).getTime() : Date.now();
          minutes = diffMinutes(startedAt, endedAt);
        }
        nonOpTotalMin += minutes;

        // 코드를 표시명으로 바꿔 적절한 버킷에 더한다
        const mapped = DOWNTIME_CODE_TO_LABEL[code] || code;
        if (perTypeMinutes.has(mapped)) {
          perTypeMinutes.set(mapped, (perTypeMinutes.get(mapped) || 0) + minutes);
        } else {
          for (const label of labels) {
            if (label.includes(code) || code.includes(label.replace(/[/]/g, ""))) {
              perTypeMinutes.set(label, (perTypeMinutes.get(label) || 0) + minutes);
              break;
            }
          }
        }
      });
    }

    const nonOpHours = Math.floor(nonOpTotalMin / 60);
    const nonOpMins = nonOpTotalMin % 60;

    const result: DowntimeSummary = {
      nonOperationTime: `${nonOpHours}시간 ${nonOpMins}분`,
      downtimeTypes: labels.map((label) => ({
        label,
        value: `${perTypeMinutes.get(label) || 0}분`,
      })),
    };

    // 작업 시작 시각이 있어야 가동시간/가동율을 구할 수 있다.
    // 진행 중이면 종료시각이 null이므로 현재까지 흐른 시간으로 본다.
    if (workOrderData.workStartTime) {
      const startMs = new Date(workOrderData.workStartTime).getTime();
      const endMs = workOrderData.workEndTime
        ? new Date(workOrderData.workEndTime).getTime()
        : Date.now();
      const elapsedMin = diffMinutes(startMs, endMs);
      const runMin = Math.max(0, elapsedMin - nonOpTotalMin);
      result.operationTime = `${Math.floor(runMin / 60)}시간 ${runMin % 60}분`;
      result.operationRate = elapsedMin > 0 ? ((runMin / elapsedMin) * 100).toFixed(2) : "0";
    }

    return result;
  } catch {
    // 실패 시 화면을 깨뜨리지 않도록 빈 결과
    return { nonOperationTime: "", downtimeTypes: [] };
  }
}

export interface InspectSummary {
  inspectionQty?: string;
  appearanceDefect?: string;
  dimensionDefect?: string;
  defectQty?: string;
  goodQty?: string;
}

// 검사 기준의 시료수 합을 검사수량으로, 자주검사 결과의 불합격을
// 측정구분별로 나눠 외관/치수 불량과 양/불 수량을 도출.
export async function loadInspectSummary(workOrderData: any, orderQtyText: string): Promise<InspectSummary> {
  try {
    if (!workOrderData.itemSq) return {};

    const standards = await fetchProcessInspectStandards(workOrderData.itemSq);
    const inspectItems = standards?.[0]?.inspectItems;
    if (!standards || standards.length === 0 || !inspectItems) return {};

    // 검사수량 = 각 검사항목 시료수의 총합
    const totalSamples = inspectItems.reduce(
      (sum: number, item: any) => sum + (parseInt(item.sampleCnt) || 0),
      0,
    );

    const summary: InspectSummary = { inspectionQty: String(totalSamples) };

    try {
      const results = await fetchProcessInspectResults(workOrderData.workOrderSq);
      if (!results || results.length === 0) return summary;

      // itemDtlSq를 키로 결과를 빠르게 찾기 위한 맵
      const resultByDtl = new Map<number, any>();
      results.forEach((r: any) => resultByDtl.set(r.itemDtlSq, r));

      let appearDefect = 0;
      let dimensDefect = 0;

      inspectItems.forEach((item: any) => {
        const saved = resultByDtl.get(item.itemDtlSq);
        // 불합격 판정이 난 항목만 불량으로 합산
        if (saved && saved.passFail === "불합격") {
          const sampleCnt = parseInt(item.sampleCnt) || 0;
          const measureType = (item.measureType || "").trim();
          if (measureType === "정성" || measureType === "정성적") {
            appearDefect += sampleCnt;
          } else if (measureType === "정량" || measureType === "정량적") {
            dimensDefect += sampleCnt;
          }
        }
      });

      const totalDefect = appearDefect + dimensDefect;
      const orderQtyNum = parseFloat(orderQtyText) || 0;

      summary.appearanceDefect = String(appearDefect);
      summary.dimensionDefect = String(dimensDefect);
      summary.defectQty = String(totalDefect);
      // 양품수량 = 지시량 - 불량수량 (음수 방지)
      summary.goodQty = String(Math.max(0, orderQtyNum - totalDefect));
    } catch {
      /* 결과 조회 실패 시 검사수량만 반영하고 나머지는 기존값 유지 */
    }

    return summary;
  } catch {
    return {};
  }
}
