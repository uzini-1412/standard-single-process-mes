/** [설비관리 > 설비이력] 이력관리와 이력카드를 2개 탭으로 묶은 통합 화면. 각 탭은 기존 단일 화면을 그대로 렌더한다. */
import { useState } from "react";
import EquipmentHistoryPage from "./EquipmentHistoryPage";
import EquipmentHistoryCardPage from "../equipment-history-card/EquipmentHistoryCardPage";

type HistoryTab = "manage" | "card";

const TABS: { key: HistoryTab; label: string }[] = [
  { key: "manage", label: "이력관리" },
  { key: "card", label: "이력카드" },
];

export function EquipmentHistoryTabsPage() {
  const [tab, setTab] = useState<HistoryTab>("manage");

  return (
    <div>
      {/* 상단 탭 바 — 설비이력 관리 화면과 이력카드 보기를 전환한다 */}
      <div className="flex gap-1 border-b border-gray-200 px-3 pt-2 bg-white">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? "border-[#4A5CC7] text-[#4A5CC7]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "manage" && <EquipmentHistoryPage />}
      {tab === "card" && <EquipmentHistoryCardPage />}
    </div>
  );
}
