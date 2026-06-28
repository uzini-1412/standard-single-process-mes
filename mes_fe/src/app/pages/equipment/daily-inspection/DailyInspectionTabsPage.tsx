/** [설비관리 > 일상점검] 점검표 정의서와 점검현황을 2개 탭으로 묶은 통합 화면. 각 탭은 기존 단일 화면을 그대로 렌더한다. */
import { useState } from "react";
import DailyInspectionPage from "./DailyInspectionPage";
import DailyInspectionResultPage from "../daily-inspection-result/DailyInspectionResultPage";

type InspectionTab = "definition" | "result";

const TABS: { key: InspectionTab; label: string }[] = [
  { key: "definition", label: "정의서" },
  { key: "result", label: "점검현황" },
];

export function DailyInspectionTabsPage() {
  const [tab, setTab] = useState<InspectionTab>("definition");

  return (
    <div>
      {/* 상단 탭 바 — 일상점검 정의서와 실제 점검현황을 전환한다 */}
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

      {tab === "definition" && <DailyInspectionPage />}
      {tab === "result" && <DailyInspectionResultPage />}
    </div>
  );
}
