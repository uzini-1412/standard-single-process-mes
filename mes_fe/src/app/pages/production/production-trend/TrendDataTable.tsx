/** 생산추이도 하단 라인×월 수치 표(종합 행 포함). */
import { HEADER_ALIGN } from "@/app/styles/table-styles";
import {
  formatTrendCell,
  MONTH_TITLES,
  TOTAL_SERIES_KEY,
  TOTAL_SERIES_LABEL,
} from "./trendChartHelpers";

interface TrendDataTableProps {
  isLoading: boolean;
  activeLines: string[];
  matrix: Record<string, number[]>;
  lineTotals: Record<string, number>;
  monthlyTotals: number[];
}

export function TrendDataTable({
  isLoading,
  activeLines,
  matrix,
  lineTotals,
  monthlyTotals,
}: TrendDataTableProps) {
  // 헤더(구분) + 12개월 + 합계 = 전체 컬럼 수.
  const spanAll = MONTH_TITLES.length + 2;

  const renderBody = () => {
    if (isLoading) {
      return (
        <tr>
          <td colSpan={spanAll} className="px-4 py-8 text-center text-gray-500 text-xs">
            불러오는 중...
          </td>
        </tr>
      );
    }

    if (activeLines.length === 0) {
      return (
        <tr>
          <td colSpan={spanAll} className="px-4 py-8 text-center text-gray-500 text-xs">
            데이터가 없습니다
          </td>
        </tr>
      );
    }

    return (
      <>
        {activeLines.map((line) => (
          <tr key={line} className="border-b border-gray-200 hover:bg-gray-50">
            <td className="border border-gray-300 px-3 py-2 text-center text-xs font-semibold">
              {line}
            </td>
            {MONTH_TITLES.map((_, monthIdx) => (
              <td key={monthIdx} className="border border-gray-300 px-3 py-2 text-right text-xs">
                {formatTrendCell(matrix[line]?.[monthIdx] ?? 0)}
              </td>
            ))}
            <td className="border border-gray-300 px-3 py-2 text-right text-xs font-semibold">
              {formatTrendCell(lineTotals[line] ?? 0)}
            </td>
          </tr>
        ))}
        <tr className="bg-gray-100 font-semibold">
          <td className="border border-gray-300 px-3 py-2 text-center text-xs">
            {TOTAL_SERIES_LABEL}
          </td>
          {MONTH_TITLES.map((_, monthIdx) => (
            <td key={monthIdx} className="border border-gray-300 px-3 py-2 text-right text-xs">
              {formatTrendCell(monthlyTotals[monthIdx] ?? 0)}
            </td>
          ))}
          <td className="border border-gray-300 px-3 py-2 text-right text-xs">
            {formatTrendCell(lineTotals[TOTAL_SERIES_KEY] ?? 0)}
          </td>
        </tr>
      </>
    );
  };

  return (
    <div className="border-2 border-gray-900 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#4A5CC7] text-white">
              <th className="border border-white px-3 py-2 text-center text-xs font-semibold whitespace-nowrap">
                구분
              </th>
              {MONTH_TITLES.map((label) => (
                <th
                  key={label}
                  className={`border border-white px-3 py-2 text-xs font-semibold whitespace-nowrap ${HEADER_ALIGN}`}
                >
                  {label}
                </th>
              ))}
              <th className={`border border-white px-3 py-2 text-xs font-semibold whitespace-nowrap ${HEADER_ALIGN}`}>
                합계
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">{renderBody()}</tbody>
        </table>
      </div>
    </div>
  );
}
