import { CandidateRow } from "./inProcessInspection.types";
import { statusLabel } from "./inProcessInspection.helpers";

interface CandidateTableProps {
  rows: CandidateRow[];
  activeIdx: number | null;
  onPick: (idx: number) => void;
}

const headCellCls =
  "bg-slate-800 text-white px-3 py-3 border border-gray-700 font-bold text-center whitespace-nowrap";

// 상단 "자주검사 대상 선택" 그리드
export function CandidateTable({ rows, activeIdx, onPick }: CandidateTableProps) {
  return (
    <div className="border-2 border-gray-900 rounded-lg overflow-hidden">
      <div className="max-h-[200px] overflow-y-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className={headCellCls}>No</th>
              <th className={headCellCls}>라인구분</th>
              <th className={headCellCls}>품번</th>
              <th className={headCellCls}>품명</th>
              <th className={headCellCls}>작업상태</th>
              <th className={headCellCls}>검사상태</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                  진행 중인 작업지시가 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const isActive = activeIdx === idx;
                const statusColor =
                  row.inspectionStatus === '완료' ? 'text-blue-600' :
                  row.inspectionStatus === '초품' ? 'text-amber-600' : '';
                return (
                  <tr
                    key={idx}
                    className={`cursor-pointer border-t border-gray-200 ${
                      isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => onPick(idx)}
                  >
                    <td className="bg-white px-3 py-3 border border-gray-300 text-center">{row.no}</td>
                    <td className="bg-white px-3 py-3 border border-gray-300 text-center">{row.lineName}</td>
                    <td className="bg-white px-3 py-3 border border-gray-300 text-center">{row.itemCode}</td>
                    <td className="bg-white px-3 py-3 border border-gray-300 text-center">{row.itemName}</td>
                    <td className="bg-white px-3 py-3 border border-gray-300 text-center">{statusLabel(row.workStatus)}</td>
                    <td className={`bg-white px-3 py-3 border border-gray-300 text-center font-bold ${statusColor}`}>
                      {row.inspectionStatus}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
