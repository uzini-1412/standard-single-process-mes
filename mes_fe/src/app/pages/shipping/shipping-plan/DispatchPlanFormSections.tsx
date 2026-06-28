import { FOUR_COLUMN_GRID_STYLES } from "../../../styles/button-styles";
import { ShippingPlanData } from "@/types/shipping/plan.interface";
import { shippingPlanFormOrderColumns, shippingPlanFormListColumns } from "@/app/constants/shipping";
import { handleNonNegativeNumberChange, preventNegativeKey } from "@/app/utils/numericInput";
import { UNITS, withUnit } from "@/app/utils/unitConvert";

interface EditDraftTableProps {
  editDraft: ShippingPlanData;
  onChange: (patch: Partial<ShippingPlanData>) => void;
}

// 단건 수정 모드의 4열 그리드 입력 테이블(대부분 읽기전용, 출하량/출하일/보관위치/비고만 편집 가능).
export function EditDraftTable({ editDraft, onChange }: EditDraftTableProps) {
  return (
    <div className="border border-gray-200 rounded-sm overflow-hidden">
      <table className={FOUR_COLUMN_GRID_STYLES.table}>
        <tbody>
          <tr className={FOUR_COLUMN_GRID_STYLES.row}>
            <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>품번</td>
            <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
              <input value={editDraft.itemCode} readOnly disabled className={`${FOUR_COLUMN_GRID_STYLES.input} w-full bg-gray-50`} />
            </td>
            <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>품명</td>
            <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
              <input value={editDraft.itemName} readOnly disabled className={`${FOUR_COLUMN_GRID_STYLES.input} w-full bg-gray-50`} />
            </td>
          </tr>
          <tr className={FOUR_COLUMN_GRID_STYLES.row}>
            <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>{withUnit("평량", UNITS.basisWeight)}</td>
            <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
              <input value={editDraft.basisWeight} readOnly disabled className={`${FOUR_COLUMN_GRID_STYLES.input} w-full bg-gray-50`} />
            </td>
            <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>{withUnit("폭", UNITS.width)}</td>
            <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
              <input value={editDraft.width} readOnly disabled className={`${FOUR_COLUMN_GRID_STYLES.input} w-full bg-gray-50`} />
            </td>
          </tr>
          <tr className={FOUR_COLUMN_GRID_STYLES.row}>
            <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>{withUnit("길이", UNITS.length)}</td>
            <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
              <input value={editDraft.length} readOnly disabled className={`${FOUR_COLUMN_GRID_STYLES.input} w-full bg-gray-50`} />
            </td>
            <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>{withUnit("수주량", UNITS.length)}</td>
            <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
              <input value={editDraft.salesOrderQty} readOnly disabled className={`${FOUR_COLUMN_GRID_STYLES.input} w-full bg-gray-50`} />
            </td>
          </tr>
          <tr className={FOUR_COLUMN_GRID_STYLES.row}>
            <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>거래처명</td>
            <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
              <input value={editDraft.customerName} readOnly disabled className={`${FOUR_COLUMN_GRID_STYLES.input} w-full bg-gray-50`} />
            </td>
            <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>{withUnit("재고량", UNITS.length)}</td>
            <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
              <input value={editDraft.currentStock} readOnly disabled className={`${FOUR_COLUMN_GRID_STYLES.input} w-full bg-gray-50`} />
            </td>
          </tr>
          <tr className={FOUR_COLUMN_GRID_STYLES.row}>
            <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>{withUnit("출하량", UNITS.length)}</td>
            <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
              <input
                type="number"
                min="0"
                step="any"
                value={editDraft.planQty}
                onChange={(e) =>
                  handleNonNegativeNumberChange(e.target.value, (v) => onChange({ planQty: v }))
                }
                onKeyDown={preventNegativeKey}
                placeholder="출하량 입력"
                className={`${FOUR_COLUMN_GRID_STYLES.input} w-full`}
              />
            </td>
            <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>롤수(EA)</td>
            <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
              <input value={editDraft.planQtyEa || ""} readOnly disabled className={`${FOUR_COLUMN_GRID_STYLES.input} w-full bg-gray-50`} />
            </td>
          </tr>
          <tr className={FOUR_COLUMN_GRID_STYLES.row}>
            <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>출하일</td>
            <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
              <input
                type="date"
                value={editDraft.expectedShipDate}
                onChange={(e) => onChange({ expectedShipDate: e.target.value })}
                className={`${FOUR_COLUMN_GRID_STYLES.input} w-full`}
              />
            </td>
            <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>제품보관위치</td>
            <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
              <input
                type="text"
                value={editDraft.storageLocation || ""}
                onChange={(e) => onChange({ storageLocation: e.target.value })}
                placeholder="입력"
                className={`${FOUR_COLUMN_GRID_STYLES.input} w-full`}
              />
            </td>
          </tr>
          <tr className={FOUR_COLUMN_GRID_STYLES.row}>
            <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>수주번호</td>
            <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
              <input value={editDraft.orderNo || ""} readOnly disabled className={`${FOUR_COLUMN_GRID_STYLES.input} w-full bg-gray-50`} />
            </td>
            <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>출하 Lot-No</td>
            <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
              <input value={editDraft.lotNo || ""} readOnly disabled className={`${FOUR_COLUMN_GRID_STYLES.input} w-full bg-gray-50 font-mono`} />
            </td>
          </tr>
          <tr className={FOUR_COLUMN_GRID_STYLES.row}>
            <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>비고</td>
            <td className={FOUR_COLUMN_GRID_STYLES.valueCell} colSpan={3}>
              <input
                type="text"
                value={editDraft.remark || ""}
                onChange={(e) => onChange({ remark: e.target.value })}
                placeholder="입력"
                className={`${FOUR_COLUMN_GRID_STYLES.input} w-full`}
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

interface OrderSelectTableProps {
  ordersLoading: boolean;
  selectableOrders: any[];
  addedDtlSqSet: Set<any>;
  onOrderClick: (detail: any) => void;
}

// 등록 모드 상단: 선택 가능한 수주정보를 행 단위로 보여주고 클릭으로 담거나 뺀다.
export function OrderSelectTable({ ordersLoading, selectableOrders, addedDtlSqSet, onOrderClick }: OrderSelectTableProps) {
  return (
    <div className="border border-gray-200 rounded-sm overflow-hidden">
      <div className="h-[280px] overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#4A5CC7] border-b border-gray-200">
              {shippingPlanFormOrderColumns.map((col) => (
                <th key={col.key} style={{ minWidth: col.width }} className="px-4 py-3 text-center text-xs font-semibold text-white tracking-wider whitespace-nowrap border-r border-white">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {ordersLoading ? (
              <tr>
                <td colSpan={shippingPlanFormOrderColumns.length} className="px-4 py-8 text-center text-sm text-gray-500 border-r border-gray-200">로딩 중...</td>
              </tr>
            ) : selectableOrders.length === 0 ? (
              <tr>
                <td colSpan={shippingPlanFormOrderColumns.length} className="px-4 py-8 text-center text-sm text-gray-500 border-r border-gray-200">등록 가능한 수주정보가 없습니다.</td>
              </tr>
            ) : (
              selectableOrders.map((d, index) => {
                const picked = addedDtlSqSet.has(d.orderDtlSq);
                return (
                  <tr
                    key={d.id}
                    className={`border-b border-gray-200 transition-colors cursor-pointer ${picked ? "bg-blue-100 hover:bg-blue-200" : "hover:bg-blue-50"}`}
                    onClick={() => onOrderClick(d)}
                  >
                    <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{index + 1}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{d.orderDate || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{d.orderNo || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{d.customerCode || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{d.customerName || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{d.itemCode || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{d.itemName || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{Number(d.salesOrderQty || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{Number(d.salesOrderQtyEa || 0).toLocaleString()}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface DraftListTableProps {
  draftItems: ShippingPlanData[];
  onPlanQtyChange: (idx: number, value: string) => void;
  onShipDateChange: (idx: number, value: string) => void;
  onRemarkChange: (idx: number, value: string) => void;
}

// 등록 모드 하단: 담긴 출하계획 항목을 보여주고 출하량/출하일/비고를 인라인 편집한다.
export function DraftListTable({ draftItems, onPlanQtyChange, onShipDateChange, onRemarkChange }: DraftListTableProps) {
  return (
    <div className="border border-gray-200 rounded-sm overflow-hidden">
      <div className="h-[350px] overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#4A5CC7] border-b border-gray-200">
              {shippingPlanFormListColumns.map((col) => (
                <th key={col.key} style={{ minWidth: col.width }} className="px-3 py-3 text-center text-xs font-semibold text-white tracking-wider whitespace-nowrap border-r border-white">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {draftItems.length === 0 ? (
              <tr>
                <td colSpan={shippingPlanFormListColumns.length} className="px-4 py-12 text-center text-gray-500 border-r border-gray-200">
                  상단 수주정보를 클릭하여 출하계획을 추가하세요
                </td>
              </tr>
            ) : (
              draftItems.map((itm, index) => (
                <tr key={`${itm.orderDtlSq}_${index}`} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs text-gray-900 text-center border-r border-gray-200">{itm.no}</td>
                  <td className="px-3 py-2 text-xs text-gray-900 text-center font-mono border-r border-gray-200">{itm.lotNo || "-"}</td>
                  <td className="px-3 py-2 text-xs text-gray-900 text-center border-r border-gray-200">{itm.orderNo || "-"}</td>
                  <td className="px-3 py-2 text-xs text-gray-900 text-center border-r border-gray-200">{itm.customerName || "-"}</td>
                  <td className="px-3 py-2 text-xs text-gray-900 text-center border-r border-gray-200">{itm.itemCode || "-"}</td>
                  <td className="px-3 py-2 text-xs text-gray-900 text-center border-r border-gray-200">{itm.itemName || "-"}</td>
                  <td className="px-3 py-2 text-xs text-gray-900 text-center border-r border-gray-200">{itm.width || "-"}</td>
                  <td className="px-3 py-2 text-xs text-gray-900 text-center border-r border-gray-200">{itm.length || "-"}</td>
                  <td className="px-3 py-2 text-xs text-gray-900 text-center border-r border-gray-200">{itm.salesOrderQty || "-"}</td>
                  {/* 출하량(m): 사용자가 직접 숫자를 입력한다 */}
                  <td className="px-3 py-2 text-center border-r border-gray-200">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={itm.planQty || ""}
                      onChange={(e) =>
                        handleNonNegativeNumberChange(e.target.value, (v) => onPlanQtyChange(index, v))
                      }
                      onKeyDown={preventNegativeKey}
                      placeholder="0"
                      className="text-xs h-8 w-24 text-right bg-white border border-gray-300 rounded px-2 focus:outline-none focus:ring-1 focus:ring-[#5B6FD8]"
                    />
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-900 text-center border-r border-gray-200">{itm.planQtyEa || "-"}</td>
                  <td className="px-3 py-2 text-center border-r border-gray-200">
                    <input
                      type="date"
                      value={itm.expectedShipDate}
                      onChange={(e) => onShipDateChange(index, e.target.value)}
                      className="text-xs h-8 bg-white border border-gray-300 rounded px-1 focus:outline-none focus:ring-1 focus:ring-[#5B6FD8]"
                    />
                  </td>
                  <td className="px-3 py-2 text-center border-r border-gray-200">
                    <input
                      type="text"
                      value={itm.remark || ""}
                      onChange={(e) => onRemarkChange(index, e.target.value)}
                      placeholder=""
                      className="text-xs h-8 w-24 bg-white border border-gray-300 rounded px-2 focus:outline-none focus:ring-1 focus:ring-[#5B6FD8]"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
