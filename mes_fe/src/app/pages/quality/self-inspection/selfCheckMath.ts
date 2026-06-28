import { SelfInspectionResult } from "@/types/quality/inspection.interface";

// 우측정렬 + 천단위 콤마가 필요한 결과 컬럼(기준치/상·하한치/시료수/초품/종품)
export const NUMERIC_RESULT_COLUMN_KEYS = new Set<string>([
  "baseVal",
  "maxVal",
  "minVal",
  "sampleNo",
  "firstVal",
  "lastVal",
]);

// 측정값이 상·하한 범위 안에 들어오는지 판정. 빈 한계치는 무한대로 취급
function withinTolerance(measured: number, lower: number, upper: number): boolean {
  return Number.isNaN(measured) || (measured >= lower && measured <= upper);
}

function parseLimit(raw: string, fallback: number): number {
  return raw !== "" ? parseFloat(raw) : fallback;
}

// 한 시료의 초품·종품 값이 모두 허용범위면 합격, 아니면 불합격. 값이 비면 미판정
export function judgeSamplePassFail(
  firstRaw: string,
  lastRaw: string,
  minRaw: string,
  maxRaw: string,
): string {
  if (!firstRaw || !lastRaw) return "";
  const upper = parseLimit(maxRaw, Infinity);
  const lower = parseLimit(minRaw, -Infinity);
  const firstOk = withinTolerance(parseFloat(firstRaw), lower, upper);
  const lastOk = withinTolerance(parseFloat(lastRaw), lower, upper);
  return firstOk && lastOk ? "합격" : "불합격";
}

export interface ExpandedSample {
  sampleIdx: number;
  cnt: number;
  firstVal: string;
  lastVal: string;
  passFail: string;
}

// 콤마로 묶인 초품/종품 문자열을 시료 단위 행 목록으로 전개. 시료별 합부도 함께 계산
export function expandSampleRows(item: SelfInspectionResult): ExpandedSample[] {
  const firstParts = String(item.firstVal || "").split(",").map((v) => v.trim());
  const lastParts = String(item.lastVal || "").split(",").map((v) => v.trim());
  const cnt = Math.max(firstParts.length, lastParts.length, 1);
  return Array.from({ length: cnt }, (_, sampleIdx) => {
    const firstVal = firstParts[sampleIdx] || "";
    const lastVal = lastParts[sampleIdx] || "";
    return {
      sampleIdx,
      cnt,
      firstVal,
      lastVal,
      passFail: judgeSamplePassFail(
        firstVal,
        lastVal,
        String(item.minVal || ""),
        String(item.maxVal || ""),
      ),
    };
  });
}

// 결과 컬럼 key에 대응하는 셀 표시값을 결정. 시료 의존 컬럼은 sample, 나머지는 item에서 가져옴
export function resolveResultCellValue(
  columnKey: string,
  item: SelfInspectionResult,
  sample: ExpandedSample,
): string {
  switch (columnKey) {
    case "sampleNo":
      return String(sample.sampleIdx + 1);
    case "firstVal":
      return sample.firstVal;
    case "lastVal":
      return sample.lastVal;
    case "passFail":
      return sample.passFail;
    default:
      return String(item[columnKey as keyof SelfInspectionResult] ?? "");
  }
}
