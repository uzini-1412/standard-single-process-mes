import { Button } from "@/app/components/ui/button";
import { BUTTON_STYLES } from "@/app/styles/button-styles";
import { NUMBER_ALIGN, HEADER_ALIGN } from "@/app/styles/table-styles";
import { formatCurrency } from "@/app/utils/numberFormat";
import type { HistoryRecord } from "@/types/measuring-instrument/instrumentManager.interface";
import { computeDaysUntilCalib } from "../instrumentFormModel.utils";

interface InstrumentEntryLogGridProps {
  historyData: Array<HistoryRecord & { remainingDays?: number | null }>;
  onAddRow: () => void;
  onRowChange: (
    index: number,
    field: keyof HistoryRecord,
    value: string | boolean,
  ) => void;
}

// 잔여일 값에 따라 글자 색상 클래스를 결정한다(만료=빨강, 임박=주황).
function pickRemainingDaysClass(daysLeft: number | null) {
  if (daysLeft != null && daysLeft < 0) {
    return "text-red-600";
  }
  if (daysLeft != null && daysLeft <= 30) {
    return "text-orange-500";
  }
  return "text-gray-700";
}

const HEADER_CELL =
  "px-4 py-3 text-center text-xs font-semibold text-white whitespace-nowrap border-r border-white";
const BODY_CELL = "px-4 py-3 text-xs text-gray-700 text-center border-r border-gray-200";

export function InstrumentEntryLogGrid({
  historyData,
  onAddRow,
  onRowChange,
}: InstrumentEntryLogGridProps) {
  return (
    <div className="bg-white rounded-lg p-6 mb-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="py-2 font-semibold text-gray-900">등록/조회 현황</div>
        <Button onClick={onAddRow} className={BUTTON_STYLES.register}>
          추가
        </Button>
      </div>

      <div className="border border-gray-200 rounded-sm overflow-hidden" style={{ height: "200px" }}>
        <div className="h-full overflow-auto">
          <table className="w-full min-w-[2200px]">
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
                <th className={`px-4 py-3 ${HEADER_ALIGN} text-xs font-semibold text-white whitespace-nowrap border-r border-white`}>구입금액</th>
                <th className={HEADER_CELL}>교정주기</th>
                <th className={HEADER_CELL}>교정기관</th>
                <th className={HEADER_CELL}>교정일자</th>
                <th className={HEADER_CELL}>차기교정일자</th>
                <th className={HEADER_CELL}>잔여일</th>
                <th className={HEADER_CELL}>비고</th>
              </tr>
            </thead>
            <tbody>
              {historyData.length === 0 ? (
                <tr>
                  <td colSpan={17} className="px-4 py-8 text-center text-sm text-gray-500 border-r border-gray-200">
                    등록된 계측기 정보가 없습니다.
                  </td>
                </tr>
              ) : (
                historyData.map((row, index) => {
                  const daysLeft =
                    row.remainingDays ?? computeDaysUntilCalib(row.nextCalibDate);

                  return (
                    <tr
                      key={`${row.No}-${index}`}
                      className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                    >
                      <td className={BODY_CELL}>
                        <input
                          type="checkbox"
                          className="w-4 h-4"
                          checked={row.selected}
                          onChange={(event) =>
                            onRowChange(index, "selected", event.target.checked)
                          }
                        />
                      </td>
                      <td className={BODY_CELL}>{row.No}</td>
                      <td className={BODY_CELL}>{row.manageNo}</td>
                      <td className={BODY_CELL}>{row.instrumentType}</td>
                      <td className={BODY_CELL}>{row.instrumentNm}</td>
                      <td className={BODY_CELL}>{row.modelNm}</td>
                      <td className={BODY_CELL}>{row.instrumentNo}</td>
                      <td className={BODY_CELL}>{row.spec}</td>
                      <td className={BODY_CELL}>{row.makerNm}</td>
                      <td className={BODY_CELL}>{row.purchaseDate}</td>
                      <td className={`px-4 py-3 text-xs text-gray-700 ${NUMBER_ALIGN} border-r border-gray-200`}>{formatCurrency(row.purchasePrice as string | number)}</td>
                      <td className={BODY_CELL}>{row.calibCycle}</td>
                      <td className={BODY_CELL}>{row.calibAgency}</td>
                      <td className={BODY_CELL}>{row.lastCalibDate}</td>
                      <td className={BODY_CELL}>{row.nextCalibDate}</td>
                      <td
                        className={`px-4 py-3 text-xs text-center whitespace-nowrap font-semibold border-r border-gray-200 ${pickRemainingDaysClass(daysLeft)}`}
                      >
                        {daysLeft != null ? `${daysLeft}일` : "-"}
                      </td>
                      <td className={BODY_CELL}>{row.remark}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
