/** [생산관리 > 생산계획] 생산구분 전치(가로 날짜축) 표 + 시작/종료 시간 인라인 편집 셀. */
import { formatNumber } from "@/app/utils/numberFormat";
import { NUMBER_ALIGN } from "@/app/styles/table-styles";
import { cn } from "@/app/components/ui/utils";
import { scheduleRowHeaders } from "@/app/constants/production";
import { describeDateHeader, readScheduleCell, QUANTITY_ROW_KEYS } from "./planBoardHelpers";

type ScheduleColumn = {
  date: string;
  planIndex: number;
  plan?: any;
  isFirst: boolean;
  total: number;
};

interface PlanScheduleGridProps {
  columns: ScheduleColumn[];
  openDates: Set<string>;
  editTarget: { planSq: number; field: "startTime" | "endTime" } | null;
  editValue: string;
  savingTime: boolean;
  onToggleDate: (date: string) => void;
  onBeginEdit: (plan: any, field: "startTime" | "endTime") => void;
  onChangeEdit: (value: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
}

export function PlanScheduleGrid({
  columns,
  openDates,
  editTarget,
  editValue,
  savingTime,
  onToggleDate,
  onBeginEdit,
  onChangeEdit,
  onCommitEdit,
  onCancelEdit,
}: PlanScheduleGridProps) {
  const empty = columns.length === 0;

  return (
    <div className="border border-gray-200 rounded-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-auto min-w-full border-collapse">
          <thead>
            <tr className="bg-[#4A5CC7] border-b border-gray-200">
              <th className="sticky left-0 z-10 bg-[#4A5CC7] px-4 py-3 text-center text-xs font-semibold text-white tracking-wider whitespace-nowrap border-r border-white min-w-[140px]">
                구분
              </th>
              {empty ? (
                <th className="px-4 py-3 text-center text-xs font-semibold text-white tracking-wider whitespace-nowrap border-r border-white min-w-[180px]">
                  -
                </th>
              ) : (
                columns.map((col) => (
                  <th
                    key={`${col.date}-${col.planIndex}`}
                    className="px-4 py-3 text-center text-xs font-semibold text-white tracking-wider whitespace-nowrap border-r border-white min-w-[180px]"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>{describeDateHeader(col.date)}</span>
                      {col.isFirst && col.total > 1 && (
                        <button
                          type="button"
                          title={openDates.has(col.date) ? "접기" : `${col.total}건 펼치기`}
                          onClick={() => onToggleDate(col.date)}
                          className="ml-1 px-1.5 py-0.5 rounded bg-white/20 hover:bg-white/30 text-[11px] leading-none"
                        >
                          {openDates.has(col.date) ? "◀" : `▶${col.total}`}
                        </button>
                      )}
                      {!col.isFirst && (
                        <span className="ml-1 px-1.5 py-0.5 rounded bg-white/20 text-[11px] leading-none">
                          #{col.planIndex + 1}
                        </span>
                      )}
                    </div>
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody className="bg-white">
            {scheduleRowHeaders.map((rowHeader, rowIndex) => {
              const isQtyRow = QUANTITY_ROW_KEYS.has(rowHeader.key);
              const isTimeRow = rowHeader.key === "startTime" || rowHeader.key === "endTime";

              return (
                <tr key={rowIndex} className="border-b border-gray-200">
                  <td className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-sm text-gray-700 text-left font-semibold whitespace-nowrap border-r border-gray-200 min-w-[140px]">
                    {rowHeader.label}
                  </td>
                  {empty ? (
                    <td className="px-4 py-3 text-sm text-gray-700 text-center whitespace-nowrap border-r border-gray-200" />
                  ) : (
                    columns.map((col) => {
                      const editable = isTimeRow && col.plan && col.plan.planSq != null;
                      const editing =
                        editable &&
                        editTarget?.planSq === col.plan.planSq &&
                        editTarget?.field === (rowHeader.key as "startTime" | "endTime");

                      const raw = readScheduleCell(col.plan, rowHeader.key);
                      const shown = isQtyRow ? formatNumber(raw) : raw;

                      return (
                        <td
                          key={`${col.date}-${col.planIndex}`}
                          title={editable && !editing ? "클릭하여 시간 입력" : undefined}
                          onClick={
                            editable && !editing
                              ? () => onBeginEdit(col.plan, rowHeader.key as "startTime" | "endTime")
                              : undefined
                          }
                          className={cn(
                            "px-4 py-3 text-sm text-gray-700 text-center whitespace-nowrap border-r border-gray-200",
                            editable && !editing ? "cursor-pointer hover:bg-gray-50" : "",
                            isQtyRow && NUMBER_ALIGN,
                          )}
                        >
                          {editing ? (
                            <input
                              type="time"
                              autoFocus
                              disabled={savingTime}
                              value={editValue}
                              onChange={(e) => onChangeEdit(e.target.value)}
                              onBlur={onCommitEdit}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  (e.target as HTMLInputElement).blur();
                                } else if (e.key === "Escape") {
                                  e.preventDefault();
                                  onCancelEdit();
                                }
                              }}
                              className="w-[110px] px-2 py-1 border border-[#5B6FD8] rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-[#5B6FD8]"
                            />
                          ) : (
                            shown || (editable ? <span className="text-gray-300">--:--</span> : "")
                          )}
                        </td>
                      );
                    })
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
