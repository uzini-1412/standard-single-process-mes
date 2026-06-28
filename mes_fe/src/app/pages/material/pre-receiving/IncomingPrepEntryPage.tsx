/** [자재관리 > 가입고관리] 발주 품목의 가입고(임시입고)를 등록하고 구매 LOT 번호를 채번한다. API: preReceivingApi(/material/inbound). */
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { BUTTON_STYLES, FORM_ERROR_STYLES, LIST_TABLE_STYLES } from "@/app/styles/button-styles";
import { DateRangePickerWithLabel } from "../../../components/common/DateRangePickerWithLabel";
import { handleNonNegativeNumberChange, preventNegativeKey } from "@/app/utils/numericInput";
import { usePermission } from "../../../context/UserContext";
import { formatNumber } from "@/app/utils/numberFormat";
import { NUMBER_ALIGN } from "@/app/styles/table-styles";
import { useIncomingPrepEntry } from "./useIncomingPrepEntry";
import { CandidateOrdersTable } from "./CandidateOrdersTable";
import { PrepAdjustDialog } from "./PrepAdjustDialog";

interface IncomingPrepEntryPageProps {
  mode?: "create" | "edit";
  selectedId?: string;
  onBack?: () => void;
  onRegister?: (data?: any) => void;
}

const ORDER_ITEM_HEADERS = [
  "No.", "발주번호", "계정구분", "품번", "품명", "규격", "단위", "거래처명",
  "거래처번호", "발주일자", "입고요청일", "발주수량", "가입고수량", "구매 Lot-No", "가입고일자",
];

const HISTORY_HEADERS = [
  "No.", "입고구분", "발주번호", "품번", "품명", "구매 Lot-No", "가입고수량", "가입고일자", "검사상태",
];

