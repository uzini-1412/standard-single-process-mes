import { useState } from "react";
import { SalesLedgerListPage } from "./SalesLedgerListPage";
import { SalesTrendChartPage } from "./SalesTrendChartPage";

export type SalesViewMode = "list" | "trend";

const SALES_LEDGER_TABS: { key: SalesViewMode; label: string }[] = [
  { key: "list", label: "매출목록" },
  { key: "trend", label: "매출추이" },
];

// 매출현황을 목록/추이 두 탭으로 전환하는 컨테이너
export function SalesLedgerPage() {
  const [currentView, setCurrentView] = useState<SalesViewMode>("list");

  return (
    <div>
      {/* 상단 탭 바 — 매출 목록/추이 보기를 전환한다 */}
      <div className="flex gap-1 border-b border-gray-200 px-3 pt-2 bg-white">
        {SALES_LEDGER_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setCurrentView(t.key)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              currentView === t.key
                ? "border-[#4A5CC7] text-[#4A5CC7]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {currentView === "list" && <SalesLedgerListPage />}
      {currentView === "trend" && <SalesTrendChartPage />}
    </div>
  );
}
