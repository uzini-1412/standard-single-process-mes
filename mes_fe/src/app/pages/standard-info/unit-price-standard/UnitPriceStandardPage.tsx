import { useState } from "react";
import { UnitPriceStandardListPage } from "./UnitPriceStandardListPage";
import { UnitPriceStandardRegisterPage } from "./UnitPriceStandardRegisterPage";
import { UnitPriceStandardDetailPage } from "./UnitPriceStandardDetailPage";
import { UnitPriceHistoryPage } from "./UnitPriceHistoryPage";
import { UnitPricePageMode, UnitPriceViewType } from "@/types/standard-info/unit_price.interface";
import { deleteUnitPriceList } from "../../../api/unitPriceStandardApi";
import { showSuccess, showError } from "@/app/utils/toast";
import { showConfirm } from "@/app/utils/confirm";

const UNIT_PRICE_TABS: { key: UnitPricePageMode; label: string }[] = [
  { key: "standard", label: "단가기준" },
  { key: "history", label: "단가이력" },
];

export default function UnitPriceStandardPage() {
  const [pageMode, setPageMode] = useState<UnitPricePageMode>("standard");
  const [viewType, setViewType] = useState<UnitPriceViewType>("list");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // 목록으로 복귀하는 공통 동작 (등록/저장/취소가 모두 사용)
  const goToList = () => setViewType("list");

  const openRegister = () => {
    setSelectedId(null);
    setViewType("register");
  };

  const openDetail = (id: number) => {
    setSelectedId(id);
    setViewType("detail");
  };

  const switchPageMode = (mode: UnitPricePageMode) => {
    setPageMode(mode);
    setViewType("list");
  };

  const removeSelected = async () => {
    if (selectedId == null) return;

    const confirmed = await showConfirm("삭제하시겠습니까?");
    if (!confirmed) return;

    try {
      await deleteUnitPriceList([selectedId]);
      showSuccess("삭제되었습니다.");
      setSelectedId(null);
      setViewType("list");
    } catch (error) {
      console.error("Failed to delete:", error);
      showError("삭제 중 오류가 발생했습니다.");
    }
  };

  switch (viewType) {
    case "register":
      return <UnitPriceStandardRegisterPage onBack={goToList} onSave={goToList} />;
    case "edit":
      return selectedId ? (
        <UnitPriceStandardRegisterPage selectedId={selectedId} onBack={goToList} onSave={goToList} />
      ) : null;
    case "detail":
      return selectedId ? (
        <UnitPriceStandardDetailPage
          selectedId={selectedId}
          onBack={goToList}
          onEdit={() => setViewType("edit")}
          onDelete={removeSelected}
        />
      ) : null;
  }

  return (
    <div>
      {/* 상단 탭 바 — 단가기준/단가이력 보기를 전환한다 */}
      <div className="flex gap-1 border-b border-gray-200 px-3 pt-2 bg-white">
        {UNIT_PRICE_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => switchPageMode(t.key)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              pageMode === t.key
                ? "border-[#4A5CC7] text-[#4A5CC7]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {pageMode === "history" ? (
        <UnitPriceHistoryPage />
      ) : (
        <UnitPriceStandardListPage onRegister={openRegister} onRowClick={openDetail} />
      )}
    </div>
  );
}
