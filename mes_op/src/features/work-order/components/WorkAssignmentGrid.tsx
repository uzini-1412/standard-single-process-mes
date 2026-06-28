import { WorkAssignmentRow } from "@/types/workOrder.interface";

import { AssignmentRow } from "./AssignmentRow";
import {
  ASSIGNMENT_COLUMNS,
  isAssignmentDone,
  TOTAL_COLUMN_COUNT,
} from "./workAssignmentColumns";

interface WorkAssignmentGridProps {
  data: WorkAssignmentRow[];
  onSelectionChange?: (index: number, selected: boolean) => void;
}

export function WorkAssignmentGrid({ data, onSelectionChange }: WorkAssignmentGridProps) {
  // 행 클릭/체크 시 동작: 라디오처럼 하나만 켜지게 만든다.
  const togglePick = (pickedIndex: number) => {
    if (!onSelectionChange) return;

    const target = data[pickedIndex];
    // 이미 완료된 작업은 고를 수 없다.
    if (isAssignmentDone(target)) return;

    // 고른 행만 토글하고, 켜져 있던 나머지 행은 전부 끈다.
    data.forEach((current, i) => {
      if (i === pickedIndex) {
        onSelectionChange(i, !target.selected);
        return;
      }
      if (current.selected) {
        onSelectionChange(i, false);
      }
    });
  };

  const hasRows = data.length > 0;

  return (
    <div
      className="w-full border border-gray-300 rounded-lg overflow-auto bg-white"
      style={{ height: "360px" }}
    >
      <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "60px" }} />
          {ASSIGNMENT_COLUMNS.map((column) => (
            <col key={column.key} style={{ width: column.width }} />
          ))}
        </colgroup>

        <thead className="sticky top-0 z-10">
          <tr className="bg-blue-700 text-white">
            <th className="border border-blue-600 px-3 py-2.5 text-center">선택</th>
            {ASSIGNMENT_COLUMNS.map((column) => (
              <th key={column.key} className="border border-blue-600 px-3 py-2.5 text-center">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {!hasRows ? (
            <tr>
              <td colSpan={TOTAL_COLUMN_COUNT} className="px-4 py-8 text-center text-gray-400">
                데이터가 없습니다
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <AssignmentRow
                key={row._originalId ?? `row-${index}`}
                row={row}
                rowIndex={index}
                onPick={togglePick}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
