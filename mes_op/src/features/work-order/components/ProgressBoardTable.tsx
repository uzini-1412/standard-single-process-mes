import type { WorkProgressRow } from "@/types/workProgress.interface";

interface ProgressBoardTableProps {
  rows: WorkProgressRow[];
  loading: boolean;
}

// 헤더 라벨 순서대로 정의 (렌더 컬럼 순서와 1:1)
const COLUMN_TITLES = [
  "No.",
  "제품구분",
  "라인구분",
  "생산번호",
  "품번",
  "품명",
  "규격",
  "생산 Lot-No",
  "지시량",
  "작업상태",
  "비고",
];

const headCellClass = "border border-gray-700 px-3 py-3 text-center font-medium text-sm";
const bodyCellClass = "border border-gray-300 px-3 py-3 text-center text-sm";

function BoardRow({ row }: { row: WorkProgressRow }) {
  // 셀 표시 순서: 화면 컬럼 정의와 동일하게 배열로 묶어 렌더
  const cells = [
    row.no,
    row.productType,
    row.lineType,
    row.productionNumber,
    row.partNumber,
    row.partName,
    row.spec,
    row.productionLotNo,
    row.orderQty,
    row.workStatus,
    row.remarks,
  ];
  return (
    <tr className="bg-white hover:bg-gray-50">
      {cells.map((value, ci) => (
        <td key={ci} className={bodyCellClass}>
          {value}
        </td>
      ))}
    </tr>
  );
}

export function ProgressBoardTable({ rows, loading }: ProgressBoardTableProps) {
  // 로딩 / 빈 결과는 한 칸으로 합쳐 안내 문구를 보여줌
  const renderBody = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan={11} className="text-center py-8 text-gray-500">
            로딩 중...
          </td>
        </tr>
      );
    }
    if (rows.length === 0) {
      return (
        <tr>
          <td colSpan={11} className="text-center py-8 text-gray-500">
            데이터가 없습니다.
          </td>
        </tr>
      );
    }
    return rows.map((row, ri) => <BoardRow key={ri} row={row} />);
  };

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-gray-900 text-white">
          {COLUMN_TITLES.map((title) => (
            <th className={headCellClass} key={title}>
              {title}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{renderBody()}</tbody>
    </table>
  );
}
