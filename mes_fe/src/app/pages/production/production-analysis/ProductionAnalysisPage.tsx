/** [생산관리 > 생산분석] 불량/비가동/생산추이를 3개 탭으로 묶은 통합 화면. 각 탭은 기존 단일 화면을 그대로 렌더한다. */
import { useState } from "react";
import { ProductionDefectBoardPage } from "../product-defect/ProductionDefectBoardPage";
import { DowntimeStatusBoardPage } from "../non-operation/DowntimeStatusBoardPage";
import { ProductionTrendChartPage } from "../production-trend/ProductionTrendChartPage";

type AnalysisTab = "defect" | "downtime" | "trend";

const TABS: { key: AnalysisTab; label: string }[] = [
  { key: "defect", label: "불량현황" },
  { key: "downtime", label: "비가동현황" },
  { key: "trend", label: "생산추이" },
];

export function ProductionAnalysisPage() {
  const [tab, setTab] = useState<AnalysisTab>("defect");

  return (
    <div>
      {/* 상단 탭 바 — 같은 생산 데이터의 세 가지 분석 보기를 전환한다 */}
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

      {tab === "defect" && <ProductionDefectBoardPage />}
      {tab === "downtime" && <DowntimeStatusBoardPage />}
      {tab === "trend" && <ProductionTrendChartPage />}
    </div>
  );
}
