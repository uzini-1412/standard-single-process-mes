/** 기간별불량현황 엑셀 내보내기 + 동적 컬럼 구성 로직. */
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { buildExcelFileName } from "@/app/utils/excelDownload";
import { formatNumber } from "@/app/utils/numberFormat";
import { type ListColumnDef } from "../../../components/common/ListTable";
import { ProductDefectData } from "@/types/production/defect.interface";

const SHEET_TITLE = "불량현황";

/**
 * 표 컬럼 정의를 만든다. 불량유형 항목이 존재하면 그 항목들을
 * "불량유형" 2단 그룹 헤더 아래에 우측정렬 셀로 묶는다.
 */
export function buildDefectColumns(
  defectKinds: string[],
): ListColumnDef<ProductDefectData>[] {
  const grouped =
    defectKinds.length > 0
      ? [
          {
            label: "불량유형",
            children: defectKinds.map((kind) => ({
              key: `dt_${kind}`,
              label: kind,
              align: "right" as const,
              render: (row: ProductDefectData) => formatNumber(row.defectTypes[kind] || "0"),
            })),
          },
        ]
      : [];

  return [
    { key: "no", label: "No." },
    { key: "workDate", label: "생산일" },
    { key: "lineName", label: "라인" },
    { key: "itemCode", label: "품번" },
    { key: "itemName", label: "품명" },
    { key: "basisWeight", label: "평량", format: "number" },
    { key: "length", label: "길이", format: "number" },
    { key: "prodQty", label: "생산량", format: "number" },
    { key: "badQty", label: "불량수량", format: "number" },
    ...grouped,
    { key: "remark", label: "비고" },
  ];
}

/** 필터링된 행을 엑셀 워크북으로 빚어 즉시 다운로드한다. */
export function downloadDefectExcel(
  rows: ProductDefectData[],
  defectKinds: string[],
): void {
  const sheetRows = rows.map((entry, idx) => {
    const record: Record<string, string> = {
      "No.": String(idx + 1),
      "생산일": entry.workDate,
      "라인": entry.lineName,
      "품번": entry.itemCode,
      "품명": entry.itemName,
      "평량": entry.basisWeight,
      "길이": entry.length,
      "생산량": entry.prodQty,
      "불량수량": entry.badQty,
    };
    defectKinds.forEach((kind) => {
      record[kind] = entry.defectTypes[kind] || "0";
    });
    record["비고"] = entry.remark;
    return record;
  });

  const worksheet = XLSX.utils.json_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, SHEET_TITLE);
  const payload = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([payload], { type: "application/octet-stream" }),
    buildExcelFileName(SHEET_TITLE),
  );
}
