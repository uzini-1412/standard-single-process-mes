/** [원소재투입분석] 라인·측정일 조회바 + 호기별 PLC raw 그리드(2단 헤더) 탭. */
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES } from "../../../styles/button-styles";
import { TableStateRow } from "../../../components/common/TableStateRow";
import { ServerPagination } from "../../../components/common/ServerPagination";
import { formatNumber } from "@/app/utils/numberFormat";
import { NUMBER_ALIGN, HEADER_ALIGN } from "@/app/styles/table-styles";
import { useConsumptionAnalysis } from "./useConsumptionAnalysis";
import { LineOption } from "./useLineMachineOptions";

interface Props {
  analysis: ReturnType<typeof useConsumptionAnalysis>;
  lineList: LineOption[];
}

export function ConsumptionAnalysisTab({ analysis, lineList }: Props) {
  const {
    lineCode,
    setLineCode,
    measureDate,
    setMeasureDate,
    analysisLoading,
    analysisPage,
    setAnalysisPage,
    analysisSize,
    setAnalysisSize,
    feederKeys,
    analysisRows,
    analysisColumns,
    reloadAnalysis,
  } = analysis;

  const visibleRows = analysisRows.slice(
    analysisPage * analysisSize,
    (analysisPage + 1) * analysisSize,
  );

  return (
    <div>
      <div data-help="raw-material-usage-search" className="bg-gray-50 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* 라인 선택 */}
          <div className="flex items-center">
            <div className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 h-9 flex items-center whitespace-nowrap rounded-l-md border border-gray-300">
              라인
            </div>
            <div className="flex items-center bg-white border border-l-0 border-gray-300 rounded-r-md">
              <select
                value={lineCode}
                onChange={(e) => setLineCode(e.target.value)}
                className="h-9 px-3 bg-transparent border-0 text-xs focus:outline-none focus:ring-0 min-w-[120px]"
              >
                {lineList.length === 0 && <option value="">(라인 없음)</option>}
                {lineList.map((opt) => (
                  <option key={opt.id} value={opt.name}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 측정일 (단일) */}
          <div className="flex items-center">
            <div className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 h-9 flex items-center whitespace-nowrap rounded-l-md border border-gray-300">
              측정일
            </div>
            <div className="flex items-center bg-white border border-l-0 border-gray-300 rounded-r-md">
              <input
                type="date"
                value={measureDate}
                onChange={(e) => setMeasureDate(e.target.value)}
                className="h-9 px-3 bg-transparent border-0 text-xs focus:outline-none focus:ring-0"
              />
            </div>
          </div>

          <Button className={BUTTON_STYLES.search} onClick={reloadAnalysis}>
            검색
          </Button>
        </div>
      </div>

      <div
        data-help="raw-material-usage-table"
        className="border border-gray-200 rounded-sm overflow-hidden"
        style={{ height: "calc(100vh - 280px)" }}
      >
        <div className="overflow-x-auto overflow-y-auto h-full">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              {/* 상단: No.·측정시간 rowspan 2 / 라인명 colspan = 호기 수 */}
              <tr className="bg-[#4A5CC7] border-b border-white">
                <th
                  rowSpan={2}
                  style={{ minWidth: "60px" }}
                  className="px-4 py-3 text-center text-xs font-semibold text-white tracking-wider whitespace-nowrap border-r border-white"
                >
                  No.
                </th>
                <th
                  rowSpan={2}
                  style={{ minWidth: "180px" }}
                  className="px-4 py-3 text-center text-xs font-semibold text-white tracking-wider whitespace-nowrap border-r border-white"
                >
                  측정시간
                </th>
                <th
                  colSpan={Math.max(1, feederKeys.length)}
                  className="px-4 py-2 text-center text-xs font-semibold text-white tracking-wider whitespace-nowrap border-b border-white"
                >
                  {lineCode || "라인"}
                </th>
              </tr>
              {/* 하단: 호기 컬럼 */}
              <tr className="bg-[#4A5CC7] border-b border-gray-200">
                {feederKeys.length === 0 ? (
                  <th className="px-4 py-3 text-center text-xs font-semibold text-white tracking-wider whitespace-nowrap border-r border-white">
                    -
                  </th>
                ) : (
                  feederKeys.map((f) => (
                    <th
                      key={f}
                      style={{ minWidth: "100px" }}
                      className={`px-4 py-3 ${HEADER_ALIGN} text-xs font-semibold text-white tracking-wider whitespace-nowrap border-r border-white`}
                    >
                      {`${f.replace(/\D/g, "")}호기`}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody className="bg-white">
              <TableStateRow
                loading={analysisLoading}
                isEmpty={analysisRows.length === 0}
                colSpan={analysisColumns.length}
              />
              {!analysisLoading &&
                visibleRows.map((item) => (
                  <tr
                    key={`${item.collectedDt}-${item.no}`}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    {analysisColumns.map((col) => {
                      const v = item[col.key];
                      const isFeeder = col.key !== "no" && col.key !== "collectedDt";
                      return (
                        <td
                          key={col.key}
                          className={`px-4 py-3 text-sm text-gray-700 whitespace-nowrap ${
                            isFeeder ? NUMBER_ALIGN : "text-center"
                          }`}
                        >
                          {isFeeder
                            ? typeof v === "number"
                              ? `${formatNumber(v)} g`
                              : "-"
                            : v ?? ""}
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
        page={analysisPage}
        size={analysisSize}
        totalElements={analysisRows.length}
        totalPages={Math.max(1, Math.ceil(analysisRows.length / analysisSize))}
        onPageChange={setAnalysisPage}
        onSizeChange={(s) => {
          setAnalysisSize(s);
          setAnalysisPage(0);
        }}
        loading={analysisLoading}
      />
    </div>
  );
}
