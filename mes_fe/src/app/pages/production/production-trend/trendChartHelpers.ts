/** 생산추이도 화면 전용 상수와 순수 계산 헬퍼. */

/** 1~12월 한글 라벨. 차트 X축/표 헤더/엑셀 컬럼에 공통 사용. */
export const MONTH_TITLES = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
];

/** 라인별 추이선에 순환 적용할 색상 팔레트. */
export const SERIES_PALETTE = [
  "#4A5CC7", "#22C55E", "#F59E0B", "#EF4444",
  "#0EA5E9", "#A855F7", "#14B8A6", "#F97316",
];

/** 종합(전 라인 합계) 계열을 식별하는 데이터 키와 표시 라벨. */
export const TOTAL_SERIES_KEY = "__total__";
export const TOTAL_SERIES_LABEL = "종합";

/**
 * 데이터의 라인명을 공통정보 라인 키 형태로 통일한다.
 * - 과거 데이터 "A(p1)"/"B(p2)"/"C(c1)" 는 괄호 속 코드("p1" 등)를 채택.
 * - "c1"/"p1" 처럼 소문자만 저장된 경우도 있어 전부 대문자로 맞춘다.
 */
export const toCanonicalLineKey = (name: string): string => {
  if (!name) return "";
  const trimmed = name.trim();
  const inParen = trimmed.match(/\(\s*([^)]+?)\s*\)/);
  return (inParen ? inParen[1] : trimmed).toUpperCase();
};

/** 0 또는 비유한 값은 빈 칸으로, 그 외에는 반올림 후 천단위 콤마로 표기. */
export const formatTrendCell = (value: number): string => {
  if (!isFinite(value) || value === 0) return "";
  return Math.round(value).toLocaleString();
};

/** 올해부터 4년 전까지의 연도 셀렉트 옵션을 만든다. */
export const makeYearOptions = (): { value: string; label: string }[] => {
  const thisYear = new Date().getFullYear();
  const result: { value: string; label: string }[] = [];
  for (let y = thisYear; y >= thisYear - 4; y--) {
    result.push({ value: String(y), label: `${y}년` });
  }
  return result;
};

/** GROUP BY 집계 응답 한 건의 형태(라인명/월/수량). */
export interface TrendSumRow {
  lineName: string;
  month: number | null;
  qty: number | string;
}

/**
 * 집계 응답을 [정규화 라인][월index] 행렬로 적재한다.
 * 공통정보 카탈로그에 정의된 라인만 누적하며, 표기는 카탈로그 원본을 따른다.
 */
export const buildTrendMatrix = (
  sums: TrendSumRow[],
  lineCatalog: string[],
): Record<string, number[]> => {
  const keyToCanonical: Record<string, string> = {};
  for (const line of lineCatalog) {
    keyToCanonical[toCanonicalLineKey(line)] = line;
  }

  const matrix: Record<string, number[]> = {};
  for (const row of sums) {
    if (row.month == null || row.month < 1 || row.month > 12) continue;
    const monthIdx = row.month - 1;
    const canonical = keyToCanonical[toCanonicalLineKey(row.lineName)];
    // 카탈로그 외 라인은 건너뛴다. 옛 "c1" 은 "C1" 로 매칭된다.
    if (!canonical) continue;
    if (!matrix[canonical]) matrix[canonical] = Array(12).fill(0);
    matrix[canonical][monthIdx] += Number(row.qty) || 0;
  }
  return matrix;
};
