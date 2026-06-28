import { useState, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { X, GripVertical } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { BUTTON_STYLES } from "../../../styles/button-styles";
import { loadAvailableProductLots, AvailableLotRes } from "../../../api/productInventoryApi";
import { showWarning } from "@/app/utils/toast";
import { UNITS, withUnit } from "@/app/utils/unitConvert";
import { useDraggableModal } from "../../../hooks/useDraggableModal";

export interface LotAllocation {
  lotNo: string;
  qty: number;
}

interface LotSelectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemCode: string;
  itemName: string;
  // 모달 열릴 때 외부 폼에서 가져올 초기 출하지시량/할당. 사용자가 모달 내부에서 수정 가능.
  initialPlanQty?: string;
  initialAllocations?: LotAllocation[];
  // 수주수량 / 예약수량(누적 출하지시) — 잔여 검증용. 미전달 시 0 처리.
  salesOrderQty?: number;
  reservedQty?: number;
  // 출하계획 수량 (참고용 표시)
  planQty?: number;
  // onConfirm: 모달에서 확정된 LOT합/할당. force=true면 수주잔여 초과 등록 사용자 확인됨.
  onConfirm: (planQty: string, allocations: LotAllocation[], force: boolean) => void;
}

const toNum = (v: number | string | null | undefined): number => {
  if (v == null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return isNaN(n) ? 0 : n;
};

export function LotSelectModal({
  open,
  onOpenChange,
  itemCode,
  itemName,
  initialPlanQty = "",
  initialAllocations = [],
  salesOrderQty = 0,
  reservedQty = 0,
  planQty = 0,
  onConfirm,
}: LotSelectModalProps) {
  const [lots, setLots] = useState<AvailableLotRes[]>([]);
  const [loading, setLoading] = useState(false);
  // LOT별 입력 수량 (lotNo -> qty 문자열). 출하지시량 = SUM(LOT별 수량) 로 산출.
  const [qtyByLot, setQtyByLot] = useState<Record<string, string>>({});
  // 초과 등록 확인 모달
  const [overConfirmOpen, setOverConfirmOpen] = useState(false);

  // 드래그: 헤더를 잡고 모달을 옮기는 동작은 공용 훅에 위임한다.
  const { offset: modalPos, beginDrag: onDragStart, whileDrag: onDragMove, endDrag: onDragEnd, reset: resetDragPos } = useDraggableModal();

  useEffect(() => {
    if (!open) return;
    const initialMap: Record<string, string> = {};
    initialAllocations.forEach(a => { initialMap[a.lotNo] = String(a.qty); });
    setQtyByLot(initialMap);
    setOverConfirmOpen(false);
    resetDragPos();
    if (!itemCode) { setLots([]); return; }
    let cancelled = false;
    setLoading(true);
    loadAvailableProductLots({ itemCode })
      .then(list => { if (!cancelled) setLots(list); })
      .catch(() => { if (!cancelled) setLots([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, itemCode]);

  const totalSelected = useMemo(() => {
    return Object.values(qtyByLot).reduce((sum, v) => sum + toNum(v), 0);
  }, [qtyByLot]);

  // 수주잔여수량 = 수주수량 − 누적 출하지시(예약). 이게 본 모달의 cap.
  // (출하계획 수량은 참고용. 강제 일치 검증 제거.)
  const salesRemaining = Math.max(salesOrderQty - reservedQty, 0);
  const overflow = totalSelected - salesRemaining;
  const isOver = overflow > 0.0001;

  const handleQtyChange = (lotNo: string, value: string, availableQtyM: number) => {
    // 빈 값/숫자만 허용
    if (value !== "" && isNaN(Number(value))) return;
    const n = toNum(value);
    if (n > availableQtyM) {
      showWarning(`가용수량(${availableQtyM}m)을 초과할 수 없습니다.`);
      // 가용수량으로 잘라서 셋
      setQtyByLot(prev => ({ ...prev, [lotNo]: String(availableQtyM) }));
      return;
    }
    if (n < 0) return;
    setQtyByLot(prev => ({ ...prev, [lotNo]: value }));
  };

  // 실제 확정 (초과 확인 모달 거치고 나서 호출됨)
  const finalizeConfirm = (force: boolean) => {
    const allocations: LotAllocation[] = Object.entries(qtyByLot)
      .map(([lotNo, v]) => ({ lotNo, qty: toNum(v) }))
      .filter(a => a.qty > 0);
    // LOT합 = 출하지시량으로 채택. 외부 form은 더 이상 초기 planQty 강제 일치 검증 없음.
    onConfirm(String(totalSelected), allocations, force);
    onOpenChange(false);
  };

  const handleConfirm = () => {
    const allocations = Object.entries(qtyByLot)
      .map(([lotNo, v]) => ({ lotNo, qty: toNum(v) }))
      .filter(a => a.qty > 0);
    if (allocations.length === 0) {
      showWarning("LOT별 수량을 입력해주세요.");
      return;
    }
    if (totalSelected <= 0) {
      showWarning("LOT별 수량을 입력해주세요.");
      return;
    }
    if (isOver) {
      // 수주잔여 초과 → 확인 모달
      setOverConfirmOpen(true);
      return;
    }
    finalizeConfirm(false);
  };

  // 상단 요약 수치(수주/예약/잔여)는 라벨·값 쌍으로 기술해 한 번에 렌더한다.
  const summaryItems: Array<{ label: string; value: number }> = [
    { label: "수주수량", value: salesOrderQty },
    { label: "예약수량", value: reservedQty },
    { label: "수주잔여", value: salesRemaining },
  ];

  // LOT 한 행에 필요한 파생 수치(현재고/예약/가용/비활성)를 한 곳에서 계산한다.
  // 백엔드 미배포 등으로 availableQtyM 누락 시 (현재고 − 예약) 으로 폴백.
  type LotRow = { lot: AvailableLotRes; current: number; reserved: number; available: number; disabled: boolean };
  const toLotRow = (lot: AvailableLotRes): LotRow => {
    const current = toNum(lot.currentQtyM);
    const reserved = toNum(lot.reservedQtyM);
    const available = lot.availableQtyM != null ? toNum(lot.availableQtyM) : Math.max(current - reserved, 0);
    return { lot, current, reserved, available, disabled: available <= 0 };
  };

  // LOT 목록 표의 컬럼 정의. td 클래스는 셀 값에 따라 색이 바뀌는 칸이 있어 함수로도 받는다.
  const CELL = "px-3 py-2 text-xs whitespace-nowrap border-r border-gray-200";
  const lotColumns: Array<{
    header: ReactNode;
    tdClassName: string | ((r: LotRow) => string);
    content: (r: LotRow) => ReactNode;
  }> = [
    { header: "LOT 번호", tdClassName: `${CELL} text-gray-900 text-center`, content: (r) => r.lot.lotNo },
    { header: withUnit("현재고", UNITS.length), tdClassName: `${CELL} text-gray-900 text-right`, content: (r) => r.current },
    {
      header: withUnit("예약수량", UNITS.length),
      tdClassName: (r) => `${CELL} text-right ${r.reserved > 0 ? "text-orange-600" : "text-gray-900"}`,
      content: (r) => r.reserved,
    },
    {
      header: withUnit("가용수량", UNITS.length),
      tdClassName: (r) => `${CELL} text-right ${r.available > 0 ? "text-[#4A5CC7] font-semibold" : "text-gray-400"}`,
      content: (r) => r.available,
    },
    { header: "보관위치", tdClassName: `${CELL} text-gray-700 text-center`, content: (r) => r.lot.storageLoc || "-" },
    { header: "최근입고일", tdClassName: `${CELL} text-gray-700 text-center`, content: (r) => r.lot.lastInDate || "-" },
    {
      header: withUnit("선택수량", UNITS.length),
      tdClassName: "px-3 py-2 text-xs whitespace-nowrap",
      content: (r) => (
        <Input
          type="number"
          value={qtyByLot[r.lot.lotNo] ?? ""}
          onChange={(e) => handleQtyChange(r.lot.lotNo, e.target.value, r.available)}
          disabled={r.disabled}
          placeholder={r.disabled ? "가용 없음" : `최대 ${r.available}`}
          className="bg-white text-xs border border-gray-300 focus-visible:ring-1 focus-visible:ring-[#5B6FD8] text-right disabled:bg-gray-100"
        />
      ),
    },
  ];

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/20 z-50"
      onClick={() => onOpenChange(false)}
      onMouseMove={onDragMove}
      onMouseUp={onDragEnd}
    >
      <div
        className="absolute bg-white rounded-lg shadow-xl w-[860px] max-h-[85vh] flex flex-col"
        style={{ left: `calc(50% + ${modalPos.x}px - 430px)`, top: `calc(50% + ${modalPos.y}px - 280px)` }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 (드래그 가능) */}
        <div
          className="flex items-center justify-between px-6 py-3 border-b border-gray-200 cursor-move select-none"
          onMouseDown={onDragStart}
        >
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-[#5B6FD8]">
              제품 LOT 선택 — {itemCode}{itemName ? ` / ${itemName}` : ""}
            </h2>
          </div>
          <button onClick={() => onOpenChange(false)} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 본문 */}
        <div className="px-6 py-4 flex-1 overflow-auto">
          {/* 수주수량 / 예약수량(누적출하지시) / 수주잔여 / LOT 합계 — 한 줄 텍스트 표시.
              출하계획수량은 참고용 회색 보조 라인. */}
          <div className="mb-1 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
            {summaryItems.map((it) => (
              <span key={it.label}><span className="text-[#4A5CC7] font-semibold">{withUnit(it.label, UNITS.length)} : </span>{it.value}</span>
            ))}
            <span><span className="text-[#4A5CC7] font-semibold">{withUnit("LOT 합계", UNITS.length)} : </span>
              <span className={isOver ? "text-red-500 font-semibold" : "text-gray-800"}>{totalSelected}</span>
              {isOver && <span className="text-red-500 ml-1">(초과 +{overflow.toFixed(2)}m)</span>}
            </span>
          </div>
          {planQty > 0 && (
            <div className="mb-3 text-[11px] text-gray-400">출하계획수량(참고): {planQty}m</div>
          )}

          {/* LOT 목록 */}
          <div className="border border-gray-200 rounded-sm overflow-hidden">
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#4A5CC7] border-b border-gray-200">
                    {lotColumns.map((col, ci) => (
                      <th
                        key={ci}
                        className={"px-3 py-2 text-center text-xs font-semibold text-white tracking-wider whitespace-nowrap" + (ci < lotColumns.length - 1 ? " border-r border-white" : "")}
                      >
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {loading ? (
                    <tr><td colSpan={lotColumns.length} className="px-4 py-8 text-center text-sm text-gray-500">로딩 중...</td></tr>
                  ) : lots.length === 0 ? (
                    <tr><td colSpan={lotColumns.length} className="px-4 py-8 text-center text-sm text-gray-500">가용 LOT가 없습니다.</td></tr>
                  ) : lots.map((lot) => {
                    const row = toLotRow(lot);
                    return (
                      <tr key={lot.lotNo} className="border-b border-gray-200 hover:bg-blue-50/30">
                        {lotColumns.map((col, ci) => (
                          <td key={ci} className={typeof col.tdClassName === "function" ? col.tdClassName(row) : col.tdClassName}>
                            {col.content(row)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex justify-end gap-2 px-6 py-3 border-t border-gray-200">
          <Button onClick={() => onOpenChange(false)} className={BUTTON_STYLES.secondary + " h-9"}>취소</Button>
          <Button onClick={handleConfirm} className={BUTTON_STYLES.save + " h-9"}>확인</Button>
        </div>
      </div>

      {/* 수주잔여 초과 등록 확인 모달 (확인=force 등록, 취소=재입력) */}
      {overConfirmOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-[60] flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded-lg shadow-xl w-[420px] p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-red-600 mb-3">수주잔여수량 초과</h3>
            <div className="text-xs text-gray-700 leading-6 mb-4">
              {([
                ["수주수량", `${salesOrderQty}m`, "font-semibold"],
                ["예약수량(누적 출하지시)", `${reservedQty}m`, "font-semibold"],
                ["수주잔여", `${salesRemaining}m`, "font-semibold"],
                ["입력 LOT 합계", `${totalSelected}m`, "font-semibold text-red-600"],
              ] as const).map(([label, value, valueClass]) => (
                <div key={label}>{label}: <span className={valueClass}>{value}</span></div>
              ))}
              <div className="mt-2 text-red-600">초과분: +{overflow.toFixed(2)}m</div>
              <div className="mt-3 text-gray-600">초과한 상태로 등록하시겠습니까?</div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => setOverConfirmOpen(false)}
                className={BUTTON_STYLES.secondary + " h-9"}
              >취소</Button>
              <Button
                onClick={() => { setOverConfirmOpen(false); finalizeConfirm(true); }}
                className={BUTTON_STYLES.save + " h-9"}
              >확인</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
