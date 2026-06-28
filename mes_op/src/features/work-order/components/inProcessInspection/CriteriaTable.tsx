import { CriteriaRow } from "./inProcessInspection.types";
import { sampleVerdict } from "./inProcessInspection.helpers";

interface CriteriaTableProps {
  loaded: boolean;
  empty: boolean;
  rows: CriteriaRow[];
  firstEditable: boolean;
  lastEditable: boolean;
  onChangeFirst: (rowIdx: number, sampleIdx: number, value: string) => void;
  onChangeLast: (rowIdx: number, sampleIdx: number, value: string) => void;
}

const headCellCls =
  "bg-slate-800 text-white px-3 py-3 border border-gray-700 font-bold text-center whitespace-nowrap";

// 육안 검사면 OK/NG 셀렉트, 그 외엔 자유 입력
function SampleInput({
  visual,
  value,
  onChange,
}: {
  visual: boolean;
  value: string;
  onChange: (v: string) => void;
}) {
  if (visual) {
    return (
      <select
        className="w-16 text-center border border-gray-300 rounded outline-none px-1 py-0.5 bg-white"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">선택</option>
        <option value="OK">OK</option>
        <option value="NG">NG</option>
      </select>
    );
  }
  return (
    <input
      type="text"
      className="w-16 text-center border border-gray-300 rounded outline-none px-1 py-0.5"
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  );
}

// 검사기준표: 항목별로 시료 수만큼 행을 펼쳐 초품/종품 입력 및 합부판정 표시
export function CriteriaTable({
  loaded,
  empty,
  rows,
  firstEditable,
  lastEditable,
  onChangeFirst,
  onChangeLast,
}: CriteriaTableProps) {
  const renderBody = () => {
    if (!loaded) {
      return (
        <tr>
          <td colSpan={10} className="px-3 py-8 text-center text-gray-500">
            검사기준 활성화 버튼을 눌러주세요.
          </td>
        </tr>
      );
    }
    if (empty) {
      return (
        <tr>
          <td colSpan={10} className="px-3 py-8 text-center text-gray-500">
            등록된 자주검사 내역이 없습니다.
          </td>
        </tr>
      );
    }
    return rows.map((row, rowIdx) => {
      const total = parseInt(row.sampleCnt) || 1;
      const visual = !!row.inspectMethod?.includes('육안');
      return Array.from({ length: total }, (_, sampleIdx) => {
        const verdict = sampleVerdict(row, sampleIdx);
        const verdictColor =
          verdict === '합격' ? 'text-blue-600' :
          verdict === '불합격' ? 'text-red-600' : '';
        return (
          <tr key={`${rowIdx}-${sampleIdx}`} className="hover:bg-gray-50">
            {sampleIdx === 0 && (
              <>
                <td className="bg-white px-3 py-3 border border-gray-300 text-center" rowSpan={total}>{row.no}</td>
                <td className="bg-white px-3 py-3 border border-gray-300 text-center" rowSpan={total}>{row.inspectItemName}</td>
                <td className="bg-white px-3 py-3 border border-gray-300 text-center" rowSpan={total}>{row.inspectCriteria}</td>
                <td className="bg-white px-3 py-3 border border-gray-300 text-center" rowSpan={total}>{row.inspectMethod}</td>
                <td className="bg-white px-3 py-3 border border-gray-300 text-center" rowSpan={total}>{row.maxVal}</td>
                <td className="bg-white px-3 py-3 border border-gray-300 text-center" rowSpan={total}>{row.minVal}</td>
              </>
            )}
            <td className="bg-white px-3 py-3 border border-gray-300 text-center">{row.sampleCnt}</td>
            <td className="bg-white px-3 py-2 border border-gray-300 text-center">
              {firstEditable ? (
                <SampleInput
                  visual={visual}
                  value={row.firstProducts[sampleIdx] || ''}
                  onChange={v => onChangeFirst(rowIdx, sampleIdx, v)}
                />
              ) : (
                <span>{row.firstProducts[sampleIdx] || ''}</span>
              )}
            </td>
            <td className="bg-white px-3 py-2 border border-gray-300 text-center">
              {lastEditable ? (
                <SampleInput
                  visual={visual}
                  value={row.lastProducts[sampleIdx] || ''}
                  onChange={v => onChangeLast(rowIdx, sampleIdx, v)}
                />
              ) : (
                <span>{row.lastProducts[sampleIdx] || ''}</span>
              )}
            </td>
            <td className={`bg-white px-3 py-3 border border-gray-300 text-center font-bold ${verdictColor}`}>
              {verdict}
            </td>
          </tr>
        );
      });
    });
  };

  return (
    <div className="border-2 border-gray-900 rounded-lg overflow-hidden">
      <div className="max-h-[280px] overflow-y-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className={headCellCls}>No</th>
              <th className={headCellCls}>검사항목</th>
              <th className={headCellCls}>검사기준</th>
              <th className={headCellCls}>검사방법</th>
              <th className={headCellCls}>상한</th>
              <th className={headCellCls}>하한</th>
              <th className={headCellCls}>시료수</th>
              <th className={headCellCls}>초품</th>
              <th className={headCellCls}>종품</th>
              <th className={headCellCls}>합부판정</th>
            </tr>
          </thead>
          <tbody>{renderBody()}</tbody>
        </table>
      </div>
    </div>
  );
}
