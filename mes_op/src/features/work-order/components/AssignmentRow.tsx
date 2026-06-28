import { Checkbox } from "../../../components/common/Checkbox";

import { WorkAssignmentRow } from "@/types/workOrder.interface";
import { ASSIGNMENT_COLUMNS, isAssignmentDone } from "./workAssignmentColumns";

interface AssignmentRowProps {
  row: WorkAssignmentRow;
  rowIndex: number;
  onPick: (rowIndex: number) => void;
}

// 작업 배정 표의 데이터 한 줄.
// 완료 건은 흐리게/클릭 불가, 그 외엔 호버·포인터 표시.
export function AssignmentRow({ row, rowIndex, onPick }: AssignmentRowProps) {
  const done = isAssignmentDone(row);
  const rowTone = done
    ? "bg-gray-100 text-gray-400"
    : "bg-white hover:bg-gray-50 cursor-pointer";

  return (
    <tr className={rowTone} onClick={() => onPick(rowIndex)}>
      <td className="border border-gray-300 px-3 py-2 text-center">
        <div className="flex items-center justify-center">
          <Checkbox
            disabled={done}
            checked={row.selected}
            onCheckedChange={() => onPick(rowIndex)}
          />
        </div>
      </td>
      {ASSIGNMENT_COLUMNS.map((column) => (
        <td key={column.key} className="border border-gray-300 px-3 py-2 text-center">
          {column.cell(row)}
        </td>
      ))}
    </tr>
  );
}
