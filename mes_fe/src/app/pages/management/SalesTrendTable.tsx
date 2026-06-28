import { ServerPagination } from "../../components/common/ServerPagination";
import type { SalesStatusTrendRes } from "@/types/management/sales.interface";

interface SalesTrendTableProps {
  pagedRows: SalesStatusTrendRes[];
  total: number;
  totalCount: number;
  totalPages: number;
  page: number;
  size: number;
  loading: boolean;
  onPageChange: (p: number) => void;
  onSizeChange: (s: number) => void;
}

// 차트 보조용 월별 합계 표 (페이징 포함)
export function SalesTrendTable({
  pagedRows,
  total,
  totalCount,
  totalPages,
  page,
  size,
  loading,
  onPageChange,
  onSizeChange,
}: SalesTrendTableProps) {
  return (
    <div className="border border-gray-200 rounded-sm overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-[#4A5CC7]">
            <th className="px-3 py-2 text-center text-xs font-semibold text-white border-r border-white">
              연월
            </th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-white border-r border-white">
              매출액
            </th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {pagedRows.map((t) => (
            <tr key={t.yearMonth} className="border-b border-gray-200 hover:bg-gray-50">
              <td className="px-3 py-1.5 text-xs text-gray-900 text-center border-r border-gray-200">
                {t.yearMonth}
              </td>
              <td className="px-3 py-1.5 text-xs text-gray-900 text-right border-r border-gray-200">
                ₩ {Math.round(t.amount || 0).toLocaleString()}
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
              ₩ {Math.round(total).toLocaleString()}
            </td>
          </tr>
        </tfoot>
      </table>
      <div className="border-t border-gray-200">
        <ServerPagination
          page={page}
          size={size}
          totalElements={totalCount}
          totalPages={totalPages}
          onPageChange={onPageChange}
          onSizeChange={onSizeChange}
          sizeOptions={[6, 12, 24, 36]}
          loading={loading}
        />
      </div>
    </div>
  );
}
