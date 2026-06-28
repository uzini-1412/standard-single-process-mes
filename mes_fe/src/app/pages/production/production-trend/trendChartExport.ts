/** 생산추이도 엑셀 내보내기 로직. */
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { buildExcelFileName } from "@/app/utils/excelDownload";
import { MONTH_TITLES, TOTAL_SERIES_KEY, TOTAL_SERIES_LABEL } from "./trendChartHelpers";

const SHEET_TITLE = "생산분석";

interface TrendExcelInput {
  activeLines: string[];
  matrix: Record<string, number[]>;
  lineTotals: Record<string, number>;
  monthlyTotals: number[];
  year: string;
}

/** 라인별 행 + 마지막 종합 행을 엮어 워크북으로 내보낸다. */
export function downloadTrendExcel({
  activeLines,
  matrix,
  lineTotals,
  monthlyTotals,
  year,
}: TrendExcelInput): void {
  const perLineRows = activeLines.map((line) => {
    const record: Record<string, string | number> = { 구분: line };
    MONTH_TITLES.forEach((label, monthIdx) => {
      record[label] = Math.round(matrix[line]?.[monthIdx] ?? 0);
    });
    record["합계"] = Math.round(lineTotals[line] ?? 0);
    return record;
  });

  const totalRow: Record<string, string | number> = { 구분: TOTAL_SERIES_LABEL };
  MONTH_TITLES.forEach((label, monthIdx) => {
    totalRow[label] = Math.round(monthlyTotals[monthIdx] ?? 0);
  });
  totalRow["합계"] = Math.round(lineTotals[TOTAL_SERIES_KEY] ?? 0);

  const sheetRows = [...perLineRows, totalRow];

  const worksheet = XLSX.utils.json_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, SHEET_TITLE);
  const payload = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([payload], { type: "application/octet-stream" }),
    buildExcelFileName(SHEET_TITLE, [year]),
  );
}
