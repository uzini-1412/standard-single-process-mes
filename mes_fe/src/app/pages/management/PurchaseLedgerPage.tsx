import { useState } from "react";
import { PurchaseLedgerListPage } from "./PurchaseLedgerListPage";
import { PurchaseTrendChartPage } from "./PurchaseTrendChartPage";

export type PurchaseLedgerMode = "list" | "trend";

const PURCHASE_LEDGER_TABS: { key: PurchaseLedgerMode; label: string }[] = [
  { key: "list", label: "매입목록" },
  { key: "trend", label: "매입추이" },
];

// 매입 목록과 추이 차트를 탭으로 번갈아 보여주는 컨테이너
export function PurchaseLedgerPage() {
  const [viewMode, setViewMode] = useState<PurchaseLedgerMode>("list");

  return (
    <div>
      {/* 상단 탭 바 — 매입 목록/추이 보기를 전환한다 */}
      <div className="flex gap-1 border-b border-gray-200 px-3 pt-2 bg-white">
        {PURCHASE_LEDGER_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setViewMode(t.key)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              viewMode === t.key
                ? "border-[#4A5CC7] text-[#4A5CC7]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {viewMode === "list" && <PurchaseLedgerListPage />}
      {viewMode === "trend" && <PurchaseTrendChartPage />}
    </div>
  );
}