/** 검사상태 코드 → 한글 라벨 */
function inspectLabel(status?: string) {
  if (status === "WAIT") return "대기";
  if (status === "PASS") return "합격";
  if (status === "REJECT") return "불합격";
  return status;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function IncomingPrepEntryPage(_props: IncomingPrepEntryPageProps = {}) {
  const perm = usePermission("pre-receiving-status");
  const entry = useIncomingPrepEntry();

  const thClass = LIST_TABLE_STYLES.headerCell;
  const tdClass = "px-4 py-3 text-xs text-gray-700 text-center whitespace-nowrap border-r border-gray-200";

  const canSubmit = entry.tableItems.filter((i) => i.selected).length > 0 && !entry.isRegistering;

  return (
    <div className="p-3">
      <div className="bg-white rounded-lg p-3">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">가입고관리</h1>
          {perm.createAuth && (
            <Button
              onClick={entry.submit}
              disabled={!canSubmit}
              className="bg-black hover:bg-gray-800 text-white px-6"
            >
              가입고 등록
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {/* 발주일자 검색 영역 */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-3">
              <DateRangePickerWithLabel
                label="발주일자"
                dateFrom={entry.searchDateFrom}
                dateTo={entry.searchDateTo}
                onDateFromChange={entry.setSearchDateFrom}
                onDateToChange={entry.setSearchDateTo}
              />
              <Button onClick={entry.runSearch} className={BUTTON_STYLES.search}>검색</Button>
            </div>
          </div>

          {/* 가입고 대상 선택 */}
          <div>
            <div className="py-2 font-semibold text-gray-900 mb-2">가입고대상선택</div>
            <CandidateOrdersTable
              orders={entry.availableOrders}
              isLoading={entry.isLoadingOrders}
              selectedRows={entry.selectedRows}
              page={entry.availPage}
              size={entry.availSize}
              onToggle={entry.toggleRow}
              onPageChange={entry.setAvailPage}
              onSizeChange={entry.setAvailSize}
            />
          </div>

          {/* 발주 품목정보 입력 */}
          <div>
            <div className="py-2 font-semibold text-gray-900 mb-2">발주 품목정보</div>
            <div className="border border-gray-200 rounded-sm overflow-hidden">
              <div className="overflow-x-auto overflow-y-auto" style={{ height: "300px" }}>
                <table className="w-full" style={{ minWidth: "1400px" }}>
                  <thead className="sticky top-0 z-10">
                    <tr className={LIST_TABLE_STYLES.headerRow}>
                      {ORDER_ITEM_HEADERS.map((h) => (
                        <th key={h} className={thClass}>
                          {h === "가입고일자" ? <>{h}<span className="text-red-500"> *</span></> : h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entry.tableItems.length === 0 ? (
                      <tr>
                        <td colSpan={15} className="px-4 py-8 text-center text-sm text-gray-500 border-r border-gray-200">
                          추가된 품목이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      entry.tableItems.map((item, index) => {
                        const rowError = entry.errors[item.no];
                        return (
                          <tr key={item.no} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className={tdClass}>{index + 1}</td>
                            <td className={tdClass}>{item.orderNo}</td>
                            <td className={tdClass}>{item.accountType}</td>
                            <td className={tdClass}>{item.itemCode}</td>
                            <td className={tdClass}>{item.itemName}</td>
                            <td className={tdClass}>{item.spec}</td>
                            <td className={tdClass}>{item.orderUnit}</td>
                            <td className={tdClass}>{item.customerName}</td>
                            <td className={tdClass}>{item.customerCode}</td>
                            <td className={tdClass}>{item.orderDate}</td>
                            <td className={tdClass}>{item.inReqDate}</td>
                            <td className={tdClass}>{item.orderQty}</td>
                            <td className="px-4 py-3 text-center border-r border-gray-200">
                              <Input
                                type="number"
                                step="1"
                                min="0"
                                value={item.inboundQty}
                                placeholder="0"
                                onChange={(e) =>
                                  handleNonNegativeNumberChange(e.target.value, (v) =>
                                    entry.changeInboundQty(index, v),
                                  )
                                }
                                onKeyDown={preventNegativeKey}
                                className={`w-20 text-center bg-white ${rowError?.inboundQty ? FORM_ERROR_STYLES.inputError : "border-gray-300"}`}
                              />
                              {rowError?.inboundQty && (
                                <span className={FORM_ERROR_STYLES.errorMessage}>{rowError.inboundQty}</span>
                              )}
                            </td>
                            <td className={tdClass}>{item.purchaseLotNoPreview}</td>
                            <td className="px-4 py-3 text-center border-r border-gray-200">
                              <input
                                type="date"
                                value={item.inboundDate}
                                onChange={(e) => entry.changeInboundDate(index, e.target.value)}
                                className={`h-10 px-2 bg-white border rounded text-sm focus:outline-none focus:ring-1 ${rowError?.inboundDate ? "validation-error-input" : "border-gray-300 focus:ring-[#5B6FD8]"}`}
                              />
                              {rowError?.inboundDate && (
                                <p className="validation-error-message">{rowError.inboundDate}</p>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 가입고 이력 */}
          <div>
            <div className="py-2 font-semibold text-gray-900 mb-2">가입고 이력</div>
            <div className="border border-gray-200 rounded-sm overflow-hidden">
              <div className="overflow-x-auto overflow-y-auto" style={{ height: "300px" }}>
                <table className="w-full" style={{ minWidth: "1200px" }}>
                  <thead className="sticky top-0 z-10">
                    <tr className={LIST_TABLE_STYLES.headerRow}>
                      {HISTORY_HEADERS.map((h) => (
                        <th key={h} className={thClass}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entry.filteredHistoryItems.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500 border-r border-gray-200">
                          선택된 항목의 가입고 이력이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      entry.filteredHistoryItems.map((item, index) => {
                        const negative = Number(item.inboundQty) < 0;
                        return (
                          <tr key={item.inboundSq} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className={tdClass}>{index + 1}</td>
                            <td className={tdClass}>{item.inboundType === "ADJUST" ? "가입고 조정" : "가입고 등록"}</td>
                            <td className={tdClass}>{item.orderNo}</td>
                            <td className={tdClass}>{item.itemCode}</td>
                            <td className={tdClass}>{item.itemName}</td>
                            <td className={tdClass}>{item.purchaseLotNo || "-"}</td>
                            <td className={`px-4 py-3 text-xs ${NUMBER_ALIGN} whitespace-nowrap border-r border-gray-200 ${negative ? "text-red-600 font-medium" : "text-gray-700"}`}>
                              {formatNumber(item.inboundQty)}
                            </td>
                            <td className={tdClass}>{item.inboundDate}</td>
                            <td className={tdClass}>{inspectLabel(item.inspectStatus)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {entry.adjustOpen && entry.adjustTarget && (
        <PrepAdjustDialog
          target={entry.adjustTarget}
          type={entry.adjustType}
          qty={entry.adjustQty}
          onChangeQty={entry.setAdjustQty}
          onClose={() => entry.setAdjustOpen(false)}
          onSave={entry.submitAdjust}
        />
      )}
    </div>
  );
}
