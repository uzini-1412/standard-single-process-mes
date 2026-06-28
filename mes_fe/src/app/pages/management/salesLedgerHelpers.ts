import type { TradeStatementData, TradeStatementItem } from "../../api/tradeStatementApi";
import type { SalesStatusGroupRes, SalesStatusItem } from "@/types/management/sales.interface";
import { ceilMoney } from "@/app/utils/numberFormat";

// 정렬 토글이 가능한 컬럼 키 집합
export const ORDERABLE_FIELDS = new Set([
  "shipDate",
  "customerName",
  "customerCode",
  "lotNo",
  "salesAmount",
]);

// 행 식별 키 (거래처+출하일+로트번호 조합)
export function groupRowKey(g: Pick<SalesStatusGroupRes, "customerCode" | "shipDate" | "lotNo">): string {
  return `${g.customerCode}_${g.shipDate}_${g.lotNo}`;
}

// 원화 표기 문자열로 변환
export function toWonText(value: number): string {
  return `₩ ${value.toLocaleString()}`;
}

// 선택된 그룹과 품목들로 거래명세서 초안을 생성
export function composeTradeStatementDraft(
  group: SalesStatusGroupRes,
  items: SalesStatusItem[],
): Partial<TradeStatementData> {
  const statementRows: TradeStatementItem[] = items.map((item, index) => {
    const supplyValue = ceilMoney((item.qty || 0) * (item.unitPrice || 0));
    const vatValue = ceilMoney(supplyValue * 0.1);
    return {
      rowNo: index + 1,
      productName: item.itemName || "",
      spec: "",
      qty: item.qty || null,
      unitPrice: item.unitPrice || null,
      supplyPrice: supplyValue || null,
      tax: vatValue || null,
    };
  });

  const supplySum = statementRows.reduce((acc, row) => acc + (row.supplyPrice || 0), 0);
  const vatSum = statementRows.reduce((acc, row) => acc + (row.tax || 0), 0);

  return {
    shipOrderSq: group.shipOrderSq || 0,
    statementDate: group.shipDate || new Date().toISOString().slice(0, 10),
    buyerCompany: group.customerName || "",
    shipAmount: String(supplySum + vatSum),
    sourceType: "SALES",
    sourceKey: `SALES_${group.customerCode}_${group.shipDate}`,
    items: statementRows,
  };
}
