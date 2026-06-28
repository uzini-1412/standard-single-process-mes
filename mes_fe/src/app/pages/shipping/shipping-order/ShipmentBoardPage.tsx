/** [출하관리 > 출하지시] 출하계획과 출하지시를 두 탭으로 묶은 통합 화면. 계획 → 지시의 연속 흐름을 한 화면에서 처리한다. */
import { useState } from "react";
import { DispatchPlanBoardPage } from "../shipping-plan/DispatchPlanBoardPage";
import { ShipmentOrderBoardPage } from "./ShipmentOrderBoardPage";

type Tab = "plan" | "order";

const TABS: { key: Tab; label: string }[] = [
  { key: "plan", label: "출하계획" },
  { key: "order", label: "출하지시" },
];

export function ShipmentBoardPage() {
  const [tab, setTab] = useState<Tab>("plan");

  return (
    <div>
      {/* 상단 탭 바 — 출하계획 수립 → 출하지시 발행의 흐름을 전환한다 */}
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

      {tab === "plan" && <DispatchPlanBoardPage />}
      {tab === "order" && <ShipmentOrderBoardPage />}
    </div>
  );
}
