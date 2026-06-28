import { X, GripVertical } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { toWonLabel } from "./receivablesFormat";
import type { ShipResultOption } from "@/types/management/collection.interface";

// 출하실적 표 헤더 라벨(좌→우 순서).
const SHIP_COLUMN_HEADERS = ["Lot-No", "출하일", "품번", "품명", "출하수량", "단가", "매출액"];

interface Props {
  customerName: string;
  loading: boolean;
  options: ShipResultOption[];
  // 이미 추가된 출하실적인지 판정하는 함수.
  isAlreadyAdded: (sr: ShipResultOption) => boolean;
  onPick: (sr: ShipResultOption) => void;
  onClose: () => void;
  // 드래그로 옮긴 누적 위치 오프셋.
  offset: { x: number; y: number };
  onDragStart: (e: React.MouseEvent) => void;
}

// 거래처별 출하실적을 골라 출하내역에 추가하는, 드래그 이동이 가능한 모달.
export function ShipResultPickerModal({
  customerName, loading, options, isAlreadyAdded,
  onPick, onClose, offset, onDragStart,
}: Props) {
  return (
    <div className="fixed inset-0 bg-black/20 z-50" onClick={onClose}>
      <div
        className="absolute bg-white rounded-lg shadow-xl w-[750px] max-h-[80vh] flex flex-col"
        style={{ left: `calc(50% + ${offset.x}px - 375px)`, top: `calc(50% + ${offset.y}px - 250px)` }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-6 py-3 border-b border-gray-200 cursor-move select-none"
          onMouseDown={onDragStart}
        >
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-[#5B6FD8]">출하실적 선택 — {customerName}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-3 flex-1 overflow-auto">
          {loading ? (
            <div className="text-center py-8 text-xs text-gray-500">로딩 중...</div>
          ) : options.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-500">해당 거래처의 출하실적이 없습니다.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-[#4A5CC7]">
                  {SHIP_COLUMN_HEADERS.map(h => (
                    <th key={h} className="px-3 py-2 text-xs font-semibold text-white text-center">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {options.map((sr) => {
                  const added = isAlreadyAdded(sr);
                  return (
                    <tr
                      key={sr.shipResultSq}
                      onClick={() => !added && onPick(sr)}
                      className={`border-t border-gray-200 ${added ? "bg-gray-100 text-gray-400" : "hover:bg-blue-50 cursor-pointer"}`}
                    >
                      <td className="px-3 py-2.5 text-xs text-center font-mono border-r border-gray-200">{sr.lotNo}</td>
                      <td className="px-3 py-2.5 text-xs text-center border-r border-gray-200">{sr.shipDate}</td>
                      <td className="px-3 py-2.5 text-xs text-center border-r border-gray-200">{sr.itemCode}</td>
                      <td className="px-3 py-2.5 text-xs text-center border-r border-gray-200">{sr.itemName}</td>
                      <td className="px-3 py-2.5 text-xs text-right border-r border-gray-200">{Number(sr.shippedQty || 0).toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-xs text-right border-r border-gray-200">{toWonLabel(sr.unitPrice || 0)}</td>
                      <td className="px-3 py-2.5 text-xs text-right font-medium border-r border-gray-200">{toWonLabel(sr.salesAmt || 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-gray-200">
          <Button variant="outline" onClick={onClose} className="px-6 h-7 text-xs">닫기</Button>
        </div>
      </div>
    </div>
  );
}
