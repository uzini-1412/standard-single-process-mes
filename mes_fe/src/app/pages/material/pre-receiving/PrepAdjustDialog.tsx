/** 가입고 수량 조정 팝업: 대상 정보 표 + 추가/감소 수량 입력. Enter로 즉시 적용. */
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { X } from "lucide-react";
import { LIST_TABLE_STYLES } from "@/app/styles/button-styles";
import { handleNonNegativeNumberChange, preventNegativeKey } from "@/app/utils/numericInput";
import * as preReceivingApi from "../../../api/preReceivingApi";

interface PrepAdjustDialogProps {
  target: preReceivingApi.InboundRes;
  type: "plus" | "minus";
  qty: string;
  onChangeQty: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export function PrepAdjustDialog({ target, type, qty, onChangeQty, onClose, onSave }: PrepAdjustDialogProps) {
  const actionLabel = type === "plus" ? "추가" : "감소";

  return (
    <div
      className="fixed inset-0 bg-black/20 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-[500px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-[#5B6FD8]">가입고 수량 {actionLabel}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="border border-gray-200 rounded-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className={LIST_TABLE_STYLES.headerRow}>
                  <th className="px-4 py-2 text-xs font-semibold text-white text-center">발주번호</th>
                  <th className="px-4 py-2 text-xs font-semibold text-white text-center">품명</th>
                  <th className="px-4 py-2 text-xs font-semibold text-white text-center">자재 Lot-No</th>
                  <th className="px-4 py-2 text-xs font-semibold text-white text-center">현재 수량</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{target.orderNo}</td>
                  <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{target.itemName}</td>
                  <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{target.lotNo}</td>
                  <td className="px-4 py-2 text-xs text-gray-700 text-center font-medium border-r border-gray-200">{target.inboundQty}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-700 w-20 shrink-0">{actionLabel} 수량</span>
            <Input
              type="number"
              step="1"
              min="0"
              value={qty}
              autoFocus
              placeholder="수량 입력"
              className="flex-1"
              onChange={(e) => handleNonNegativeNumberChange(e.target.value, onChangeQty)}
              onKeyDown={(e) => {
                preventNegativeKey(e);
                if (e.key === "Enter") onSave();
              }}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose} className="px-6 h-8 text-xs">취소</Button>
          <Button
            onClick={onSave}
            disabled={!qty || parseInt(qty, 10) <= 0}
            className="bg-black hover:bg-gray-800 text-white px-6 h-8 text-xs disabled:bg-gray-300"
          >
            {actionLabel} 적용
          </Button>
        </div>
      </div>
    </div>
  );
}
