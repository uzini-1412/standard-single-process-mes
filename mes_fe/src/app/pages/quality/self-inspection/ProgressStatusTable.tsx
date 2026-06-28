import { TableSection } from "../../../components/common/TableSection";
import { TableStateRow } from "../../../components/common/TableStateRow";
import { ServerPagination } from "../../../components/common/ServerPagination";
import { SelfInspectionHeader } from "@/types/quality/inspection.interface";
import { selfInspectionHeaderColumns } from "@/app/constants/qualityInspection";

interface ProgressStatusTableProps {
  rows: SelfInspectionHeader[];
  loading: boolean;
  activeWorkOrderSq: number | null;
  onRowToggle: (workOrderSq: number) => void;
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
}

// 합부 컬럼은 합격=파랑/불합격=빨강으로 강조, 그 외는 기본 색
function passFailToneClass(columnKey: string, passFail: string): string {
  if (columnKey !== "passFail") return "text-gray-900";
  if (passFail === "합격") return "text-blue-600 font-bold";
  if (passFail === "불합격") return "text-red-600 font-bold";
  return "text-gray-900";
}

// 상단 진척현황(헤더) 테이블. 행 클릭 또는 체크박스로 단일 선택
export function ProgressStatusTable({
  rows,
  loading,
  activeWorkOrderSq,
  onRowToggle,
  page,
  size,
  totalElements,
  totalPages,
  onPageChange,
  onSizeChange,
}: ProgressStatusTableProps) {
  return (
    <div data-help="self-inspection-table">
      <TableSection title="공정검사진척현황" height="half">
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#4A5CC7] border-b border-gray-200">
              {selfInspectionHeaderColumns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-center text-xs font-semibold text-white tracking-wider whitespace-nowrap border-r border-white"
                  style={{ minWidth: col.width }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            <TableStateRow
              loading={loading}
              isEmpty={rows.length === 0}
              colSpan={selfInspectionHeaderColumns.length}
            />
            {!loading &&
              rows.map((item) => {
                const isActive = activeWorkOrderSq === item.workOrderSq;
                return (
                  <tr
                    key={item.workOrderSq}
                    onClick={() => {
                      if (item.workOrderSq) onRowToggle(item.workOrderSq);
                    }}
                    className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${isActive ? "bg-blue-50" : ""}`}
                  >
                    {selfInspectionHeaderColumns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 text-sm text-center whitespace-nowrap border-r border-gray-200 ${passFailToneClass(col.key, item.passFail)}`}
                      >
                        {col.key === "selected" ? (
                          <input
                            type="checkbox"
                            className="w-4 h-4"
                            checked={isActive}
                            onChange={(e) => {
                              e.stopPropagation();
                              if (item.workOrderSq) onRowToggle(item.workOrderSq);
                            }}
                          />
                        ) : (
                          item[col.key as keyof SelfInspectionHeader]
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
        <ServerPagination
          page={page}
          size={size}
          totalElements={totalElements}
          totalPages={totalPages}
          onPageChange={onPageChange}
          onSizeChange={onSizeChange}
          loading={loading}
        />
      </TableSection>
    </div>
  );
}
