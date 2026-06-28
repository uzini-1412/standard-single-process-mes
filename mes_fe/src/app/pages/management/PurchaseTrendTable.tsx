import { ServerPagination } from "../../components/common/ServerPagination";
import type { PurchaseStatusTrendRes } from "@/types/management/purchase.interface";

interface TableProps {
  pagedSeries: PurchaseStatusTrendRes[];
  totalAmount: number;
  totalElements: number;
  totalPages: number;
  pageIndex: number;
  pageSize: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
}

// 차트를 보조하는 월별 매입액 표 + 페이지네이션
export function PurchaseTrendTable({
  pagedSeries,
  totalAmount,
  totalElements,
  totalPages,
  pageIndex,
  pageSize,
  isLoading,
  onPageChange,
  onSizeChange,
}: TableProps) {
  return (
    <div className="border border-gray-200 rounded-sm overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-[#4A5CC7]">
            <th className="px-3 py-2 text-center text-xs font-semibold text-white border-r border-white">
              연월
            </th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-white border-r border-white">
              매입액
            </th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {pagedSeries.map((row) => (
            <tr key={row.yearMonth} className="border-b border-gray-200 hover:bg-gray-50">
              <td className="px-3 py-1.5 text-xs text-gray-900 text-center border-r border-gray-200">
                {row.yearMonth}
              </td>
              <td className="px-3 py-1.5 text-xs text-gray-900 text-right border-r border-gray-200">
                ₩ {Math.round(row.amount || 0).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 border-t-2 border-gray-300">
            <td className="px-3 py-1.5 text-xs font-semibold text-gray-900 text-center border-r border-gray-200">
              기간 합계
            </td>
            <td className="px-3 py-1.5 text-xs font-semibold text-gray-900 text-right border-r border-gray-200">
              ₩ {Math.round(totalAmount).toLocaleString()}
            </td>
          </tr>
        </tfoot>
      </table>
      <div className="border-t border-gray-200">
        <ServerPagination
          page={pageIndex}
          size={pageSize}
          totalElements={totalElements}
          totalPages={totalPages}
          onPageChange={onPageChange}
          onSizeChange={onSizeChange}
          sizeOptions={[6, 12, 24, 36]}
          loading={isLoading}
        />
      </div>
    </div>
  );
}
