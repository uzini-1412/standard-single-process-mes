/** [원소재투입현황] 연도·월 필터 + 월별 투입량 매트릭스 + 페이지네이션 표시 탭. */
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES } from "../../../styles/button-styles";
import { TableStateRow } from "../../../components/common/TableStateRow";
import { ServerPagination } from "../../../components/common/ServerPagination";
import { formatNumber } from "@/app/utils/numberFormat";
import { NUMBER_ALIGN, HEADER_ALIGN } from "@/app/styles/table-styles";
import { MATRIX_TEXT_KEYS } from "./consumptionTypes";
import { useConsumptionMatrix } from "./useConsumptionMatrix";

interface Props {
  matrix: ReturnType<typeof useConsumptionMatrix>;
}

export function ConsumptionMatrixTab({ matrix }: Props) {
  const {
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    matrixRows,
    matrixLoading,
    matrixPage,
    setMatrixPage,
    matrixSize,
    setMatrixSize,
    yearChoices,
    matrixColumns,
    reloadMatrix,
    downloadMatrixExcel,
  } = matrix;

  const visibleRows = matrixRows.slice(matrixPage * matrixSize, (matrixPage + 1) * matrixSize);

  return (
    <div>
      <div className="bg-gray-50 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center">
            <div className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 h-9 flex items-center whitespace-nowrap rounded-l-md border border-gray-300">
              연도
            </div>
            <div className="flex items-center bg-white border border-l-0 border-gray-300 rounded-r-md">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="h-9 px-3 bg-transparent border-0 text-xs focus:outline-none focus:ring-0 min-w-[120px]"
              >
                {yearChoices.map((y) => (
                  <option key={y.value} value={y.value}>
                    {y.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center">
            <div className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 h-9 flex items-center whitespace-nowrap rounded-l-md border border-gray-300">
              월
            </div>
            <div className="flex items-center bg-white border border-l-0 border-gray-300 rounded-r-md">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="h-9 px-3 bg-transparent border-0 text-xs focus:outline-none focus:ring-0 min-w-[100px]"
              >
                <option value="">전체</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m.toString()}>
                    {m}월
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button className={BUTTON_STYLES.search} onClick={reloadMatrix}>
            검색
          </Button>
          <Button className={BUTTON_STYLES.primary} onClick={downloadMatrixExcel}>
            엑셀출력
          </Button>
        </div>
      </div>

      <div
        className="border border-gray-200 rounded-sm overflow-hidden"
        style={{ height: "calc(100vh - 280px)" }}
      >
        <div className="overflow-x-auto overflow-y-auto h-full">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#4A5CC7] border-b border-gray-200">
                {matrixColumns.map((col) => (
                  <th
                    key={col.key}
                    style={{ minWidth: col.width }}
                    className={`px-4 py-3 ${HEADER_ALIGN} text-xs font-semibold text-white tracking-wider whitespace-nowrap border-r border-white`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              <TableStateRow
                loading={matrixLoading}
                isEmpty={matrixRows.length === 0}
                colSpan={matrixColumns.length}
              />
              {!matrixLoading &&
                visibleRows.map((item) => (
                  <tr key={item.no} className="border-b border-gray-200 hover:bg-gray-50">
                    {matrixColumns.map((col) => {
                      const isText = MATRIX_TEXT_KEYS.has(col.key);
                      return (
                        <td
                          key={col.key}
                          className={`px-4 py-3 text-sm text-gray-700 whitespace-nowrap ${
                            isText ? "text-center" : NUMBER_ALIGN
                          } ${col.key === "총합계" ? "font-semibold" : ""}`}
                        >
                          {isText ? item[col.key] : formatNumber(item[col.key])}
                        </td>
                      );
                    })}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <ServerPagination
        page={matrixPage}
        size={matrixSize}
        totalElements={matrixRows.length}
        totalPages={Math.max(1, Math.ceil(matrixRows.length / matrixSize))}
        onPageChange={setMatrixPage}
        onSizeChange={(s) => {
          setMatrixSize(s);
          setMatrixPage(0);
        }}
        loading={matrixLoading}
      />
    </div>
  );
}
