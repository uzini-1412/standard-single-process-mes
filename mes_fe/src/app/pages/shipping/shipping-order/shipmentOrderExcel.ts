// 출하지시 목록을 엑셀(xlsx)로 내보내는 순수 유틸.
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { SHIPPING_ORDER_COLUMNS } from "@/app/constants/shipping";
import { buildExcelFileName } from "@/app/utils/excelDownload";
import type { ShippingOrderData } from "@/types/shipping/order.interface";

// 화면 목록 데이터를 받아 "출하지시관리" 시트 한 장으로 떨군다.
export function exportShipmentOrders(orders: ShippingOrderData[]): void {
  const sheetRows = orders.map((order, idx) => {
    const record: Record<string, string | number> = { "No.": idx + 1 };
    SHIPPING_ORDER_COLUMNS.forEach((col) => {
      if (col.key === "no") return;
      const header = col.label.replace(/\n/g, " ");
      record[header] = String(order[col.key as keyof ShippingOrderData] ?? "");
    });
    return record;
  });

  const sheet = XLSX.utils.json_to_sheet(sheetRows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "출하지시관리");
  const buffer = XLSX.write(book, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buffer], { type: "application/octet-stream" }), buildExcelFileName("출하지시관리"));
}
