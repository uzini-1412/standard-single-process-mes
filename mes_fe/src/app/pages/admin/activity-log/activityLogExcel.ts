import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { buildExcelFileName } from "@/app/utils/excelDownload";
import { ACTION_LABEL_MAP, type ActivityLogRes } from "../../../api/activityLogApi";

const SHEET_TITLE = "사용자활동이력";

function toTimestampText(raw?: string): string {
  if (!raw) return "";
  return raw.replace("T", " ").slice(0, 19);
}

// 한 건의 로그를 엑셀 한 행(컬럼명→값)으로 변환
function toSheetRow(log: ActivityLogRes, index: number) {
  return {
    "No.": index + 1,
    "일시": toTimestampText(log.regDt),
    "사용자ID": log.userId ?? "",
    "사용자명": log.staffName ?? "",
    "활동구분": ACTION_LABEL_MAP[log.actionType] ?? log.actionType,
    "메뉴": log.menuName ?? "",
    "대상": log.targetId ?? "",
    "Method": log.httpMethod ?? "",
    "요청 URL": log.requestUri ?? "",
    "IP": log.ipAddress ?? "",
    "상세": log.detail ?? "",
  };
}

/** 활동이력 목록을 xlsx 로 만들어 내려받는다. */
export function downloadActivityLogExcel(logs: ActivityLogRes[]): void {
  const sheet = XLSX.utils.json_to_sheet(logs.map(toSheetRow));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, SHEET_TITLE);
  const binary = XLSX.write(book, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([binary], { type: "application/octet-stream" }), buildExcelFileName(SHEET_TITLE));
}
