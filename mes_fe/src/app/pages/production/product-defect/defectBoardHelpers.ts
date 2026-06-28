/** 기간별불량현황 화면 전용 순수 변환/조회 헬퍼 모음. */
import * as workResultApi from "../../../api/workResultApi";
import { ProductDefectData } from "@/types/production/defect.interface";

/** 불량유형 셀렉트의 기본 후보 (공통정보 미설정 시 대체값). */
export const FALLBACK_DEFECT_KINDS = ["외관불량", "치수불량", "기타"];

/** 화면 상단 검색 조건 상태 묶음. */
export interface DefectSearchState {
  dateFrom: string;
  dateTo: string;
  itemCode: string;
  itemName: string;
  line: string;
}

export const EMPTY_DEFECT_SEARCH: DefectSearchState = {
  dateFrom: "",
  dateTo: "",
  itemCode: "",
  itemName: "",
  line: "",
};

/**
 * 마스터 집계 응답 1건을 표 한 행으로 환산한다.
 * 외관/치수 불량은 마스터 컬럼에서 직접 읽고, 기타는 (총불량-외관-치수)로 역산한다.
 */
export function mapSummaryRowToDefectData(
  result: Awaited<ReturnType<typeof workResultApi.fetchPeriodDefectSummary>>[number],
  index: number,
): ProductDefectData {
  const perKind: Record<string, string> = {};
  const appearanceQty = parseFloat(result.appearanceDefect) || 0;
  const dimensionQty = parseFloat(result.dimensionDefect) || 0;

  if (appearanceQty > 0) perKind["외관불량"] = String(appearanceQty);
  if (dimensionQty > 0) perKind["치수불량"] = String(dimensionQty);

  // 나머지 불량은 전체에서 두 항목을 뺀 잔여로 본다.
  const badTotal = result.totalBadQty || 0;
  const remainder = badTotal - appearanceQty - dimensionQty;
  if (remainder > 0) perKind["기타"] = String(remainder);

  return {
    id: String(result.resultSq),
    no: String(index + 1),
    workDate: result.workDate || "-",
    lineName: result.lineName || "-",
    itemCode: result.itemCode || "-",
    itemName: result.itemName || "-",
    basisWeight: result.basisWeight ? String(result.basisWeight) : "-",
    length: result.length ? String(result.length) : "-",
    prodQty: result.totalProdQty ? String(result.totalProdQty) : "-",
    badQty: badTotal > 0 ? String(badTotal) : "0",
    defectTypes: perKind,
    remark: "-",
  };
}

/** 검색 조건에 맞는 행만 추려낸다(클라이언트 측 필터). */
export function applyDefectFilter(
  rows: ProductDefectData[],
  search: DefectSearchState,
): ProductDefectData[] {
  return rows.filter((entry) => {
    if (search.dateFrom && entry.workDate < search.dateFrom) return false;
    if (search.dateTo && entry.workDate > search.dateTo) return false;
    if (search.itemCode && !entry.itemCode.toLowerCase().includes(search.itemCode.toLowerCase())) return false;
    if (search.itemName && !entry.itemName.toLowerCase().includes(search.itemName.toLowerCase())) return false;
    if (search.line && entry.lineName !== search.line) return false;
    return true;
  });
}

/** 현재 페이지에 해당하는 구간을 잘라내고 No.를 다시 매긴다. */
export function sliceDefectPage(
  rows: ProductDefectData[],
  pageIndex: number,
  pageSize: number,
): ProductDefectData[] {
  const start = pageIndex * pageSize;
  return rows
    .slice(start, start + pageSize)
    .map((entry, offset) => ({ ...entry, no: String(start + offset + 1) }));
}
