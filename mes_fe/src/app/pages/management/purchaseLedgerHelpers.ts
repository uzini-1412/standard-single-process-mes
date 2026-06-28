import type { TradeStatementData, TradeStatementItem } from "../../api/tradeStatementApi";
import { ceilMoney } from "@/app/utils/numberFormat";
import type {
  PurchaseStatusItem,
  PurchaseStatusGroupRes,
} from "@/types/management/purchase.interface";

// 화면 표시에 쓰는 행 번호(no)를 그룹 데이터에 덧붙인 타입
export interface NumberedPurchaseGroup extends PurchaseStatusGroupRes {
  no: number;
}

// 한 그룹을 식별하는 복합 키(계정구분 + 거래처 + 입고일)를 문자열로 합친다
export function makeGroupKey(group: {
  accountType: string;
  customerCode: string;
  inboundDate: string;
}): string {
  return `${group.accountType}_${group.customerCode}_${group.inboundDate}`;
}

// 원화 표기로 변환 (₩ 접두 + 천단위 구분)
export function toWonText(amount: number): string {
  return `₩ ${amount.toLocaleString()}`;
}

// 정렬을 허용할 컬럼 키 집합
export const ORDERABLE_FIELD_KEYS = new Set([
  "inboundDate",
  "customerName",
  "customerCode",
  "accountType",
  "purchaseAmount",
]);

// 선택된 그룹과 그 세부 항목으로 거래명세서 초기 폼 데이터를 구성한다
export function composeTradeStatementForm(
  group: NumberedPurchaseGroup,
  items: PurchaseStatusItem[],
): Partial<TradeStatementData> {
  const lineRows: TradeStatementItem[] = items.map((entry, index) => {
    const supply = ceilMoney((entry.qty || 0) * (entry.unitPrice || 0));
    const vat = ceilMoney(supply * 0.1);
    return {
      rowNo: index + 1,
      productName: entry.itemName || "",
      spec: "",
      qty: entry.qty || null,
      unitPrice: entry.unitPrice || null,
      supplyPrice: supply || null,
      tax: vat || null,
    };
  });

  const supplySum = lineRows.reduce((acc, row) => acc + (row.supplyPrice || 0), 0);
  const vatSum = lineRows.reduce((acc, row) => acc + (row.tax || 0), 0);

  return {
    shipOrderSq: 0,
    statementDate: group.inboundDate || new Date().toISOString().slice(0, 10),
    supplierCompany: group.customerName || "",
    shipAmount: String(supplySum + vatSum),
    sourceType: "PURCHASE",
    sourceKey: `PUR_${group.customerCode}_${group.inboundDate}`,
    items: lineRows,
  };
}
