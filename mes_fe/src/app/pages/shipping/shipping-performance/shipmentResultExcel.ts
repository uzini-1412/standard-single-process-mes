import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { buildExcelFileName } from "@/app/utils/excelDownload";
import type { ShippingPerformanceData } from "@/types/shipping/performance.interface";
import type { ListColumn } from "../../../components/common/ListTable";

// 전달된 행/컬럼 정의로 출하실적 엑셀 파일을 만들어 즉시 내려받는다
export const exportShipmentResultsExcel = (
  rows: ShippingPerformanceData[],
  columns: ListColumn<ShippingPerformanceData>[],
): void => {
  const sheetRows = rows.map((row, idx) => {
    const record: Record<string, string | number> = { "No.": idx + 1 };
    columns.forEach((column) => {
      if (column.key === "no") return;
      const header = column.label.replace(/\n/g, " ");
      record[header] = String(row[column.key as keyof ShippingPerformanceData] ?? "");
    });
    return record;
  });

  const worksheet = XLSX.utils.json_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "출하실적");
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([buffer], { type: "application/octet-stream" }),
    buildExcelFileName("출하실적"),
  );
};
