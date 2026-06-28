import { ListTable, type ListColumn } from "@/app/components/common/ListTable";
import { useClientPagedList } from "@/app/hooks/useClientPagedList";
import { INSTRUMENT_HISTORY_COLUMNS } from "@/app/constants/measuring";
import { formatCurrency } from "@/app/utils/numberFormat";
import type { InstrumentHistoryData } from "@/types/measuring-instrument/history.interface";

interface CalibrationLogResultGridProps {
  rows: InstrumentHistoryData[];
  loading: boolean;
  onRowClick: (row: InstrumentHistoryData) => void;
}

export function CalibrationLogResultGrid({
  rows,
  loading,
  onRowClick,
}: CalibrationLogResultGridProps) {
  const { pagedRows, baseNo, pagination } = useClientPagedList(rows);

  // 공통 컬럼 정의를 토대로 순번/금액/첨부 컬럼만 별도 렌더러로 감싼다.
  const columns: ListColumn<InstrumentHistoryData>[] =
    INSTRUMENT_HISTORY_COLUMNS.map((column) => {
      if (column.key === "No") {
        return {
          key: column.key,
          label: column.label,
          render: (_row: InstrumentHistoryData, i: number) => baseNo + i + 1,
        };
      }
      if (column.key === "actionCost") {
        return {
          key: column.key,
          label: column.label,
          align: "right" as const,
          render: (row: InstrumentHistoryData) => formatCurrency(row.actionCost),
        };
      }
      if (column.key === "reportFilePath") {
        return {
          key: column.key,
          label: column.label,
          render: (row: InstrumentHistoryData) =>
            row.reportFilePath ? "첨부됨" : "-",
        };
      }
      return { key: column.key, label: column.label };
    });

  return (
    <ListTable
      columns={columns}
      rows={pagedRows}
      isLoading={loading}
      rowKey={(row, i) => `${row.historySq}-${baseNo + i}`}
      onRowClick={onRowClick}
      pagination={pagination}
      emptyText="등록된 계측기 이력이 없습니다."
      minWidth="1800px"
    />
  );
}
