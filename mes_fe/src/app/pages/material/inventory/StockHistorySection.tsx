/** 재고이력 영역: 선택 품목의 입출고 이력 표 + 서버 페이지네이션. 수량 컬럼만 콤마/우측정렬. */
import { ServerPagination } from "../../../components/common/ServerPagination";
import { MaterialInventoryData, InventoryHistoryData } from "@/types/material/inventory.interface";
import { INVENTORY_HISTORY_COLUMNS } from "@/app/constants/purchase";
import { formatNumber } from "@/app/utils/numberFormat";
import { NUMBER_ALIGN, HEADER_ALIGN } from "@/app/styles/table-styles";

// 콤마 + 우측정렬이 필요한 수량 컬럼
const QTY_COLUMN_KEYS = new Set<string>(["changeQty", "currQty"]);

interface StockHistorySectionProps {
  selectedItem: MaterialInventoryData | null;
  historyRows: InventoryHistoryData[];
  isHistoryLoading: boolean;
  historySafePage: number;
  historySize: number;
  historyTotal: number;
  historyTotalPages: number;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
}

/** 본문 상태(미선택/로딩/빈/데이터)에 따른 행 렌더링 */
function HistoryBody({
  selectedItem,
  historyRows,
  isHistoryLoading,
}: Pick<StockHistorySectionProps, "selectedItem" | "historyRows" | "isHistoryLoading">) {
  const placeholder = (text: string) => (
    <tr>
      <td
        colSpan={INVENTORY_HISTORY_COLUMNS.length}
        className="px-4 py-8 text-center text-gray-500 border-r border-gray-200"
      >
        {text}
      </td>
    </tr>
  );

  if (!selectedItem) return placeholder("상단 표에서 품목을 선택하세요");
  if (isHistoryLoading) return placeholder("로딩 중...");
  if (historyRows.length === 0) return placeholder("재고이력이 없습니다");

  return (
    <>
      {historyRows.map((entry) => (
        <tr key={entry.no} className="border-b border-gray-200 hover:bg-gray-50">
          {INVENTORY_HISTORY_COLUMNS.map((col) => {
            const isQty = QTY_COLUMN_KEYS.has(col.key);
            const value = entry[col.key as keyof InventoryHistoryData];
            return (
              <td
                key={col.key}
                className={`px-4 py-3 text-sm text-gray-700 whitespace-nowrap border-r border-gray-200 ${isQty ? NUMBER_ALIGN : "text-center"}`}
              >
                {isQty ? formatNumber(value as number | string) : value}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

export function StockHistorySection({
  selectedItem,
  historyRows,
  isHistoryLoading,
  historySafePage,
  historySize,
  historyTotal,
  historyTotalPages,
  onPageChange,
  onSizeChange,
}: StockHistorySectionProps) {
  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-3">
        재고이력
        {selectedItem && (
          <span className="text-base font-normal text-gray-600 ml-2">
            - {selectedItem.itemCode} ({selectedItem.itemName})
          </span>
        )}
      </h2>
      <div className="border border-gray-200 rounded-sm overflow-hidden">
        <div className="overflow-auto" style={{ height: "300px" }}>
          <table className="w-full">
            <thead className="sticky top-0">
              <tr className="bg-[#4A5CC7] border-b border-gray-200">
                {INVENTORY_HISTORY_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    style={{ minWidth: col.width }}
                    className={`px-4 py-3 ${HEADER_ALIGN} text-xs font-semibold text-white tracking-wider whitespace-nowrap border-r border-white`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              <HistoryBody
                selectedItem={selectedItem}
                historyRows={historyRows}
                isHistoryLoading={isHistoryLoading}
              />
            </tbody>
          </table>
        </div>
        {selectedItem && (
          <div className="border-t border-gray-200">
            <ServerPagination
              page={historySafePage}
              size={historySize}
              totalElements={historyTotal}
              totalPages={historyTotalPages}
              onPageChange={onPageChange}
              onSizeChange={onSizeChange}
              loading={isHistoryLoading}
            />
          </div>
        )}
      </div>
    </div>
  );
}
