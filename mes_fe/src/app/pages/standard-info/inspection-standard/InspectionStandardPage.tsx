import { useState } from "react";
import { IncomingInspectionListPage } from "./incoming-inspection/IncomingInspectionListPage";
import { IncomingInspectionRegisterPage } from "./incoming-inspection/IncomingInspectionRegisterPage";
import { IncomingInspectionDetailPage } from "./incoming-inspection/IncomingInspectionDetailPage";
import { FrequentInspectionListPage } from "./frequent-inspection/FrequentInspectionListPage";
import { FrequentInspectionRegisterPage } from "./frequent-inspection/FrequentInspectionRegisterPage";
import { FrequentInspectionDetailPage } from "./frequent-inspection/FrequentInspectionDetailPage";
import { ShippingInspectionListPage } from "./shipping-inspection/ShippingInspectionListPage";
import { ShippingInspectionRegisterPage } from "./shipping-inspection/ShippingInspectionRegisterPage";
import { ShippingInspectionDetailPage } from "./shipping-inspection/ShippingInspectionDetailPage";
import { deleteIncomingInspection } from "../../../api/incomingInspectionApi";
import { deleteFrequentInspection } from "../../../api/frequentInspectionApi";
import { deleteShippingInspection } from "../../../api/shippingInspectionApi";
import { showSuccess, showError } from "@/app/utils/toast";
import { showConfirm } from "@/app/utils/confirm";

type InspectionType = "incoming" | "frequent" | "shipping";
type ViewMode = "list" | "register" | "detail" | "edit";

const INSPECTION_TYPE_TABS: { key: InspectionType; label: string }[] = [
  { key: "incoming", label: "입고검사" },
  { key: "frequent", label: "자주검사" },
  { key: "shipping", label: "출하검사" },
];

/**
 * 검사유형(입고/자주/출하)별 List/Register/Detail 컴포넌트 + 삭제 API 묶음.
 * 세 유형이 동일한 화면 전환 흐름을 공유하므로 한 곳에 모아 분기를 데이터로 처리한다.
 */
const INSPECTION_SCREENS: Record<
  InspectionType,
  {
    List: typeof IncomingInspectionListPage;
    Register: typeof IncomingInspectionRegisterPage;
    Detail: typeof IncomingInspectionDetailPage;
    remove: (ids: number[]) => Promise<unknown>;
  }
> = {
  incoming: {
    List: IncomingInspectionListPage,
    Register: IncomingInspectionRegisterPage,
    Detail: IncomingInspectionDetailPage,
    remove: deleteIncomingInspection,
  },
  frequent: {
    List: FrequentInspectionListPage,
    Register: FrequentInspectionRegisterPage,
    Detail: FrequentInspectionDetailPage,
    remove: deleteFrequentInspection,
  },
  shipping: {
    List: ShippingInspectionListPage,
    Register: ShippingInspectionRegisterPage,
    Detail: ShippingInspectionDetailPage,
    remove: deleteShippingInspection,
  },
};

export default function InspectionStandardPage() {
  const [inspectionType, setInspectionType] = useState<InspectionType>("incoming");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const goList = () => setViewMode("list");

  const handleInspectionTypeChange = (type: InspectionType) => {
    setInspectionType(type);
    setViewMode("list");
    setSelectedId(null);
  };

  const handleRowClick = (id: number) => {
    setSelectedId(id);
    setViewMode("detail");
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!(await showConfirm("삭제하시겠습니까?"))) return;
    try {
      await INSPECTION_SCREENS[inspectionType].remove([selectedId]);
      showSuccess("삭제되었습니다.");
      setViewMode("list");
      setSelectedId(null);
    } catch (error) {
      console.error("Failed to delete:", error);
      showError("삭제 중 오류가 발생했습니다.");
    }
  };

  const { List, Register, Detail } = INSPECTION_SCREENS[inspectionType];

  if (viewMode === "register" || viewMode === "edit") {
    return (
      <Register
        mode={viewMode === "edit" ? "edit" : "create"}
        selectedId={viewMode === "edit" ? (selectedId ?? undefined) : undefined}
        onBack={goList}
        onSave={goList}
      />
    );
  }

  if (viewMode === "detail" && selectedId) {
    return (
      <Detail
        selectedId={selectedId}
        onBack={goList}
        onEdit={() => setViewMode("edit")}
        onDelete={handleDelete}
      />
    );
  }

  return (
    <div>
      {/* 상단 탭 바 — 입고/자주/출하검사 표준서 화면을 전환한다 */}
      <div className="flex gap-1 border-b border-gray-200 px-3 pt-2 bg-white">
        {INSPECTION_TYPE_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => handleInspectionTypeChange(t.key)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              inspectionType === t.key
                ? "border-[#4A5CC7] text-[#4A5CC7]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <List onRegister={() => setViewMode("register")} onRowClick={handleRowClick} />
    </div>
  );
}
