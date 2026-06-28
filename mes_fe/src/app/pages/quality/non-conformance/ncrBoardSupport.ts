/** 부적합 목록 화면 전용 순수 보조 로직 모음 — 라벨 매핑/필터/엑셀 행 구성. */
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { buildExcelFileName } from "@/app/utils/excelDownload";
import { NonConformanceData } from "@/types/quality/nonConformance.interface";
import { NonConformColumns } from "@/app/constants/quailtyNonConform";

// 발생분류 코드 → 한글 표기 변환표
export const OCCUR_TYPE_LABEL: Record<string, string> = {
  MATERIAL: "입고",
  PROCESS: "공정",
  SHIPMENT: "출하",
  CUSTOMER: "고객",
};

// 조치상태 코드 → 한글 표기 변환표
export const ACTION_STATE_LABEL: Record<string, string> = {
  WAIT: "미조치",
  DONE: "조치완료",
};

// 분류 셀렉트에 노출할 선택지(전체 포함)
export const CATEGORY_CHOICES = [
  { value: "", label: "전체" },
  { value: "MATERIAL", label: "입고" },
  { value: "PROCESS", label: "공정" },
  { value: "SHIPMENT", label: "출하" },
  { value: "CUSTOMER", label: "고객" },
];

// 서버 원본 1건을 화면 표시용 행 객체로 정규화
function toBoardRow(raw: any, position: number): NonConformanceData {
  const occur = raw.occurType || "";
  const state = raw.actionStatus || "";
  return {
    ncrSq: raw.ncrSq,
    no: String(position + 1),
    occurType: occur,
    occurTypeName: OCCUR_TYPE_LABEL[occur] || occur,
    occurDate: raw.occurDate || "",
    occurPlace: raw.occurPlace || "",
    itemCode: raw.itemCode || "",
    itemName: raw.itemName || "",
    lotNo: raw.lotNo || "",
    badQty: Number(raw.badQty) || 0,
    defectType: raw.defectType || "",
    finderNm: raw.finderNm || "",
    actionStatus: state,
    actionStatusName: ACTION_STATE_LABEL[state] || state,
    actionDate: raw.actionDate || "",
    actionContent: raw.actionContent || "",
    managerNm: raw.managerNm || "",
  };
}

// 서버 응답 배열 전체를 화면용 행 배열로 매핑
export function mapToBoardRows(list: any[]): NonConformanceData[] {
  return list.map((raw, idx) => toBoardRow(raw, idx));
}

// 검색 조건 묶음 타입
export interface BoardFilterCriteria {
  dateFrom: string;
  dateTo: string;
  itemCode: string;
  itemName: string;
  category: string;
  defectType: string;
}

// 단일 행이 현재 검색 조건을 모두 통과하는지 판정
function matchesCriteria(row: NonConformanceData, q: BoardFilterCriteria): boolean {
  if (q.dateFrom && (!row.occurDate || row.occurDate < q.dateFrom)) return false;
  if (q.dateTo && (!row.occurDate || row.occurDate > q.dateTo)) return false;
  if (q.itemCode && !row.itemCode.toLowerCase().includes(q.itemCode.toLowerCase())) return false;
  if (q.itemName && !row.itemName.toLowerCase().includes(q.itemName.toLowerCase())) return false;
  if (q.category && row.occurType !== q.category) return false;
  if (q.defectType && row.defectType !== q.defectType) return false;
  return true;
}

// 검색 조건에 부합하는 행만 남겨 반환
export function applyBoardFilter(rows: NonConformanceData[], q: BoardFilterCriteria): NonConformanceData[] {
  return rows.filter((row) => matchesCriteria(row, q));
}

// 필터링된 행들을 부적합 시트로 내보내기(클라이언트 다운로드)
export function exportBoardRowsToExcel(rows: NonConformanceData[]): void {
  const sheetRows = rows.map((row, idx) => {
    const record: Record<string, string | number> = { "No.": idx + 1 };
    NonConformColumns.forEach((col) => {
      if (col.key !== "no") {
        record[col.label] = String(row[col.key as keyof NonConformanceData] ?? "");
      }
    });
    return record;
  });
  const sheet = XLSX.utils.json_to_sheet(sheetRows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "부적합");
  const binary = XLSX.write(book, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([binary], { type: "application/octet-stream" }), buildExcelFileName("부적합"));
}
