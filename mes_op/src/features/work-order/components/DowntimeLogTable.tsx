import { DowntimeStatusRow } from "@/types/downtime.interface";

interface DowntimeLogTableProps {
  rows: DowntimeStatusRow[];
}

// 표 머리글 정의. 첫 칸만 최소 폭을 따로 잡는다.
const HEADER_COLUMNS: { label: string; minWidth?: boolean }[] = [
  { label: "비가동유형", minWidth: true },
  { label: "시작시간" },
  { label: "종료시간" },
  { label: "비가동시간" },
  { label: "조치내용" },
  { label: "조치책임자" },
];

// 비가동 유형별 현황을 표로 그리고, 표 아래 남는 공간을 흰 영역으로 메운다.
export function DowntimeLogTable({ rows }: DowntimeLogTableProps) {
  return (
    <div
      className="flex-1 border-2 border-gray-900 rounded-lg overflow-hidden flex flex-col"
      data-help="op-downtime-status-main"
    >
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-black text-white">
            {HEADER_COLUMNS.map((col) => (
              <th
                key={col.label}
                className={
                  "border border-gray-700 px-3 py-3 text-center font-medium" +
                  (col.minWidth ? " min-w-[100px]" : "")
                }
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr className="bg-white" key={index}>
              <td className="border border-gray-300 px-3 py-3 text-center font-medium">{row.type}</td>
              <td className="border border-gray-300 px-3 py-3 text-center">{row.startTime}</td>
              <td className="border border-gray-300 px-3 py-3 text-center">{row.endTime}</td>
              <td className="border border-gray-300 px-3 py-3 text-center">{row.downtimeDuration}</td>
              <td className="border border-gray-300 px-3 py-3 text-center">{row.actionContent}</td>
              <td className="border border-gray-300 px-3 py-3 text-center">{row.actionResponsible}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex-1 bg-white border-t border-gray-300"></div>
    </div>
  );
}
