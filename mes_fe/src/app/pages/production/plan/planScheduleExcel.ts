/** [생산관리 > 생산계획] 생산구분 전치표를 xlsx 시트로 만들어 내려받는 export 로직. */
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { scheduleRowHeaders } from "@/app/constants/production";
import { showWarning } from "@/app/utils/toast";
import {
  describeDateHeader,
  readScheduleCell,
  buildScheduleFileName,
} from "./planBoardHelpers";

type ScheduleView = { dates: string[]; plansByDate: Record<string, any[]> };
type AppliedSearch = { dateFrom: string; dateTo: string; lineName: string };

/** 일자별 모든 계획(펼침 여부 무관)을 1열씩 펼친 평탄 열 목록을 만든다. */
function flattenColumns(view: ScheduleView) {
  type Col = { date: string; planIndex: number; plan: any; total: number };
  const cols: Col[] = [];
  for (const date of view.dates) {
    const plans = view.plansByDate[date] || [];
    if (plans.length === 0) {
      cols.push({ date, planIndex: 0, plan: null, total: 0 });
    } else {
      plans.forEach((plan, idx) => cols.push({ date, planIndex: idx, plan, total: plans.length }));
    }
  }
  return cols;
}

/** 전치표 데이터를 엑셀 파일로 저장한다. 출력할 계획이 없으면 경고만 띄운다. */
export function exportScheduleExcel(view: ScheduleView, search: AppliedSearch): void {
  const cols = flattenColumns(view);

  if (cols.length === 0 || !cols.some((c) => c.plan)) {
    showWarning("출력할 데이터가 없습니다.");
    return;
  }

  const columnKeyOf = (col: { date: string; planIndex: number; total: number }) => {
    const label = describeDateHeader(col.date);
    return col.total > 1 ? `${label} #${col.planIndex + 1}` : label;
  };

  const headerRow: Record<string, string> = { 구분: "" };
  for (const col of cols) headerRow[columnKeyOf(col)] = "";

  const rows = scheduleRowHeaders.map((rowHeader) => {
    const row: Record<string, string> = { 구분: rowHeader.label };
    for (const col of cols) {
      row[columnKeyOf(col)] = col.plan ? readScheduleCell(col.plan, rowHeader.key) : "";
    }
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(rows, { header: Object.keys(headerRow) });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "생산구분");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([buf], { type: "application/octet-stream" }),
    buildScheduleFileName(search.dateFrom, search.dateTo, search.lineName),
  );
}
