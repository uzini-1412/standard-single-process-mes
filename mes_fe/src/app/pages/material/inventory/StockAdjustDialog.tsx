/** 재고수정 팝업: 대상 입고건을 라디오로 고르고 추가/감소 방향과 수량을 입력해 조정 적용. */
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { X } from "lucide-react";
import * as preReceivingApi from "../../../api/preReceivingApi";
import { MaterialInventoryData } from "@/types/material/inventory.interface";

const INBOUND_TABLE_HEADERS = [
  "선택",
  "발주번호",
  "구매 Lot-No",
  "자재 Lot-No",
  "가입고수량",
  "검사상태",
  "가입고일자",
];

/** 검사상태 코드를 한글 라벨로 변환 */
function inspectStatusLabel(status?: string) {
  if (status === "PASS") return "합격";
  if (status === "REJECT") return "불합격";
  if (status === "WAIT") return "대기";
  return status;
}

interface StockAdjustDialogProps {
  selectedItem: MaterialInventoryData;
  candidateInbounds: preReceivingApi.InboundRes[];
  targetInboundSq: number | null;
  targetInbound?: preReceivingApi.InboundRes;
  qtyInput: string;
  direction: "plus" | "minus";
  onSelectTarget: (sq: number | null) => void;
  onChangeQty: (value: string) => void;
  onChangeDirection: (value: "plus" | "minus") => void;
  onClose: () => void;
  onSave: () => void;
}

export function StockAdjustDialog({
  selectedItem,
  candidateInbounds,
  targetInboundSq,
  targetInbound,
  qtyInput,
  direction,
  onSelectTarget,
  onChangeQty,
  onChangeDirection,
  onClose,
  onSave,
}: StockAdjustDialogProps) {
  return (
    <div
      className="fixed inset-0 bg-black/20 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-[700px] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-[#5B6FD8]">
            재고수정 - {selectedItem.itemCode} ({selectedItem.itemName})
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4 flex-1 overflow-auto">
          <div className="text-xs font-medium text-gray-700 mb-2">조정할 입고 내역을 선택하세요</div>
          <div className="border border-gray-200 rounded-sm overflow-hidden mb-4">
            <table className="w-full">
              <thead>
                <tr className="bg-[#4A5CC7]">
                  {INBOUND_TABLE_HEADERS.map((header) => (
                    <th key={header} className="px-3 py-2 text-xs font-semibold text-white text-center">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {candidateInbounds.length === 0 ? (
                  <tr>
                    <td
                      colSpan={INBOUND_TABLE_HEADERS.length}
                      className="px-4 py-4 text-center text-xs text-gray-500 border-r border-gray-200"
                    >
                      입고 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  candidateInbounds.map((ib) => {
                    const isPicked = targetInboundSq === ib.inboundSq;
                    return (
                      <tr
                        key={ib.inboundSq}
                        onClick={() => onSelectTarget(ib.inboundSq)}
                        className={`border-t border-gray-200 hover:bg-gray-50 cursor-pointer ${isPicked ? "bg-blue-50" : ""}`}
                      >
                        <td className="px-3 py-2 text-center border-r border-gray-200">
                          <input
                            type="radio"
                            checked={isPicked}
                            onChange={() => onSelectTarget(ib.inboundSq)}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{ib.orderNo}</td>
                        <td className="px-3 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{ib.purchaseLotNo || "-"}</td>
                        <td className="px-3 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{ib.lotNo}</td>
                        <td className="px-3 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{ib.inboundQty}</td>
                        <td className="px-3 py-2 text-xs text-gray-700 text-center border-r border-gray-200">
                          {inspectStatusLabel(ib.inspectStatus)}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{ib.inboundDate}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {targetInbound && (
            <div className="space-y-3">
              <div className="text-xs font-medium text-gray-700">조정 수량 입력</div>
              <div className="flex items-center gap-3">
                <select
                  value={direction}
                  onChange={(e) => onChangeDirection(e.target.value as "plus" | "minus")}
                  className="h-9 px-3 border border-gray-300 rounded-md text-xs"
                >
                  <option value="plus">추가 (+)</option>
                  <option value="minus">감소 (-)</option>
                </select>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  value={qtyInput}
                  autoFocus
                  placeholder="수량 입력 (kg, 셋째 자리)"
                  className="flex-1 text-xs h-9"
                  onChange={(e) => onChangeQty(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSave();
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose} className="px-6 h-8 text-xs">취소</Button>
          <Button
            onClick={onSave}
            disabled={!targetInboundSq || !qtyInput || parseFloat(qtyInput) <= 0}
            className="bg-black hover:bg-gray-800 text-white px-6 h-8 text-xs disabled:bg-gray-300"
          >
            조정 적용
          </Button>
        </div>
      </div>
    </div>
  );
}
