/** [자재불량현황] 엑셀 다운로드 전용 로직. 시트 구성·파일명 규칙은 원본과 동일. */
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { buildExcelFileName } from "@/app/utils/excelDownload";
import { MaterialDefectData } from "@/types/material/defect.interface";
import { MATERIAL_DEFECT_COLUMNS } from "@/app/constants/purchase";

// 전체 행을 받아 워크북을 만들고 즉시 파일로 저장
export function exportDefectExcel(rows: MaterialDefectData[]): void {
  const sheetRows = rows.map((row, idx) => {
    const record: Record<string, string | number> = { "No.": idx + 1 };
    MATERIAL_DEFECT_COLUMNS.forEach((col) => {
      if (col.key !== "no") {
        record[col.label] = String(row[col.key as keyof MaterialDefectData] ?? "");
      }
    });
    return record;
  });

  const worksheet = XLSX.utils.json_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "자재불량현황");
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([buffer], { type: "application/octet-stream" }),
    buildExcelFileName("자재불량현황"),
  );
}
