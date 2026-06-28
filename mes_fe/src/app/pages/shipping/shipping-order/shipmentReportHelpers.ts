// 출하성적서 화면의 순수 헬퍼·상수 모음.
import type { ShipmentReportItem } from "../../../api/shipmentReportApi";

// 양식 기본 행 수.
export const REPORT_ROW_COUNT = 14;

// 인쇄 양식 팔레트 (사진 기준).
export const REPORT_PALETTE = {
  labelBg: "#e8eaed", // 회색 라벨 배경
  headerBg: "#e8eaed", // 헤더 배경
  zebraBg: "#f5f5f5", // 짝수 행 음영
  border: "#000", // 외곽선
  lightBorder: "#888", // 셀 구분선
};

// 빈 성적서 한 행. 인덱스로 No/ROLL 기본값을 채운다.
export function buildEmptyReportRow(idx: number): ShipmentReportItem {
  return {
    rowNo: idx + 1,
    rollNo: String(idx + 1),
    width: null,
    length: null,
    rollWeight: null,
    rollBasis: null,
    weightLeft: null,
    weightCenter: null,
    weightRight: null,
  };
}

// 지정 개수만큼 빈 행 배열을 만든다.
export function buildEmptyReportRows(count: number): ShipmentReportItem[] {
  return Array.from({ length: count }, (_, i) => buildEmptyReportRow(i));
}

// 새 창 인쇄에 주입할 CSS.
export const REPORT_PRINT_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Malgun Gothic', sans-serif; font-size: 12px; margin: 0; padding: 8mm; }
  @page { size: A4 landscape; margin: 8mm; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  table { border-collapse: collapse; width: 100%; }
  td, th { padding: 3px 5px; vertical-align: middle; }
  input { border: none; background: transparent; font-size: inherit; font-family: inherit; width: 100%; text-align: center; outline: none; }
  input[type=number] { -moz-appearance: textfield; }
  input[type=number]::-webkit-outer-spin-button, input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
`;
