// 거래명세표 화면의 순수 헬퍼/상수 모음.
import type { TradeStatementItem } from "../../../api/tradeStatementApi";

// 명세표 기본 품목 행 수.
export const STATEMENT_ROW_COUNT = 10;

// 빈 품목 한 행.
export function buildBlankStatementRow(rowNo: number): TradeStatementItem {
  return { rowNo, productName: "", spec: "", qty: null, unitPrice: null, supplyPrice: null, tax: null };
}

// 기본 개수만큼 빈 품목 행 배열.
export function buildBlankStatementRows(): TradeStatementItem[] {
  return Array.from({ length: STATEMENT_ROW_COUNT }, (_, i) => buildBlankStatementRow(i + 1));
}

// 공급가액에서 세액 산출. round=반올림, floor=버림.
export function computeTax(supply: number, mode: "round" | "floor"): number {
  const raw = supply * 0.1;
  return mode === "round" ? Math.round(raw) : Math.floor(raw);
}

// 인쇄 새 창에 주입할 CSS.
export const STATEMENT_PRINT_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Malgun Gothic', sans-serif; font-size: 11px; margin: 0; padding: 5mm 8mm; }
  @page { size: A4; margin: 0; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
  #print-root { width: 100%; }
  .form-wrap { transform-origin: top left; transform: scale(0.74); margin-bottom: -19%; }
  hr.cut { border: none; border-top: 2px dashed #aaa; margin: 1mm 0; }
  table { border-collapse: collapse; width: 100%; table-layout: fixed; }
  td, th { padding: 2px 4px; vertical-align: middle; }
  input { border: none; background: transparent; font-size: inherit; font-family: inherit; width: 100%; text-align: center; outline: none; padding: 1px 1px; }
  input[type=number] { -moz-appearance: textfield; }
  input[type=number]::-webkit-outer-spin-button, input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
`;
