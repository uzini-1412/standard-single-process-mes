/** 입고현황 표 컬럼 정의 헬퍼. 수량 계열 컬럼만 천단위 콤마 + 우측정렬로 처리. */
import { type ListColumn } from "../../../components/common/ListTable";
import { ReceivingData } from "@/types/material/receiving.interface";
import { RECEIVING_LIST_COLUMNS } from "@/app/constants/purchase";

// 콤마/우측정렬 대상 컬럼(포장단위·입고량)
const RIGHT_ALIGNED_NUMBER_KEYS = new Set<string>(["packingQty", "passedQty"]);

export const RECEIPT_TABLE_COLUMNS: ListColumn<ReceivingData>[] = RECEIVING_LIST_COLUMNS.map((column) => ({
  key: column.key,
  label: column.label,
  width: column.width,
  ...(RIGHT_ALIGNED_NUMBER_KEYS.has(column.key) ? { format: "number" as const } : {}),
}));
