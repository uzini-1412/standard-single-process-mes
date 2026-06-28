/** 설비가동현황 화면 전용 순수 계산/포맷 유틸. 부수효과 없이 입력만으로 결과를 산출한다. */
import type { DowntimeRes } from "@/types/production/workResult.interface";

/**
 * 현장 단말이 기록하는 축약 비가동코드를 공통정보상의 정식 유형명으로 펼친다.
 * (현장 앱에서 줄여 저장한 값 → 사람이 읽는 전체 명칭)
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

/** 가동/비가동 세그먼트 한 줄을 표현하는 테이블 행 형태. */
export interface RunSegmentRow {
  id: string;
  no: string;
  workDate: string;
  lineName: string;
  opStart: string;
  opEnd: string;
  opMinutes: string;
  dtStart: string;
  dtEnd: string;
  dtMinutes: string;
  dtType: string;
}

/** ISO/날짜 문자열을 epoch 밀리초로. 파싱 불가 시 null. */
export const parseEpoch = (value?: string | null): number | null => {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
};

/** 다양한 시각 표현을 "HH:MM" 형태로 정규화. 비어있으면 "-". */
export const toClockLabel = (value?: string | null): string => {
  if (!value) return "-";
  try {
    if (/^\d{2}:\d{2}$/.test(value)) return value;
    if (/^\d{2}:\d{2}:\d{2}/.test(value)) return value.substring(0, 5);
    if (value.includes("T")) {
      const timePart = value.split("T")[1] ?? "";
      const [hh, mm] = timePart.split(":");
      if (hh && mm) return `${hh}:${mm}`;
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      const hh = String(parsed.getHours()).padStart(2, "0");
      const mm = String(parsed.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    }
    return value;
  } catch {
    return "-";
  }
};

/** 두 시각(ms) 사이 경과 분. 음수는 0으로 바닥 처리, 결측이면 "-". */
export const elapsedMinutes = (startMs: number | null, endMs: number | null): string => {
  if (startMs == null || endMs == null) return "-";
  const minutes = Math.max(0, Math.round((endMs - startMs) / 60000));
  return String(minutes);
};

/**
 * 비가동 코드 → 표시용 유형명 해석기를 만든다.
 * 우선순위: 별칭표 → 동적 유형 목록 정확일치 → 부분일치 → 원본 코드.
 */
export const makeTypeNameResolver = (dynamicTypes: string[]) =>
  (code?: string | null): string => {
    if (!code) return "-";
    if (DOWNTIME_CODE_ALIAS[code]) return DOWNTIME_CODE_ALIAS[code];
    if (dynamicTypes.includes(code)) return code;
    const partial = dynamicTypes.find((t) => t.includes(code) || code.includes(t));
    return partial || code;
  };

/**
 * 작업지시 단위로 응답을 묶은 뒤 가동/비가동 구간을 교차 분해해 행 목록을 만든다.
 * - 비가동이 전혀 없는 합성 행(downtimeSq=null): 가동만 표현한 1행.
 * - 비가동 N건: [직전 가동 + 그 비가동]을 한 행씩, 마지막에 잔여 가동 1행.
 * - 비가동이 종료 안 됨(endDt=null): 이어질 가동 시작 전이라 잔여 가동 행은 생략.
 * - 작업 미종료(workEndTime=null): 마지막 가동 종료시각은 "-".
 */
export const composeSegmentRows = (
  list: DowntimeRes[],
  resolveTypeName: (code?: string | null) => string,
): RunSegmentRow[] => {
  type Bucket = {
    workStart: string | null;
    workEnd: string | null;
    workDate: string;
    lineName: string;
    downtimes: DowntimeRes[];
    key: string;
  };
  const buckets = new Map<string, Bucket>();

  for (const d of list) {
    const bucketKey = d.workOrderSq
      ? `wo-${d.workOrderSq}`
      : `syn-${d.workDate}-${d.lineSq}-${d.downtimeSq ?? "x"}`;
    let bucket = buckets.get(bucketKey);
    if (!bucket) {
      bucket = {
        workStart: d.workStartTime ?? null,
        workEnd: d.workEndTime ?? null,
        workDate: d.workDate || "-",
        lineName: d.lineName || "-",
        downtimes: [],
        key: bucketKey,
      };
      buckets.set(bucketKey, bucket);
    } else {
      // 동일 작업지시의 여러 비가동 레코드에 흩어진 작업 시각/메타를 채워 넣는다.
      if (!bucket.workStart && d.workStartTime) bucket.workStart = d.workStartTime;
      if (!bucket.workEnd && d.workEndTime) bucket.workEnd = d.workEndTime;
      if (bucket.workDate === "-" && d.workDate) bucket.workDate = d.workDate;
      if (bucket.lineName === "-" && d.lineName) bucket.lineName = d.lineName;
    }
    // 합성 행은 실제 비가동이 아니므로 구간 분해 대상에서 뺀다.
    if (d.downtimeSq != null) bucket.downtimes.push(d);
  }

  const rows: RunSegmentRow[] = [];
  buckets.forEach((bucket) => {
    const ordered = [...bucket.downtimes].sort((a, b) =>
      (a.startDt || "").localeCompare(b.startDt || ""),
    );
    const { workStart, workEnd } = bucket;

    let cursor: string | null = workStart;

    ordered.forEach((dt, i) => {
      const opStart = cursor;
      const opEnd = dt.startDt;
      const dtEnd = dt.endDt || null;
      // 진행중 비가동도 백엔드가 (시작~현재)로 채워 내려준다.
      const dtMinutes = dt.downtimeMin != null ? String(dt.downtimeMin) : "-";

      rows.push({
        id: `${bucket.key}-seg-${i}`,
        no: "",
        workDate: bucket.workDate,
        lineName: bucket.lineName,
        opStart: toClockLabel(opStart),
        opEnd: toClockLabel(opEnd),
        opMinutes: elapsedMinutes(parseEpoch(opStart), parseEpoch(opEnd)),
        dtStart: toClockLabel(dt.startDt),
        dtEnd: toClockLabel(dtEnd),
        dtMinutes,
        dtType: resolveTypeName(dt.downtimeCode),
      });

      cursor = dtEnd; // 비가동 미종료면 null → 잔여 가동 행은 만들지 않는다.
    });

    // 모든 비가동 이후(또는 비가동 부재 시)의 잔여 가동 한 줄.
    if (cursor != null) {
      const opEnd = workEnd; // null이면 진행중
      rows.push({
        id: `${bucket.key}-seg-final`,
        no: "",
        workDate: bucket.workDate,
        lineName: bucket.lineName,
        opStart: toClockLabel(cursor),
        opEnd: toClockLabel(opEnd),
        opMinutes: workEnd ? elapsedMinutes(parseEpoch(cursor), parseEpoch(opEnd)) : "-",
        dtStart: "-",
        dtEnd: "-",
        dtMinutes: "-",
        dtType: "-",
      });
    }
  });

  rows.sort((a, b) => {
    const byDate = (b.workDate || "").localeCompare(a.workDate || "");
    if (byDate !== 0) return byDate;
    const byLine = (a.lineName || "").localeCompare(b.lineName || "");
    if (byLine !== 0) return byLine;
    return (a.opStart || "").localeCompare(b.opStart || "");
  });

  rows.forEach((r, idx) => { r.no = String(idx + 1); });
  return rows;
};

/** 검색 조건(날짜범위/라인)을 파일명용 토큰으로 압축한다. */
export const buildDateRangeToken = (from: string, to: string): string | undefined => {
  if (from && to) {
    return from === to
      ? from.replace(/-/g, "")
      : `${from.replace(/-/g, "")}~${to.replace(/-/g, "")}`;
  }
  return (from || to)?.replace(/-/g, "");
};
