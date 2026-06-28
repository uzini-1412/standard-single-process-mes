/** [설비관리 > 일상점검] 항목정의(기준)와 점검현황(실시결과)을 두 탭으로 묶은 통합 화면. 각 탭은 기존 단일 화면을 그대로 렌더한다. */
import { useState } from "react";
import DailyInspectionPage from "./DailyInspectionPage";
import DailyInspectionResultPage from "../daily-inspection-result/DailyInspectionResultPage";

type Tab = "define" | "result";

const TABS: { key: Tab; label: string }[] = [
  { key: "define", label: "항목정의" },
  { key: "result", label: "점검현황" },
];

export default function DailyInspectionBoardPage() {
  const [tab, setTab] = useState<Tab>("define");

  return (
    <div>
      {/* 상단 탭 바 — 점검 기준 정의와 실시 현황을 전환한다 */}
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

      {tab === "define" && <DailyInspectionPage />}
      {tab === "result" && <DailyInspectionResultPage />}
    </div>
  );
}
