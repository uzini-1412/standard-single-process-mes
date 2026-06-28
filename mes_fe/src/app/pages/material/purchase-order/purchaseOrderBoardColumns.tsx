/** 발주 목록 화면의 ListTable 컬럼 정의 + 엑셀 내보내기 헬퍼. */
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { type ListColumn } from "../../../components/common/ListTable";
import { purchaseOrderListColumns } from "@/app/constants/purchase";
import { buildExcelFileName } from "@/app/utils/excelDownload";
import { formatCurrency } from "@/app/utils/numberFormat";
import { showWarning } from "@/app/utils/toast";
import type { PurchaseOrderListItem } from "@/types/material/purchaseorder.intergace";
import { CURRENCY_FIELD_KEYS } from "./purchaseOrderViewModel";

// 공통 컬럼 정의를 ListTable 컬럼으로 변환. 금액은 ₩+우측정렬, 수량은 콤마 숫자.
export const PURCHASE_ORDER_TABLE_COLUMNS: ListColumn<PurchaseOrderListItem>[] =
  purchaseOrderListColumns.map((col) => {
    if (CURRENCY_FIELD_KEYS.has(col.key)) {
      return {
        key: col.key,
        label: col.label,
        width: col.width,
        align: "right" as const,
        render: (row: PurchaseOrderListItem) =>
          formatCurrency(row[col.key as keyof PurchaseOrderListItem] as string | number),
      };
    }
    if (col.key === "orderQty") {
      return { key: col.key, label: col.label, width: col.width, format: "number" as const };
    }
    return { key: col.key, label: col.label, width: col.width };
  });

// 필터된 목록을 엑셀로 저장. 비어 있으면 경고만 띄우고 종료.
export function exportPurchaseOrders(rows: PurchaseOrderListItem[]) {
  if (rows.length === 0) {
    showWarning("출력할 데이터가 없습니다.");
    return;
  }
  const sheetRows = rows.map((row, idx) => {
    const record: Record<string, string | number> = { "No.": idx + 1 };
    purchaseOrderListColumns.forEach((col) => {
      if (col.key !== "no") {
        record[col.label] = String(row[col.key as keyof PurchaseOrderListItem] ?? "");
      }
    });
    return record;
  });
  const worksheet = XLSX.utils.json_to_sheet(sheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "발주관리");
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([buffer], { type: "application/octet-stream" }),
    buildExcelFileName("발주관리"),
  );
}
