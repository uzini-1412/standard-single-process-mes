/** [생산관리 > 생산소요량산출] 상·하단 표가 공유하는 그리드 셸. 헤더/상태행/본문 렌더와 콤마 정렬을 한 곳에서 처리한다. */
import type { ReactNode } from "react";
import { TableStateRow } from "../../../components/common/TableStateRow";
import { NUMBER_ALIGN, HEADER_ALIGN } from "@/app/styles/table-styles";
import { cn } from "@/app/components/ui/utils";

interface GridColumn {
  key: string;
  label: string;
}

interface RequirementGridTableProps {
  columns: GridColumn[];
  loading: boolean;
  isEmpty: boolean;
  emptyText?: string;
  // 데이터 본문 행들. 셀 정렬/포맷은 호출 측이 renderCell에서 결정.
  children: ReactNode;
}

// 헤더 셀 공통 클래스.
const headerCellClass = cn(
  "px-4 py-3 text-center text-xs font-semibold text-white tracking-wider whitespace-nowrap border-r border-white",
  HEADER_ALIGN,
);

// 본문 데이터 셀 공통 클래스. 수치 컬럼이면 우측정렬을 덧붙인다.
export const bodyCellClass = (numeric: boolean): string =>
  cn(
    "px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200",
    numeric && NUMBER_ALIGN,
  );

export function RequirementGridTable({
  columns,
  loading,
  isEmpty,
  emptyText,
  children,
}: RequirementGridTableProps) {
  return (
    <table className="w-full">
      <thead className="sticky top-0 z-10">
        <tr className="bg-[#4A5CC7] border-b border-gray-200">
          {columns.map((col) => (
            <th key={col.key} className={headerCellClass}>
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white">
        <TableStateRow
          loading={loading}
          isEmpty={isEmpty}
          colSpan={columns.length}
          {...(emptyText ? { emptyText } : {})}
        />
        {children}
      </tbody>
    </table>
  );
}
