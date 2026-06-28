/** [원소재투입분석상세] 라인·날짜·LOT 조회바 + 기본정보/레시피기준/회차별상세 3블록 탭. */
import { Fragment } from "react";
import { TableStateRow } from "../../../components/common/TableStateRow";
import { formatNumber } from "@/app/utils/numberFormat";
import { useConsumptionDetail } from "./useConsumptionDetail";
import { LineOption } from "./useLineMachineOptions";

interface Props {
  detail: ReturnType<typeof useConsumptionDetail>;
  lineList: LineOption[];
}

// 작업 상태 코드를 한글 라벨로 변환
function workStatusLabel(status: string | undefined): string {
  if (status === "COMPLETED") return "완료";
  if (status === "IN_PROGRESS") return "작업중";
  if (status === "STOPPED") return "중지";
  return "대기";
}

export function ConsumptionDetailTab({ detail, lineList }: Props) {
  const {
    lineCode,
    setLineCode,
    targetDate,
    setTargetDate,
    lotChoices,
    chosenLot,
    setChosenLot,
    detailLoading,
    totalWeight,
    materials,
    detailRows,
    detailTotals,
    recipeTotals,
  } = detail;

  return (
    <div>
      {/* 조회바: 라인 + 날짜 + LOT */}
      <div className="bg-gray-50 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
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

          <div className="flex items-center">
            <div className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 h-9 flex items-center whitespace-nowrap rounded-l-md border border-gray-300">
              날짜
            </div>
            <div className="flex items-center bg-white border border-l-0 border-gray-300 rounded-r-md">
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="h-9 px-3 bg-transparent border-0 text-xs focus:outline-none focus:ring-0"
              />
            </div>
          </div>

          <div className="flex items-center">
            <div className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 h-9 flex items-center whitespace-nowrap rounded-l-md border border-gray-300">
              LOT No.
            </div>
            <div className="flex items-center bg-white border border-l-0 border-gray-300 rounded-r-md">
              <select
                value={chosenLot?.lotNo || ""}
                onChange={(e) => {
                  const found = lotChoices.find((w) => w.lotNo === e.target.value);
                  setChosenLot(found || null);
                }}
                className="h-9 px-3 bg-transparent border-0 text-xs focus:outline-none focus:ring-0 min-w-[200px]"
              >
                {lotChoices.length === 0 && <option value="">(해당 라인·날짜 LOT 없음)</option>}
                {lotChoices.length > 0 && <option value="">선택</option>}
                {lotChoices.map((w) => (
                  <option key={w.workOrderSq} value={w.lotNo}>
                    {w.lotNo} · {w.itemCode} · {workStatusLabel(w.workStatus)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* LOT 미선택 안내 */}
      {!chosenLot && (
        <div className="border border-gray-200 rounded-md p-8 text-center text-sm text-gray-500 bg-white">
          라인과 날짜를 선택하면 해당 작업의 제조 LOT 목록이 표시됩니다. LOT을 선택하면 분석 상세가 표시됩니다.
        </div>
      )}

      {/* 1) 기본 정보 */}
      {chosenLot && (
        <div className="mb-4">
          <table className="w-full border border-gray-300 text-xs">
            <tbody>
              <tr>
                <th className="bg-gray-100 text-gray-700 font-semibold px-3 py-2 border border-gray-300 text-center w-[100px]">날짜</th>
                <td className="px-3 py-2 border border-gray-300 bg-white w-[160px]">{targetDate}</td>
                <th className="bg-gray-100 text-gray-700 font-semibold px-3 py-2 border border-gray-300 text-center w-[100px]">라인</th>
                <td className="px-3 py-2 border border-gray-300 bg-white">{lineCode}</td>
                <th className="bg-gray-100 text-gray-700 font-semibold px-3 py-2 border border-gray-300 text-center w-[100px]">품번</th>
                <td className="px-3 py-2 border border-gray-300 bg-white font-mono">{chosenLot.itemCode || "-"}</td>
              </tr>
              <tr>
                <th className="bg-gray-100 text-gray-700 font-semibold px-3 py-2 border border-gray-300 text-center">품명</th>
                <td className="px-3 py-2 border border-gray-300 bg-white">{chosenLot.itemName || "-"}</td>
                <th className="bg-gray-100 text-gray-700 font-semibold px-3 py-2 border border-gray-300 text-center">LOT No.</th>
                <td className="px-3 py-2 border border-gray-300 bg-white font-mono">{chosenLot.lotNo}</td>
                <th className="bg-gray-100 text-gray-700 font-semibold px-3 py-2 border border-gray-300 text-center">중량(g)</th>
                <td className="px-3 py-2 border border-gray-300 bg-white text-right">
                  {totalWeight.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* 2) 레시피 기준 */}
      {chosenLot && (
        <div className="mb-4">
          <div className="text-xs text-gray-600 mb-1">&lt;레시피 기준&gt;</div>
          <table className="w-full border border-gray-300 text-xs">
            <thead>
              <tr>
                <th className="bg-gray-100 text-gray-700 font-semibold px-3 py-2 border border-gray-300 text-center w-[140px]">소재품번</th>
                {materials.map((m) => (
                  <th key={m.label} className="px-3 py-2 border border-gray-300 text-center font-semibold">
                    {m.materialCode || "-"}
                  </th>
                ))}
                <th className="bg-gray-100 text-gray-700 font-semibold px-3 py-2 border border-gray-300 text-center w-[100px]">합계</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th className="bg-gray-100 text-gray-700 font-semibold px-3 py-2 border border-gray-300 text-center">표준중량비율(%)</th>
                {materials.map((m) => (
                  <td key={m.label} className="px-3 py-2 border border-gray-300 text-center">{m.ratio}</td>
                ))}
                <td className="px-3 py-2 border border-gray-300 text-center font-semibold">{recipeTotals.ratio}</td>
              </tr>
              <tr>
                <th className="bg-gray-100 text-gray-700 font-semibold px-3 py-2 border border-gray-300 text-center">평량(g/m²)</th>
                {materials.map((m) => (
                  <td key={`${m.label}-basis`} className="px-3 py-2 border border-gray-300 text-center bg-white">{m.basisQty}</td>
                ))}
                <td className="px-3 py-2 border border-gray-300 text-center font-semibold">{recipeTotals.basis}</td>
              </tr>
              <tr>
                <th className="bg-gray-100 text-gray-700 font-semibold px-3 py-2 border border-gray-300 text-center">표준중량(g)</th>
                {materials.map((m) => (
                  <td key={`${m.label}-req`} className="px-3 py-2 border border-gray-300 text-center bg-white font-semibold">{m.requiredQty.toLocaleString()}</td>
                ))}
                <td className="px-3 py-2 border border-gray-300 text-center font-semibold">{recipeTotals.weight.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
          {materials.length === 0 && (
            <div className="text-xs text-red-600 mt-1">해당 품번의 레시피가 등록되어 있지 않습니다.</div>
          )}
          <div className="text-xs text-gray-500 mt-1">
            표준중량(g) = 입력 중량(g) × 표준중량비율(%) / 100
          </div>
        </div>
      )}

      {/* 3) 회차별 상세 + 하단 통계 */}
      {chosenLot && materials.length > 0 && (
        <div className="border border-gray-200 rounded-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#4A5CC7]">
                  <th rowSpan={2} className="px-3 py-2 text-center text-xs font-semibold text-white border-r border-white whitespace-nowrap" style={{ minWidth: "50px" }}>횟수</th>
                  <th rowSpan={2} className="px-3 py-2 text-center text-xs font-semibold text-white border-r border-white whitespace-nowrap" style={{ minWidth: "140px" }}>시간</th>
                  {materials.map((m) => (
                    <th key={m.label} colSpan={3} className="px-3 py-2 text-center text-xs font-semibold text-white border-r border-white border-b border-white whitespace-nowrap">
                      {m.materialCode || "-"}
                    </th>
                  ))}
                  <th colSpan={3} className="px-3 py-2 text-center text-xs font-semibold text-white border-r border-white border-b border-white whitespace-nowrap">
                    합계
                  </th>
                </tr>
                <tr className="bg-[#4A5CC7]">
                  {materials.map((m) => (
                    <Fragment key={`hdr2-${m.label}`}>
                      <th className="px-2 py-2 text-center text-xs font-semibold text-white border-r border-white whitespace-nowrap" style={{ minWidth: "80px" }}>투입량(g)</th>
                      <th className="px-2 py-2 text-center text-xs font-semibold text-white border-r border-white whitespace-nowrap" style={{ minWidth: "80px" }}>과투입량(g)</th>
                      <th className="px-2 py-2 text-center text-xs font-semibold text-white border-r border-white whitespace-nowrap" style={{ minWidth: "80px" }}>과투입율(%)</th>
                    </Fragment>
                  ))}
                  <th className="px-2 py-2 text-center text-xs font-semibold text-white border-r border-white whitespace-nowrap" style={{ minWidth: "80px" }}>투입량(g)</th>
                  <th className="px-2 py-2 text-center text-xs font-semibold text-white border-r border-white whitespace-nowrap" style={{ minWidth: "80px" }}>과투입량(g)</th>
                  <th className="px-2 py-2 text-center text-xs font-semibold text-white border-r border-white whitespace-nowrap" style={{ minWidth: "80px" }}>과투입율(%)</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                <TableStateRow loading={detailLoading} isEmpty={detailRows.length === 0} colSpan={2 + materials.length * 3 + 3} />
                {!detailLoading &&
                  detailRows.map((row) => (
                    <tr key={row.collectedDt} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-3 py-2 text-center border-r border-gray-200">{row.no}</td>
                      <td className="px-3 py-2 text-center border-r border-gray-200 bg-white whitespace-nowrap">{row.collectedDt}</td>
                      {materials.map((m) => (
                        <Fragment key={`row-${row.no}-${m.label}`}>
                          <td className="px-2 py-2 text-right border-r border-gray-200 bg-white">{formatNumber(Math.round((row[`${m.label}_actual`] || 0) * 100) / 100)}</td>
                          <td className="px-2 py-2 text-right border-r border-gray-200">{formatNumber(Math.round((row[`${m.label}_over`] || 0) * 100) / 100)}</td>
                          <td className="px-2 py-2 text-right border-r border-gray-200">{formatNumber(Math.round((row[`${m.label}_rate`] || 0) * 100) / 100)}</td>
                        </Fragment>
                      ))}
                      <td className="px-2 py-2 text-right border-r border-gray-200 font-semibold">{formatNumber(Math.round(row.sumActual * 100) / 100)}</td>
                      <td className="px-2 py-2 text-right border-r border-gray-200">{formatNumber(Math.round(row.sumOver * 100) / 100)}</td>
                      <td className="px-2 py-2 text-right border-r border-gray-200">{formatNumber(Math.round(row.sumRate * 100) / 100)}</td>
                    </tr>
                  ))}
                {/* 하단 통계 */}
                {!detailLoading && detailRows.length > 0 && (
                  <tr className="border-t-2 border-gray-300 bg-gray-100 font-semibold">
                    <td className="px-3 py-2 text-center border-r border-gray-200">총횟수</td>
                    <td className="px-3 py-2 text-center border-r border-gray-200">{formatNumber(detailTotals.count)}</td>
                    {materials.map((m) => (
                      <Fragment key={`tot-${m.label}`}>
                        <td className="px-2 py-2 text-right border-r border-gray-200">{formatNumber(detailTotals[`${m.label}_total`])}</td>
                        <td className="px-2 py-2 text-center text-gray-500 border-r border-gray-200">평균%</td>
                        <td className="px-2 py-2 text-right border-r border-gray-200">{formatNumber(detailTotals[`${m.label}_avgRate`])}</td>
                      </Fragment>
                    ))}
                    <td colSpan={3} className="px-2 py-2 text-right border-r border-gray-200 bg-gray-200">전체총중량 {formatNumber(detailTotals.grandTotal)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
