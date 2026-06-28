import { useState } from "react";
import { InventoryAdjustmentListPage } from "./InventoryAdjustmentListPage";
import { InventoryAdjustmentRegisterPage } from "./InventoryAdjustmentRegisterPage";
import { InventoryAdjustmentDetailPage } from "./InventoryAdjustmentDetailPage";
import { InventoryAdjustmentViewMode } from "@/types/standard-info/inventory.interface";
import { deleteInventoryAdjustment } from "../../../api/inventoryAdjustmentApi";
import { showSuccess, showError } from "@/app/utils/toast";
import { showConfirm } from "@/app/utils/confirm";

export default function InventoryAdjustmentPage() {
  const [viewMode, setViewMode] = useState<InventoryAdjustmentViewMode>("list");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // 목록으로 복귀할 때는 선택 상태도 함께 비운다.
  const resetToList = () => {
    setSelectedId(null);
    setViewMode("list");
  };

  const openDetail = (id: number) => {
    setSelectedId(id);
    setViewMode("detail");
  };

  const removeAdjustment = async () => {
    if (!selectedId) return;
    if (!(await showConfirm("삭제하시겠습니까?"))) return;

    try {
      await deleteInventoryAdjustment([selectedId]);
      showSuccess("삭제되었습니다.");
      resetToList();
    } catch (error) {
      console.error("Failed to delete:", error);
      showError("삭제 중 오류가 발생했습니다.");
    }
  };

  if (viewMode === "register") {
    return (
      <InventoryAdjustmentRegisterPage onBack={resetToList} onSave={resetToList} />
    );
  }

  if (viewMode === "detail" && selectedId) {
    return (
      <InventoryAdjustmentDetailPage
        selectedId={selectedId}
        onBack={resetToList}
        onDelete={removeAdjustment}
      />
    );
  }

  return (
    <InventoryAdjustmentListPage
      onView={openDetail}
      onRegister={() => setViewMode("register")}
    />
  );
}
