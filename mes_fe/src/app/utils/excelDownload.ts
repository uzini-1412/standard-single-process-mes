import { saveAs } from "file-saver";
import apiClient from "../api/apiClient";
import { todayYmd } from "./dateToday";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// 좌측 0 패딩(두 자리). 월/일/시/분 등 시각 토막에 공통 적용.
const pad2 = (n: number): string => String(n).padStart(2, "0");

/**
 * 백엔드가 만들어 보낸 .xlsx 바이너리를 받아 그대로 저장한다.
 * - 행 수가 많아도 클라이언트에서 다시 가공하지 않으므로 화면 멈춤이 없다.
 * - Authorization(JWT)은 axios 인터셉터가 자동으로 실어 보낸다.
 */
export async function downloadExcel(
  path: string,
  body: Record<string, unknown> = {},
  fileName: string,
): Promise<void> {
  const { data } = await apiClient.post(path, body, { responseType: "blob" });
  saveAs(new Blob([data], { type: XLSX_MIME }), fileName);
}

/** 오늘 날짜를 YYYYMMDD 로. 엑셀 파일명 앞머리에 쓰는 표준 포맷(구분자 없음). */
export function todayYmdCompact(): string {
  return todayYmd().replace(/-/g, "");
}

/** 현재 시각을 HHmm(로컬, 시·분만)로. 예: 오후 1시 9분 → "1309". */
export function nowHm(): string {
  const now = new Date();
  return `${pad2(now.getHours())}${pad2(now.getMinutes())}`;
}

// 비어 있지 않은(=null/undefined/공백 아님) 조건만 추려 문자열로 직렬화한다.
function usableConditions(
  conditions: (string | number | null | undefined)[],
): string[] {
  const out: string[] = [];
  for (const c of conditions) {
    if (c != null && String(c).trim() !== "") out.push(String(c));
  }
  return out;
}

/**
 * 엑셀 파일명 표준 빌더: `YYYYMMDD-HHmm-{조건1}-{조건2}-...-메뉴명.xlsx`
 * - 앞머리는 다운로드 시점의 날짜-시각(시·분)
 * - conditions: 검색 조건(날짜 범위/품번/품명/라인 등). 빈 값/undefined/null은 자동 제외
 * - menuName: 메뉴명 (항상 맨 뒤)
 *
 * 예시:
 *   buildExcelFileName("제품중량현황", ["20260101~20260131", "P1", "ITEM-A"])
 *   → "20260524-1309-20260101~20260131-P1-ITEM-A-제품중량현황.xlsx"
 */
export function buildExcelFileName(
  menuName: string,
  conditions: (string | number | null | undefined)[] = [],
): string {
  const segments = [
    todayYmdCompact(),
    nowHm(),
    ...usableConditions(conditions),
    menuName,
  ];
  return `${segments.join("-")}.xlsx`;
}
