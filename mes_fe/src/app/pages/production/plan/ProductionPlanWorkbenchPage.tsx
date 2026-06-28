/** [생산관리 > 생산계획] 생산계획과 소요량산출을 두 탭으로 묶은 통합 화면.
 *  소요량산출은 계획 수립의 선행 계산 단계로, 같은 메뉴 안에서 바로 확인·반영한다. */
import { useState } from "react";
import { ProductionPlanBoardPage } from "./ProductionPlanBoardPage";
import { MaterialRequirementPage } from "../requirement/MaterialRequirementPage";

type Tab = "plan" | "requirement";

const TABS: { key: Tab; label: string }[] = [
  { key: "plan", label: "생산계획" },
  { key: "requirement", label: "소요량산출" },
];

export function ProductionPlanWorkbenchPage() {
  const [tab, setTab] = useState<Tab>("plan");

  return (
    <div>
      {/* 상단 탭 바 — 생산계획 수립과 선행 소요량산출을 전환한다 */}
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

      {tab === "plan" && <ProductionPlanBoardPage />}
      {tab === "requirement" && <MaterialRequirementPage />}
    </div>
  );
}
