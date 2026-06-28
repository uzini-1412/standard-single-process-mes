import { type ListColumn } from "../../../components/common/ListTable";
import { COLLECTION_LIST_COLUMNS } from "@/app/constants/management";
import type { CollectionListItem } from "@/types/management/collection.interface";
import { toWonLabel } from "./receivablesFormat";

// 강조 표기가 필요한 매출액 셀 렌더러.
const renderEmphasizedAmount = (amount: number) => (
  <span className="font-medium">{toWonLabel(amount)}</span>
);

// 목록 테이블 컬럼 정의를 만들어 반환한다.
// 일련번호는 현재 페이지 기준 번호(baseNo)에서 이어 붙인다.
export function buildReceivablesColumns(baseNo: number): ListColumn<CollectionListItem>[] {
  return COLLECTION_LIST_COLUMNS.map((c) => {
    switch (c.key) {
      case "no":
        return {
          key: c.key, label: c.label, width: c.width,
          render: (_row: CollectionListItem, i: number) => baseNo + i + 1,
        };
      case "totalAmt":
        return {
          key: c.key, label: c.label, width: c.width, align: "right" as const,
          render: (row: CollectionListItem) => renderEmphasizedAmount(row.totalAmt || 0),
        };
      case "totalCollectionAmt":
        return {
          key: c.key, label: c.label, width: c.width, align: "right" as const,
          render: (row: CollectionListItem) => toWonLabel(row.totalCollectionAmt || 0),
        };
      default:
        return { key: c.key, label: c.label, width: c.width };
    }
  });
}
