/** [자재관리 > 원소재사용현황] PLC 원소재 투입실적 조회와 표준(레시피) 대비 분석을 탭으로 제공. API: plcRawApi(/material/input) 외 workOrder/recipe/commonInfo. */
import { useState } from "react";
import { PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import { ConsumptionTab } from "./consumptionTypes";
import { useLineMachineOptions } from "./useLineMachineOptions";
import { useConsumptionMatrix } from "./useConsumptionMatrix";
import { useConsumptionAnalysis } from "./useConsumptionAnalysis";
import { useConsumptionDetail } from "./useConsumptionDetail";
import { ConsumptionMatrixTab } from "./ConsumptionMatrixTab";
import { ConsumptionAnalysisTab } from "./ConsumptionAnalysisTab";
import { ConsumptionDetailTab } from "./ConsumptionDetailTab";

const CONSUMPTION_TABS: { key: ConsumptionTab; label: string }[] = [
  { key: "input-analysis", label: "원소재투입분석" },
  { key: "input-analysis-detail", label: "원소재투입분석상세" },
  { key: "input-status", label: "원소재투입현황" },
];

export function RawMaterialConsumptionPage() {
  const [activeTab, setActiveTab] = useState<ConsumptionTab>("input-analysis");

  // 라인구분·PLC호기 옵션은 분석/상세 탭이 공유
  const { lineList, machineNameList } = useLineMachineOptions();

  const matrix = useConsumptionMatrix(activeTab);
  const analysis = useConsumptionAnalysis(activeTab, lineList, machineNameList);
  const detail = useConsumptionDetail(activeTab, lineList);

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">원소재사용현황</h1>
        </div>

        {/* 상단 탭 바 — 원소재투입분석/분석상세/투입현황 보기를 전환한다 */}
        <div className="flex gap-1 border-b border-gray-200 mb-6">
          {CONSUMPTION_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                activeTab === t.key
                  ? "border-[#4A5CC7] text-[#4A5CC7]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === "input-status" && <ConsumptionMatrixTab matrix={matrix} />}

        {activeTab === "input-analysis" && (
          <ConsumptionAnalysisTab analysis={analysis} lineList={lineList} />
        )}

        {activeTab === "input-analysis-detail" && (
          <ConsumptionDetailTab detail={detail} lineList={lineList} />
        )}
      </div>
    </div>
  );
}
