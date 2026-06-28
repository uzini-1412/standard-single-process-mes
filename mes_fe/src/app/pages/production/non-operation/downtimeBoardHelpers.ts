/** 기간별비가동현황 화면 전용 순수 집계/포맷 유틸. 부수효과 없음. */
import type { NonOperationData } from "@/types/production/nonoperation.interface";
import type { DowntimeRes } from "@/types/production/workResult.interface";

/**
 * 현장 단말의 축약 비가동코드를 정식 유형명으로 펼치는 표.
 * (현장 앱 DowntimeRegistrationPage 의 downtimeTypeMap 을 뒤집은 것)
 */
export const DOWNTIME_CODE_ALIAS: Record<string, string> = {
  "계획정지": "계획정지",
  "품목변경": "품목변경",
  "기계": "기계고장",
  "전기": "전기고장",
  "니들": "니들문제",
  "원료": "원료문제",
  "온도": "온도문제",
  "교육청소": "교육/청소",
  "기타": "기타",
};

/** 비가동유형 동적 조회가 비었을 때 사용할 기본 유형 묶음. */
export const FALLBACK_DOWNTIME_TYPES = [
  "계획정지", "품목변경", "기계고장", "전기고장", "니들문제",
  "원료문제", "온도문제", "교육/청소", "기타",
];

/** 시각 문자열을 "HH:MM" 으로 정규화. 없으면 "-". */
export const toClockLabel = (raw: string | undefined): string => {
  if (!raw) return "-";
  try {
    if (/^\d{2}:\d{2}$/.test(raw)) return raw;
    if (raw.includes("T")) {
      const timePart = raw.split("T")[1];
      const [hh, mm] = timePart.split(":");
      return `${hh}:${mm}`;
    }
    if (/^\d{2}:\d{2}:\d{2}/.test(raw)) return raw.substring(0, 5);
    return raw;
  } catch {
    return "-";
  }
};

/** 두 시각 문자열 사이 분 차이. 종료 미정이면 현재시각 기준. 양수만 반환. */
const spanMinutes = (startRaw: string, endRaw: string): number => {
  const start = new Date(startRaw).getTime();
  const end = endRaw ? new Date(endRaw).getTime() : Date.now();
  return Math.round((end - start) / 60000);
};

/**
 * 비가동 코드 → 표시 유형명 해석기 생성.
 * 별칭표 → 동적목록 정확일치 → 부분일치 → 원본 순.
 */
export const makeTypeNameResolver = (dynamicTypes: string[]) =>
  (code: string): string => {
    if (DOWNTIME_CODE_ALIAS[code]) return DOWNTIME_CODE_ALIAS[code];
    if (dynamicTypes.includes(code)) return code;
    const partial = dynamicTypes.find((t) => t.includes(code) || code.includes(t));
    return partial || code;
  };

/**
 * 비가동 응답을 작업지시(없으면 일자+라인) 단위로 묶어 유형별 시간을 합산한다.
 * - 투입시간: (종료 ?? 현재) - 시작. 진행중 작업은 현재까지 흐른 시간으로 표시.
 * - 비가동 분: 종료된 건은 downtimeMin, 진행중(endDt=null)은 (현재 - startDt)로 실시간 산출.
 * - 실동시간: 투입시간 - 비가동시간(0 미만은 0).
 * 결과는 생산일 내림차순 정렬 후 No. 부여.
 */
export const aggregateDowntimeBoard = (
  list: DowntimeRes[],
  resolveTypeName: (code: string) => string,
): NonOperationData[] => {
  type Aggregate = NonOperationData & { _woSq?: number };
  const grouped = new Map<string, Aggregate>();

  list.forEach((item) => {
    const groupKey = item.workOrderSq
      ? String(item.workOrderSq)
      : `${item.workDate}-${item.lineSq}`;

    if (!grouped.has(groupKey)) {
      const startTimeStr = item.workStartTime || "";
      let inputMinutes = "-";
      if (startTimeStr) {
        try {
          const minutes = spanMinutes(startTimeStr, item.workEndTime || "");
          if (minutes > 0) inputMinutes = String(minutes);
        } catch { /* 파싱 실패 시 "-" 유지 */ }
      }

      grouped.set(groupKey, {
        id: groupKey,
        no: "",
        workDate: item.workDate || "-",
        lineName: item.lineName || "-",
        startTime: inputMinutes,
        operationTime: "-", // 마지막에 계산
        downtimeTotal: "0",
        downtimeByType: {},
        remark: item.remark || "-",
        _woSq: item.workOrderSq,
      });
    }

    const bucket = grouped.get(groupKey)!;

    let addMin = item.downtimeMin || 0;
    if (!addMin && item.startDt) {
      try {
        addMin = Math.max(0, spanMinutes(item.startDt, item.endDt || ""));
      } catch { /* 무시 */ }
    }
    bucket.downtimeTotal = String((parseFloat(bucket.downtimeTotal) || 0) + addMin);

    if (item.downtimeCode && addMin > 0) {
      const typeName = resolveTypeName(item.downtimeCode);
      const prev = parseFloat(bucket.downtimeByType[typeName] || "0");
      bucket.downtimeByType[typeName] = String(prev + addMin);
    }
  });

  const result = Array.from(grouped.values()).map((bucket) => {
    const inputMin = parseFloat(bucket.startTime) || 0;
    const downMin = parseFloat(bucket.downtimeTotal) || 0;
    if (inputMin > 0) {
      bucket.operationTime = String(Math.max(0, inputMin - downMin));
    }
    return bucket;
  });

  result.sort((a, b) => (b.workDate || "").localeCompare(a.workDate || ""));
  result.forEach((item, idx) => { item.no = String(idx + 1); });
  return result;
};

/** 검색 조건(날짜범위)을 파일명용 토큰으로 압축. */
export const buildDateRangeToken = (from: string, to: string): string | undefined => {
  if (from && to) {
    return from === to
      ? from.replace(/-/g, "")
      : `${from.replace(/-/g, "")}~${to.replace(/-/g, "")}`;
  }
  return (from || to)?.replace(/-/g, "");
};
