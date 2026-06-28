/** 작업지시 상세 품목 표 (등록/수정은 입력 가능, 상세보기는 읽기 전용). */
import { Input } from "../../../components/ui/input";
import { Checkbox } from "../../../components/ui/checkbox";
import { workOrderSubItemColumns } from "@/app/constants/production";
import type { WorkOrderSubItem } from "@/types/production/workOrder.interface";

interface WorkOrderDetailTableProps {
  subItems: WorkOrderSubItem[];
  isDetailView: boolean;
  onPatchItem: (index: number, patch: Partial<WorkOrderSubItem>) => void;
}

export function WorkOrderDetailTable({ subItems, isDetailView, onPatchItem }: WorkOrderDetailTableProps) {
  return (
    <div className="border border-gray-200 rounded-sm overflow-hidden">
      <div className="overflow-x-auto h-[400px] overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#4A5CC7] border-b border-gray-200">
              {workOrderSubItemColumns.map((col) => (
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
            {subItems.length === 0 ? (
              <tr>
                <td
                  colSpan={workOrderSubItemColumns.length}
                  className="px-4 py-8 text-center text-sm text-gray-600 border-r border-gray-200"
                >
                  {isDetailView ? "등록된 상세 정보가 없습니다." : "추가 버튼을 눌러 품목을 선택하세요."}
                </td>
              </tr>
            ) : (
              subItems.map((item, index) => (
                <tr key={item.no} className="border-b border-gray-200">
                  <td className="px-4 py-3 text-center border-r border-gray-200">
                    {isDetailView ? (
                      <span className="text-sm text-gray-400">-</span>
                    ) : (
                      <Checkbox
                        checked={item.selected}
                        onCheckedChange={(checked) => onPatchItem(index, { selected: !!checked })}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-center whitespace-nowrap border-r border-gray-200">
                    {item.no}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-center whitespace-nowrap border-r border-gray-200">
                    {item.itemCode}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-center whitespace-nowrap border-r border-gray-200">
                    {item.itemName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-center whitespace-nowrap border-r border-gray-200">
                    {item.width}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-center whitespace-nowrap border-r border-gray-200">
                    {item.length}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap border-r border-gray-200">
                    {isDetailView ? (
                      <span className="text-sm text-gray-700">{item.effectiveWidth || "-"}</span>
                    ) : (
                      <Input
                        value={item.effectiveWidth || ""}
                        onChange={(e) => onPatchItem(index, { effectiveWidth: e.target.value })}
                        placeholder="입력"
                        size={Math.max((item.effectiveWidth || "").length + 2, 8)}
                        title={item.effectiveWidth || ""}
                        className={`border text-center w-full ${
                          item.effectiveWidth && parseFloat(item.effectiveWidth) < (parseFloat(item.width) || 0)
                            ? "border-red-500 bg-red-50"
                            : "border-gray-300 bg-white"
                        }`}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap border-r border-gray-200">
                    {isDetailView ? (
                      <span className="text-sm text-gray-700">{item.targetQty || "-"}</span>
                    ) : (
                      <Input
                        value={item.targetQty || ""}
                        onChange={(e) => onPatchItem(index, { targetQty: parseInt(e.target.value, 10) || 0 })}
                        placeholder="입력"
                        size={Math.max(String(item.targetQty || "").length + 2, 8)}
                        title={String(item.targetQty || "")}
                        className="bg-white border border-gray-300 text-center w-full"
                      />
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
