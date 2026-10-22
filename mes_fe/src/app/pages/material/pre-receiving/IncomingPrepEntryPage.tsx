/** [자재관리 > 가입고관리] 발주 품목의 가입고(임시입고)를 등록하고 구매 LOT 번호를 채번한다. API: preReceivingApi(/material/inbound). */
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { BUTTON_STYLES, FORM_ERROR_STYLES, LIST_TABLE_STYLES } from "@/app/styles/button-styles";
import { DateRangePickerWithLabel } from "../../../components/common/DateRangePickerWithLabel";
import { ServerPagination } from "../../../components/common/ServerPagination";
import { TableStateRow } from "../../../components/common/TableStateRow";
import { handleNonNegativeNumberChange, preventNegativeKey } from "@/app/utils/numericInput";
import { usePermission } from "../../../context/UserContext";
import { formatNumber } from "@/app/utils/numberFormat";
import { NUMBER_ALIGN, HEADER_ALIGN } from "@/app/styles/table-styles";
import { cn } from "@/app/components/ui/utils";
import { useIncomingPrepEntry } from "./useIncomingPrepEntry";
import { PrepAdjustDialog } from "./PrepAdjustDialog";

interface IncomingPrepEntryPageProps {
  mode?: "create" | "edit";
  selectedId?: string;
  onBack?: () => void;
  onRegister?: (data?: any) => void;
}

const ORDER_ITEM_HEADERS = [
  "선택", "No.", "발주번호", "계정구분", "품번", "품명", "규격", "단위", "거래처명",
  "거래처번호", "발주일자", "입고요청일", "발주수량", "기존가입고수량", "가입고수량", "구매 Lot-No", "가입고일자",
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

  const availTotal = entry.availableOrders.length;
  const availTotalPages = Math.max(1, Math.ceil(availTotal / entry.availSize));
  const availSafePage = Math.min(entry.availPage, availTotalPages - 1);
  const availPageRows = entry.availableOrders.slice(
    availSafePage * entry.availSize,
    availSafePage * entry.availSize + entry.availSize,
  );

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

          {/* 발주 품목정보: 대상을 체크해 선택하고, 같은 행에서 바로 가입고수량/일자를 입력한다 */}
          <div>
            <div className="py-2 font-semibold text-gray-900 mb-2">발주 품목정보</div>
            <div className={`${LIST_TABLE_STYLES.container} mb-4`}>
              <div className={LIST_TABLE_STYLES.scrollWrapper} style={{ height: "300px" }}>
                <table className="w-full" style={{ minWidth: "1600px" }}>
                  <thead className={LIST_TABLE_STYLES.thead}>
                    <tr className={LIST_TABLE_STYLES.headerRow}>
                      {ORDER_ITEM_HEADERS.map((h) => (
                        <th key={h} className={cn(thClass, HEADER_ALIGN)}>
                          {h === "가입고일자" ? <>{h}<span className="text-red-500"> *</span></> : h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <TableStateRow
                      loading={entry.isLoadingOrders}
                      isEmpty={availPageRows.length === 0}
                      colSpan={17}
                      emptyText="선택 가능한 발주정보가 없습니다."
                    />
                    {!entry.isLoadingOrders &&
                      availPageRows.map((row) => {
                        const checked = entry.selectedRows.has(row.no);
                        const rowError = entry.errors[row.no];
                        const tableItem = entry.tableItems.find((t) => t.no === row.no);
                        return (
                          <tr
                            key={row.no}
                            onClick={() => entry.toggleRow(row.no)}
                            className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${checked ? "bg-blue-50" : ""}`}
                          >
                            <td className="px-4 py-3 text-center border-r border-gray-200" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => entry.toggleRow(row.no)}
                                className="w-4 h-4 cursor-pointer"
                              />
                            </td>
                            <td className={tdClass}>{row.no}</td>
                            <td className={tdClass}>{row.orderNo}</td>
                            <td className={tdClass}>{row.accountType}</td>
                            <td className={tdClass}>{row.itemCode}</td>
                            <td className={tdClass}>{row.itemName}</td>
                            <td className={tdClass}>{row.spec}</td>
                            <td className={tdClass}>{row.orderUnit}</td>
                            <td className={tdClass}>{row.customerName}</td>
                            <td className={tdClass}>{row.customerCode}</td>
                            <td className={tdClass}>{row.orderDate}</td>
                            <td className={tdClass}>{row.inReqDate}</td>
                            <td className={cn(tdClass, NUMBER_ALIGN)}>{formatNumber(row.orderQty)}</td>
                            <td className={cn(tdClass, NUMBER_ALIGN)}>{formatNumber(row.totalInboundQty || "0")}</td>
                            <td className="px-4 py-3 text-center border-r border-gray-200" onClick={(e) => e.stopPropagation()}>
                              {checked ? (
                                <>
                                  <Input
                                    type="number"
                                    step="1"
                                    min="0"
                                    value={tableItem?.inboundQty ?? ""}
                                    placeholder="0"
                                    onChange={(e) =>
                                      handleNonNegativeNumberChange(e.target.value, (v) =>
                                        entry.changeInboundQty(row.no, v),
                                      )
                                    }
                                    onKeyDown={preventNegativeKey}
                                    className={`w-20 text-center bg-white ${rowError?.inboundQty ? FORM_ERROR_STYLES.inputError : "border-gray-300"}`}
                                  />
                                  {rowError?.inboundQty && (
                                    <span className={FORM_ERROR_STYLES.errorMessage}>{rowError.inboundQty}</span>
                                  )}
                                </>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className={tdClass}>{checked ? tableItem?.purchaseLotNoPreview : "-"}</td>
                            <td className="px-4 py-3 text-center border-r border-gray-200" onClick={(e) => e.stopPropagation()}>
                              {checked ? (
                                <>
                                  <input
                                    type="date"
                                    value={tableItem?.inboundDate ?? ""}
                                    onChange={(e) => entry.changeInboundDate(row.no, e.target.value)}
                                    className={`h-10 px-2 bg-white border rounded text-sm focus:outline-none focus:ring-1 ${rowError?.inboundDate ? "validation-error-input" : "border-gray-300 focus:ring-[#5B6FD8]"}`}
                                  />
                                  {rowError?.inboundDate && (
                                    <p className="validation-error-message">{rowError.inboundDate}</p>
                                  )}
                                </>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              <div className={LIST_TABLE_STYLES.paginationWrapper}>
                <ServerPagination
                  page={availSafePage}
                  size={entry.availSize}
                  totalElements={availTotal}
                  totalPages={availTotalPages}
                  onPageChange={entry.setAvailPage}
                  onSizeChange={(s) => {
                    entry.setAvailSize(s);
                    entry.setAvailPage(0);
                  }}
                  loading={entry.isLoadingOrders}
                />
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
