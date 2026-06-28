import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { PAGE_LAYOUT_STYLES, BUTTON_STYLES } from "../../../styles/button-styles";
import { COLLECTION_DETAIL_COLUMNS } from "@/app/constants/management";
import { ClientSelectDialog } from "../../../components/features/order/ClientSelectDialog";
import { toWonLabel } from "./receivablesFormat";
import { useReceivableForm, type ViewMode } from "./useReceivableForm";
import { useDraggableModal } from "../../../hooks/useDraggableModal";
import { ShipResultPickerModal } from "./ShipResultPickerModal";

interface Props {
  mode: ViewMode;
  collectionSq?: number;
  onBack: () => void;
  onSave: () => void;
}

// 상세 모드: 테두리/배경 없는 표시 전용 input 스타일
const DETAIL_INPUT_CLS = "bg-transparent text-xs px-2 py-1.5 w-full text-gray-700 border-none outline-none";
// 등록/수정 모드: 테두리가 있는 비활성 input 스타일
const DISABLED_INPUT_CLS = "bg-gray-50 text-xs border border-gray-300 rounded px-2 py-1.5 w-full text-gray-700";

export function ReceivablesFormPage({ mode, collectionSq, onBack, onSave }: Props) {
  // 거래처 검색 모달 열림 여부
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const {
    screen, setScreen, readOnly, access, saving, heading,
    form, patchField,
    applyCustomer,
    shipPickerOpen, setShipPickerOpen, shipOptions, shipOptionsLoading,
    openShipPicker, addShipResult,
    editDetailCell, dropDetail,
    submit, remove,
  } = useReceivableForm({ mode, collectionSq, onBack, onSave });

  const { offset, beginDrag, whileDrag, endDrag } = useDraggableModal();

  // 읽기 전용 표시용 input 한 칸을 모드에 맞는 스타일로 렌더한다.
  const renderReadOnlyInput = (val: string) => (
    <input value={val} disabled className={readOnly ? DETAIL_INPUT_CLS : DISABLED_INPUT_CLS} />
  );

  const detailColSpan = COLLECTION_DETAIL_COLUMNS.length + (readOnly ? 0 : 1);

  return (
    <div className={PAGE_LAYOUT_STYLES.container} onMouseMove={whileDrag} onMouseUp={endDrag}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-semibold text-gray-900">{heading}</h1>
          <div className="flex gap-2">
            {readOnly ? (
              <>
                {access.updateAuth && (
                  <Button className={BUTTON_STYLES.primary} onClick={() => setScreen("edit")}>수정</Button>
                )}
                {access.deleteAuth && (
                  <Button className={BUTTON_STYLES.danger} onClick={remove}>삭제</Button>
                )}
                <Button className={BUTTON_STYLES.secondary} onClick={onBack}>목록</Button>
              </>
            ) : (
              <>
                <Button className={BUTTON_STYLES.save} onClick={submit} disabled={saving}>{saving ? "저장 중..." : "저장"}</Button>
                <Button className={BUTTON_STYLES.secondary} onClick={onBack} disabled={saving}>목록</Button>
              </>
            )}
          </div>
        </div>

        {/* 수금정보 영역 */}
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">수금정보</h2>
          <table className="w-full border border-gray-300 border-t-2 border-t-[#5B6FD8]" style={{ tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "15%" }} />
              <col style={{ width: "35%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "35%" }} />
            </colgroup>
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-2.5">거래처번호</td>
                <td className="border-r border-gray-300 px-4 py-2.5">
                  {renderReadOnlyInput(form.customerCode || "-")}
                </td>
                <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-2.5">
                  <span className="text-red-500">*</span>거래처명
                </td>
                <td className="px-4 py-2.5 border-r border-gray-200">
                  {readOnly ? (
                    <input value={form.customerName} disabled className={DETAIL_INPUT_CLS} />
                  ) : (
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        readOnly
                        value={form.customerName}
                        placeholder="거래처를 선택하세요"
                        onClick={() => setShowCustomerModal(true)}
                        className="w-full text-xs bg-white border border-gray-300 rounded px-3 py-2 pr-10 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#5B6FD8]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCustomerModal(true)}
                        className="absolute right-2 text-gray-500 hover:text-gray-700"
                      >
                        <Search size={18} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-2.5">매출액</td>
                <td className="border-r border-gray-300 px-4 py-2.5">
                  {renderReadOnlyInput(toWonLabel(form.totalAmt || 0))}
                </td>
                <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-2.5">수금액</td>
                <td className="px-4 py-2.5 border-r border-gray-200">
                  {renderReadOnlyInput(toWonLabel(form.totalCollectionAmt || 0))}
                </td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-2.5">잔액</td>
                <td className="border-r border-gray-300 px-4 py-2.5">
                  {renderReadOnlyInput(toWonLabel(form.balance || 0))}
                </td>
                <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-2.5">비고</td>
                <td className="px-4 py-2.5 border-r border-gray-200">
                  {readOnly ? (
                    <input value={form.remark || ""} disabled className={DETAIL_INPUT_CLS} />
                  ) : (
                    <input
                      value={form.remark || ""}
                      onChange={(e) => patchField("remark", e.target.value)}
                      className="bg-white text-xs border border-gray-300 rounded px-2 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-[#5B6FD8]"
                    />
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 출하내역 영역 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-700">출하내역</h2>
            {!readOnly && (
              <Button className={BUTTON_STYLES.primary + " !px-3 !py-1 text-xs"} onClick={openShipPicker}>추가</Button>
            )}
          </div>
          <div className="border border-gray-200 rounded-sm overflow-hidden">
            <div className="h-[350px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#4A5CC7]">
                    {COLLECTION_DETAIL_COLUMNS.map((col) => (
                      <th key={col.key} style={{ minWidth: col.width }} className="px-2 py-2 text-center text-xs font-semibold text-white whitespace-pre-line">
                        {col.label}
                      </th>
                    ))}
                    {!readOnly && <th className="px-2 py-2 text-center text-xs font-semibold text-white" style={{ width: "50px" }}></th>}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {form.details.length === 0 ? (
                    <tr><td colSpan={detailColSpan} className="px-3 py-6 text-center text-xs text-gray-500 border-r border-gray-200">출하실적을 추가해주세요.</td></tr>
                  ) : (
                    form.details.map((d, idx) => (
                      <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-3 py-2 text-xs text-gray-900 text-center border-r border-gray-200">{String(idx + 1).padStart(2, "0")}</td>
                        <td className="px-3 py-2 text-xs text-gray-900 text-center border-r border-gray-200">{d.shipDate}</td>
                        <td className="px-3 py-2 text-xs text-gray-900 text-right border-r border-gray-200">{toWonLabel(d.salesAmt || 0)}</td>
                        <td className="px-3 py-2 text-xs text-gray-900 text-right border-r border-gray-200">{toWonLabel(d.salesAccum || 0)}</td>
                        <td className="px-3 py-2 text-xs text-gray-900 text-center border-r border-gray-200">
                          {readOnly ? (
                            toWonLabel(d.collectionAmt || 0)
                          ) : (
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={d.collectionAmt || ""}
                              onChange={(e) => editDetailCell(idx, "collectionAmt", Number(e.target.value) || 0)}
                              className="w-24 text-xs text-right bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#5B6FD8]"
                            />
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-900 text-right border-r border-gray-200">{toWonLabel(d.collectionAccum || 0)}</td>
                        <td className="px-3 py-2 text-xs text-gray-900 text-right border-r border-gray-200">{toWonLabel(d.balance || 0)}</td>
                        <td className="px-3 py-2 text-xs text-gray-900 text-center border-r border-gray-200">
                          {readOnly ? d.remark : (
                            <input
                              type="text"
                              value={d.remark || ""}
                              onChange={(e) => editDetailCell(idx, "remark", e.target.value)}
                              className="w-full text-xs bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#5B6FD8]"
                            />
                          )}
                        </td>
                        {!readOnly && (
                          <td className="px-2 py-1.5 text-center border-r border-gray-200">
                            <button onClick={() => dropDetail(idx)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 거래처(고객사) 검색 모달 */}
      <ClientSelectDialog
        open={showCustomerModal}
        onOpenChange={setShowCustomerModal}
        onSelect={applyCustomer}
        filterType="고객사"
      />

      {/* 출하실적 선택 모달 (드래그 이동 가능) */}
      {shipPickerOpen && (
        <ShipResultPickerModal
          customerName={form.customerName}
          loading={shipOptionsLoading}
          options={shipOptions}
          isAlreadyAdded={(sr) => form.details.some(d => d.shipResultSq === sr.shipResultSq)}
          onPick={addShipResult}
          onClose={() => setShipPickerOpen(false)}
          offset={offset}
          onDragStart={beginDrag}
        />
      )}
    </div>
  );
}
