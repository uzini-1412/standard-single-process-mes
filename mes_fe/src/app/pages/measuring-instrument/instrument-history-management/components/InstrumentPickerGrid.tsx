import { formatCurrency } from "@/app/utils/numberFormat";
import { NUMBER_ALIGN, HEADER_ALIGN } from "@/app/styles/table-styles";
import type { InstrumentSelectionRecord } from "@/types/measuring-instrument/history.interface";

interface InstrumentPickerGridProps {
  rows: InstrumentSelectionRecord[];
  onRowClick: (row: InstrumentSelectionRecord) => void;
}

const HEADER_CELL =
  "px-4 py-3 text-center text-xs font-semibold text-white whitespace-nowrap border-r border-white";
const HEADER_NUMERIC =
  `px-4 py-3 text-xs font-semibold text-white whitespace-nowrap border-r border-white ${HEADER_ALIGN}`;
const BODY_CELL =
  "px-4 py-3 text-xs text-gray-700 text-center border-r border-gray-200";
const BODY_NUMERIC =
  `px-4 py-3 text-xs text-gray-700 border-r border-gray-200 ${NUMBER_ALIGN}`;

export function InstrumentPickerGrid({
  rows,
  onRowClick,
}: InstrumentPickerGridProps) {
  return (
    <div className="bg-white rounded-lg p-6 mb-6">
      <div className="mb-4">
        <div className="py-2 font-semibold text-gray-900">등록/조회 현황</div>
      </div>
      <div className="border border-gray-200 rounded-sm overflow-hidden" style={{ height: "200px" }}>
        <div className="h-full overflow-auto">
          <table className="w-full min-w-[2000px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#4A5CC7]">
                <th className={HEADER_CELL}>선택</th>
                <th className={HEADER_CELL}>No.</th>
                <th className={HEADER_CELL}>관리번호</th>
                <th className={HEADER_CELL}>구분</th>
                <th className={HEADER_CELL}>기기명</th>
                <th className={HEADER_CELL}>모델명</th>
                <th className={HEADER_CELL}>기기번호</th>
                <th className={HEADER_CELL}>규격&형식</th>
                <th className={HEADER_CELL}>제조사</th>
                <th className={HEADER_CELL}>구입일자</th>
                <th className={HEADER_NUMERIC}>구입금액</th>
                <th className={HEADER_CELL}>교정주기</th>
                <th className={HEADER_CELL}>교정기관</th>
                <th className={HEADER_CELL}>교정일자</th>
                <th className={HEADER_CELL}>차기교정일자</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={15} className="px-4 py-8 text-center text-sm text-gray-500 border-r border-gray-200">
                    계측기관리에서 등록된 계측기가 없습니다.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr
                    key={row.instrumentSq}
                    className={`border-t border-gray-200 hover:bg-gray-50 cursor-pointer ${
                      row.selected ? "bg-blue-50" : ""
                    }`}
                    onClick={() => onRowClick(row)}
                  >
                    <td className={BODY_CELL}>
                      <input type="checkbox" readOnly checked={row.selected} className="w-4 h-4" />
                    </td>
                    <td className={BODY_CELL}>{index + 1}</td>
                    <td className={BODY_CELL}>{row.manageNo}</td>
                    <td className={BODY_CELL}>{row.instrumentType}</td>
                    <td className={BODY_CELL}>{row.instrumentNm}</td>
                    <td className={BODY_CELL}>{row.modelNm}</td>
                    <td className={BODY_CELL}>{row.instrumentNo}</td>
                    <td className={BODY_CELL}>{row.spec}</td>
                    <td className={BODY_CELL}>{row.makerNm}</td>
                    <td className={BODY_CELL}>{row.purchaseDate}</td>
                    <td className={BODY_NUMERIC}>{formatCurrency(row.purchasePrice)}</td>
                    <td className={BODY_CELL}>{row.calibCycle}</td>
                    <td className={BODY_CELL}>{row.calibAgency}</td>
                    <td className={BODY_CELL}>{row.lastCalibDate}</td>
                    <td className={BODY_CELL}>{row.nextCalibDate}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
