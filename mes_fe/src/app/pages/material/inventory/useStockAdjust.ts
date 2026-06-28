/** 재고수정 팝업 훅: 대상 입고내역 로드, 조정 방향/수량 입력 관리, 조정 저장 후 목록·이력 갱신. */
import { useState } from "react";
import * as preReceivingApi from "../../../api/preReceivingApi";
import { MaterialInventoryData } from "@/types/material/inventory.interface";
import { showSuccess, showWarning, showError } from "@/app/utils/toast";

type AdjustDirection = "plus" | "minus";

interface UseStockAdjustParams {
  selectedItem: MaterialInventoryData | null;
  onAdjusted: () => void | Promise<void>;
  onRefreshHistory: () => void;
}

export function useStockAdjust({ selectedItem, onAdjusted, onRefreshHistory }: UseStockAdjustParams) {
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [candidateInbounds, setCandidateInbounds] = useState<preReceivingApi.InboundRes[]>([]);
  const [targetInboundSq, setTargetInboundSq] = useState<number | null>(null);
  const [qtyInput, setQtyInput] = useState("");
  const [direction, setDirection] = useState<AdjustDirection>("plus");

  // 표에서 선택한 품목의 입고건(REGISTER만) 불러와 팝업 오픈
  const openDialog = async () => {
    if (!selectedItem) {
      showWarning("수정할 자재재고 항목을 표에서 먼저 선택해주세요.");
      return;
    }
    if (!selectedItem.itemSq) {
      showWarning("품목 정보가 없어 수정 팝업을 열 수 없습니다.");
      return;
    }
    try {
      const inbounds = await preReceivingApi.loadInboundsByItem(selectedItem.itemSq);
      setCandidateInbounds(inbounds.filter((ib) => ib.inboundType !== "ADJUST"));
      setTargetInboundSq(null);
      setQtyInput("");
      setDirection("plus");
      setDialogOpen(true);
    } catch (error) {
      console.error("Failed to load inbounds:", error);
      showError("입고 내역을 불러오는 중 오류가 발생했습니다.");
    }
  };

  const targetInbound = candidateInbounds.find((ib) => ib.inboundSq === targetInboundSq);

  const save = async () => {
    if (!targetInboundSq || !qtyInput) return;
    const parsed = parseFloat(qtyInput);
    if (isNaN(parsed) || parsed <= 0) {
      showWarning("조정 수량을 올바르게 입력해주세요.");
      return;
    }
    // PLC g 단위 호환을 위해 소수 셋째 자리에서 반올림
    const qty = Math.round(parsed * 1000) / 1000;

    if (!targetInbound) return;
    const signedQty = direction === "minus" ? -qty : qty;

    try {
      await preReceivingApi.persistInbounds([
        {
          inboundSq: null,
          orderDtlSq: targetInbound.orderDtlSq,
          itemSq: targetInbound.itemSq,
          inboundDate: new Date().toISOString().split("T")[0],
          inboundQty: signedQty,
          remark: `재고조정 (${direction === "plus" ? "추가" : "감소"} ${qty})`,
          writerId: "admin",
          inboundType: "ADJUST",
          lotNo: targetInbound.lotNo,
          purchaseLotNo: targetInbound.purchaseLotNo,
        },
      ]);

      showSuccess("재고가 조정되었습니다.");
      setDialogOpen(false);
      await onAdjusted();
      if (selectedItem) {
        setTimeout(() => onRefreshHistory(), 300);
      }
    } catch (error) {
      console.error("Error adjusting stock:", error);
      showError("재고 조정 중 오류가 발생했습니다.");
    }
  };

  return {
    isDialogOpen,
    setDialogOpen,
    candidateInbounds,
    targetInboundSq,
    setTargetInboundSq,
    targetInbound,
    qtyInput,
    setQtyInput,
    direction,
    setDirection,
    openDialog,
    save,
  };
}
