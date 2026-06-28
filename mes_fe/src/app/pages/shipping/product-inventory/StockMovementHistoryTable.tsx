import { ServerPagination } from "../../../components/common/ServerPagination";
import { NUMBER_ALIGN, HEADER_ALIGN } from "@/app/styles/table-styles";
import { cn } from "@/app/components/ui/utils";
import { ProductInventoryData } from "@/types/shipping/inventory.interface";
import {
  HISTORY_GRID_COLUMNS,
  HISTORY_NUMERIC_FIELDS,
  InOutHistoryRow,
} from "./stockHistoryUtils";

interface StockMovementHistoryTableProps {
  focusedItem: ProductInventoryData | null;
  historyRows: InOutHistoryRow[];
  isHistoryFetching: boolean;
  clampedHistoryPage: number;
  historyPageSize: number;
  historyTotalElements: number;
  historyTotalPages: number;
  onHistoryPageChange: (page: number) => void;
  onHistorySizeChange: (size: number) => void;
}

// 빈 상태/로딩/무데이터를 한 칸짜리 안내 행으로 렌더
function HistoryPlaceholderRow({ message }: { message: string }) {
  return (
    <tr>
      <td
        colSpan={HISTORY_GRID_COLUMNS.length}
        className="px-4 py-8 text-center text-gray-500 border-r border-gray-200"
      >
        {message}
      </td>
    </tr>
  );
}

// 선택 품목의 입출고 이력 + 누적재고를 보여주는 하단 테이블 영역
export function StockMovementHistoryTable({
  focusedItem,
  historyRows,
  isHistoryFetching,
  clampedHistoryPage,
  historyPageSize,
  historyTotalElements,
  historyTotalPages,
  onHistoryPageChange,
  onHistorySizeChange,
}: StockMovementHistoryTableProps) {
  // 표시할 본문 행 결정: 미선택 → 로딩 → 무데이터 → 실제 데이터 순으로 가드
  const renderBody = () => {
    if (!focusedItem) {
      return <HistoryPlaceholderRow message="상단 표에서 품목을 선택하세요" />;
    }
    if (isHistoryFetching) {
      return <HistoryPlaceholderRow message="로딩 중..." />;
    }
    if (historyRows.length === 0) {
      return <HistoryPlaceholderRow message="입출고 이력이 없습니다" />;
    }
    return historyRows.map((row) => (
      <tr key={row.no} className="border-b border-gray-200 hover:bg-gray-50">
        {HISTORY_GRID_COLUMNS.map((col) => (
          <td
            key={col.key}
            className={cn(
              "px-4 py-3 text-sm text-gray-900 whitespace-nowrap border-r border-gray-200",
              HISTORY_NUMERIC_FIELDS.has(col.key) ? NUMBER_ALIGN : "text-center",
            )}
          >
            {row[col.key as keyof InOutHistoryRow]}
          </td>
        ))}
      </tr>
    ));
  };

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-3">
        입출고이력
        {focusedItem && (
          <span className="text-base font-normal text-gray-600 ml-2">
            — {focusedItem.itemCode} ({focusedItem.itemName})
          </span>
        )}
      </h2>
      <div className="border border-gray-200 rounded-sm overflow-hidden">
        <div
          className="overflow-x-auto overflow-y-auto"
          style={{ height: "calc((100vh - 280px) / 3)" }}
        >
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#4A5CC7] border-b border-gray-200">
                {HISTORY_GRID_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    style={{ minWidth: col.width }}
                    className={cn(
                      "px-4 py-3 text-center text-xs font-semibold text-white tracking-wider whitespace-nowrap border-r border-white",
                      HEADER_ALIGN,
                    )}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">{renderBody()}</tbody>
          </table>
        </div>
        {focusedItem && (
          <div className="border-t border-gray-200">
            <ServerPagination
              page={clampedHistoryPage}
              size={historyPageSize}
              totalElements={historyTotalElements}
              totalPages={historyTotalPages}
              onPageChange={onHistoryPageChange}
              onSizeChange={onHistorySizeChange}
              loading={isHistoryFetching}
            />
          </div>
        )}
      </div>
    </div>
  );
}
