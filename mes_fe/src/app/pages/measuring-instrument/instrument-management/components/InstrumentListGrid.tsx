import { INSTRUMENT_COLUMNS } from "@/app/constants/measuring";
import { ListTable, type ListColumn } from "@/app/components/common/ListTable";
import { useClientPagedList } from "@/app/hooks/useClientPagedList";
import { formatCurrency } from "@/app/utils/numberFormat";
import type { InstrumentData } from "@/types/measuring-instrument/instrumentManager.interface";

interface InstrumentListGridProps {
  rows: InstrumentData[];
  loading: boolean;
  onRowClick: (row: InstrumentData) => void;
}

export function InstrumentListGrid({
  rows,
  loading,
  onRowClick,
}: InstrumentListGridProps) {
  const { pagedRows, baseNo, pagination } = useClientPagedList(rows);

  // 컬럼 정의 중 일부(순번/금액/잔여일)는 커스텀 렌더러로 덮어쓴다.
  const columns: ListColumn<InstrumentData>[] = INSTRUMENT_COLUMNS.map((column) => {
    if (column.key === "No") {
      return {
        key: column.key,
        label: column.label,
        render: (_row: InstrumentData, rowIndex: number) => baseNo + rowIndex + 1,
      };
    }
    if (column.key === "purchasePrice") {
      return {
        key: column.key,
        label: column.label,
        align: "right" as const,
        render: (row: InstrumentData) => formatCurrency(row.purchasePrice as string | number),
      };
    }
    if (column.key === "remainingDays") {
      return {
        key: column.key,
        label: column.label,
        render: (row: InstrumentData) => {
          const overdue = row.remainingDays != null && row.remainingDays < 0;
          const dueSoon = row.remainingDays != null && row.remainingDays <= 30;
          const toneClass = overdue
            ? "text-red-600"
            : dueSoon
              ? "text-orange-500"
              : "text-gray-700";

          return (
            <span className={`font-semibold ${toneClass}`}>
              {row.remainingDays != null ? `${row.remainingDays}일` : "-"}
            </span>
          );
        },
      };
    }
    return { key: column.key, label: column.label };
  });

  return (
    <ListTable
      columns={columns}
      rows={pagedRows}
      isLoading={loading}
      rowKey={(row) => row.instrumentSq}
      onRowClick={onRowClick}
      pagination={pagination}
      emptyText="등록된 계측기 정보가 없습니다."
      minWidth="2000px"
    />
  );
}
