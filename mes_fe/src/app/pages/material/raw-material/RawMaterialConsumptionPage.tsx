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

        {/* 탭 전환 드롭다운 */}
        <div className="mb-6">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as ConsumptionTab)}
            className="h-10 px-3 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5B6FD8]"
          >
            <option value="input-analysis">원소재투입분석</option>
            <option value="input-analysis-detail">원소재투입분석상세</option>
            <option value="input-status">원소재투입현황</option>
          </select>
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
