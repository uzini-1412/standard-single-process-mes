/** [생산관리 > 생산일보] 화면에서만 쓰는 순수 변환 유틸 모음. workResultApi 응답을 표 행으로 가공한다. */
import type { WorkPerformanceData } from "@/types/production/performance.interface";
import { workPerformanceColumns } from "@/app/constants/production";
import { buildExcelFileName as buildStdExcelFileName } from "@/app/utils/excelDownload";
import type { ListColumn } from "../../../components/common/ListTable";
import type { WorkResultRes } from "../../../api/workResultApi";

// 우측정렬 + 천단위 콤마가 필요한 수량/측정값 컬럼 키. (금액 항목은 이 화면에 없음)
const NUMERIC_COLUMN_KEYS = new Set<string>([
  "basisWeight",
  "length",
  "width",
  "targetQty",
  "realBasisWeight",
  "manageLength",
  "grossWeight",
  "duration",
]);

// 헤더 클릭으로 정렬 가능한 컬럼 키.
const ORDERABLE_COLUMN_KEYS = new Set([
  "workDate",
  "lineName",
  "totalProdQty",
  "totalGoodQty",
  "totalBadQty",
  "startTime",
  "endTime",
]);

export type ListSortDirection = "ASC" | "DESC";

export interface ResultAppliedFilters {
  dateFrom: string;
  dateTo: string;
  itemCode: string;
  itemName: string;
  lineName: string;
}

export const EMPTY_RESULT_FILTERS: ResultAppliedFilters = {
  dateFrom: "",
  dateTo: "",
  itemCode: "",
  itemName: "",
  lineName: "",
};

// workPerformanceColumns 정의를 ListTable 컬럼 스펙으로 한 번에 환산.
export const buildResultListColumns = (): ListColumn<WorkPerformanceData>[] =>
  workPerformanceColumns.map((column) => ({
    key: column.key,
    label: column.label,
    sortable: ORDERABLE_COLUMN_KEYS.has(column.key),
    ...(NUMERIC_COLUMN_KEYS.has(column.key) ? { format: "number" as const } : {}),
  }));

// 서버가 내려준 다양한 시각 표현을 HH:MM 문자열로 정규화. 실패하면 "-".
export const normalizeClockText = (rawTime: any): string => {
  if (!rawTime) return "-";
  try {
    if (Array.isArray(rawTime)) {
      const [, , , hour = 0, minute = 0] = rawTime;
      return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    }
    const text = String(rawTime);
    if (/^\d{2}:\d{2}$/.test(text)) return text;
    if (text.includes("T")) {
      const [hh, mm] = text.split("T")[1].split(":");
      return `${hh}:${mm}`;
    }
    if (text.includes(" ")) {
      const [hh, mm] = text.split(" ")[1].split(":");
      return `${hh}:${mm}`;
    }
    if (/^\d{2}:\d{2}:\d{2}/.test(text)) return text.substring(0, 5);
    return text;
  } catch {
    return "-";
  }
};

// 시각/타임스탬프 값을 Date 객체로 환산. 형식 불명이면 null.
const parseToDate = (raw: any): Date | null => {
  if (!raw) return null;
  try {
    if (Array.isArray(raw)) {
      const [year, month, day, hour = 0, minute = 0, second = 0] = raw;
      return new Date(year, month - 1, day, hour, minute, second);
    }
    const text = String(raw);
    if (text.includes("T")) return new Date(text);
    if (text.includes(" ")) return new Date(text.replace(" ", "T"));
    return new Date(`2000-01-01T${text}`);
  } catch {
    return null;
  }
};

// 시작/종료 시각 차이를 분 단위 정수 문자열로 반환. 음수/계산불가면 "-".
export const computeElapsedMinutes = (startRaw?: any, endRaw?: any): string => {
  const startedAt = parseToDate(startRaw);
  const endedAt = parseToDate(endRaw);
  if (!startedAt || !endedAt) return "-";
  const minutes = (endedAt.getTime() - startedAt.getTime()) / (1000 * 60);
  return minutes > 0 ? Math.round(minutes).toString() : "-";
};

// 원본 실적 응답 배열을 화면 표시용 행 배열로 매핑. baseNo는 페이지 누적 일련번호 기준점.
export const mapResultsToRows = (
  source: WorkResultRes[],
  baseNo: number,
): WorkPerformanceData[] =>
  source.map((entry, offset) => ({
    id: `${entry.resultSq}-${offset}`,
    no: String(baseNo + offset + 1),
    workDate: entry.workDate || "-",
    lineName: entry.lineName || "-",
    itemCode: entry.itemCode || "-",
    itemName: entry.itemName || "-",
    basisWeight: entry.basisWeight ? String(entry.basisWeight) : "-",
    length: entry.length ? String(entry.length) : "-",
    width: entry.width ? String(entry.width) : "-",
    targetQty: entry.targetQty ?? 0,
    realBasisWeight: entry.realBasisWeight ? String(entry.realBasisWeight) : "-",
    manageLength: entry.manageLength ? String(entry.manageLength) : "-",
    grossWeight: entry.grossWeight ? String(entry.grossWeight) : "-",
    startTime: normalizeClockText(entry.startTime),
    endTime: normalizeClockText(entry.endTime),
    duration: computeElapsedMinutes(entry.startTime, entry.endTime),
    lotNo: entry.lotNo || entry.productionLotNo || "-",
  }));

// 적용된 필터 값으로 엑셀 파일명을 구성. 일자 구간은 동일일자면 한 토큰으로 합친다.
export const composeResultExcelFileName = (filters: ResultAppliedFilters): string => {
  const dateToken = filters.dateFrom && filters.dateTo
    ? (filters.dateFrom === filters.dateTo
        ? filters.dateFrom.replace(/-/g, "")
        : `${filters.dateFrom.replace(/-/g, "")}~${filters.dateTo.replace(/-/g, "")}`)
    : (filters.dateFrom || filters.dateTo)?.replace(/-/g, "");
  return buildStdExcelFileName("생산실적", [dateToken, filters.lineName, filters.itemCode, filters.itemName]);
};

// 행 배열을 엑셀 시트용 라벨-값 레코드 배열로 변환.
export const buildResultSheetRecords = (
  rows: WorkPerformanceData[],
): Record<string, string>[] =>
  rows.map((row) =>
    workPerformanceColumns.reduce((record: Record<string, string>, column) => {
      record[column.label] = String(row[column.key as keyof WorkPerformanceData] ?? "");
      return record;
    }, {}),
  );
