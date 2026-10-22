/** 작업지시 등록 시 대상 생산계획을 고르는 표 (클라이언트 페이징). */
import { ServerPagination } from "../../../components/common/ServerPagination";
import { productionPlanColumns } from "@/app/constants/production";

interface ProductionPlanPickerProps {
  rows: any[];
  isLoading: boolean;
  page: number;
  size: number;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
  onRowClick: (plan: any) => void;
}

export function ProductionPlanPicker({
  rows,
  isLoading,
  page,
  size,
  onPageChange,
  onSizeChange,
  onRowClick,
}: ProductionPlanPickerProps) {
  const totalCount = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / size));
  const safePage = Math.min(page, totalPages - 1);
  const baseNo = safePage * size;
  const pageRows = rows.slice(baseNo, baseNo + size);

  return (
    <div className="bg-white rounded-lg p-3">
      <div className="mb-4">
        <div className="py-2 font-semibold text-gray-900">생산계획 대상 선택</div>
      </div>

      <div className="border border-gray-200 rounded-sm overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto" style={{ height: "300px" }}>
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#4A5CC7] border-b border-gray-200">
                {productionPlanColumns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-center text-xs font-semibold text-white tracking-wider whitespace-nowrap border-r border-white"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={productionPlanColumns.length}
                    className="px-4 py-8 text-center text-sm text-gray-500 border-r border-gray-200"
                  >
                    로딩 중...
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={productionPlanColumns.length}
                    className="px-4 py-8 text-center text-sm text-gray-600 border-r border-gray-200"
                  >
                    생산계획 데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                pageRows.map((plan, localIdx) => {
                  const index = baseNo + localIdx;
                  return (
                    <tr
                      key={plan.id || index}
                      className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                      onClick={() => onRowClick(plan)}
                    >
                      {productionPlanColumns.map((col) => (
                        <td
                          key={col.key}
                          className="px-4 py-3 text-sm text-gray-700 text-center whitespace-nowrap border-r border-gray-200"
                        >
                          {plan[col.key]}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-gray-200">
          <ServerPagination
            page={safePage}
            size={size}
            totalElements={totalCount}
            totalPages={totalPages}
            onPageChange={onPageChange}
            onSizeChange={(s) => {
              onSizeChange(s);
              onPageChange(0);
            }}
            loading={false}
          />
        </div>
      </div>
    </div>
  );
}
