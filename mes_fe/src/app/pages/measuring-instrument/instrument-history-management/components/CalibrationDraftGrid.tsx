import { Button } from "@/app/components/ui/button";
import { BUTTON_STYLES } from "@/app/styles/button-styles";
import { formatCurrency } from "@/app/utils/numberFormat";
import { NUMBER_ALIGN, HEADER_ALIGN } from "@/app/styles/table-styles";
import type { HistoryFormRecord } from "@/types/measuring-instrument/history.interface";

interface CalibrationDraftGridProps {
  rows: HistoryFormRecord[];
  onAddRow: () => void;
  onRowSelectedChange: (index: number, selected: boolean) => void;
}

const HEADER_CELL =
  "px-4 py-3 text-center text-xs font-semibold text-white whitespace-nowrap border-r border-white";
const HEADER_NUMERIC =
  `px-4 py-3 text-xs font-semibold text-white whitespace-nowrap border-r border-white ${HEADER_ALIGN}`;
const BODY_CELL =
  "px-4 py-3 text-xs text-gray-700 text-center border-r border-gray-200";
const BODY_NUMERIC =
  `px-4 py-3 text-xs text-gray-700 border-r border-gray-200 ${NUMBER_ALIGN}`;

export function CalibrationDraftGrid({
  rows,
  onAddRow,
  onRowSelectedChange,
}: CalibrationDraftGridProps) {
  return (
    <div className="bg-white rounded-lg p-6 mb-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="py-2 font-semibold text-gray-900">이력/조회 현황</div>
        <Button onClick={onAddRow} className={BUTTON_STYLES.register}>
          추가
        </Button>
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
                <th className={HEADER_CELL}>이력구분</th>
                <th className={HEADER_CELL}>조치일자</th>
                <th className={HEADER_CELL}>교정기관</th>
                <th className={HEADER_NUMERIC}>조치금액</th>
                <th className={HEADER_CELL}>검교정성적서</th>
                <th className={HEADER_CELL}>이력내용</th>
                <th className={HEADER_CELL}>비고</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={15} className="px-4 py-8 text-center text-sm text-gray-500 border-r border-gray-200">
                    추가 버튼을 눌러 이력을 등록하세요.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={`${row.instrumentSq}-${row.No}-${index}`} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className={BODY_CELL}>
                      <input
                        type="checkbox"
                        checked={row.selected}
                        className="w-4 h-4"
                        onChange={(event) =>
                          onRowSelectedChange(index, event.target.checked)
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
                    <td className={BODY_CELL}>{row.historyType}</td>
                    <td className={BODY_CELL}>{row.occurDate}</td>
                    <td className={BODY_CELL}>{row.agencyNm}</td>
                    <td className={BODY_NUMERIC}>{formatCurrency(row.actionCost)}</td>
                    <td className={BODY_CELL}>{row.reportFilePath ? "첨부됨" : "-"}</td>
                    <td className={BODY_CELL}>{row.actionContent}</td>
                    <td className={BODY_CELL}>{row.remark}</td>
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
