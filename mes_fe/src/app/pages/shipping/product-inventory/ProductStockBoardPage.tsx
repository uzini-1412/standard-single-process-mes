/** [출하관리 > 제품재고] 완제품 재고를 현황/분석/창고입고 3개 탭으로 묶은 통합 화면. 각 탭은 기존 단일 화면을 그대로 렌더한다. */
import { useState } from "react";
import { FinishedGoodsStockPage } from "./FinishedGoodsStockPage";
import { FinishedGoodsStockAnalysisPage } from "../product-inventory-analysis/FinishedGoodsStockAnalysisPage";
import { FinishedGoodsLocationPage } from "../product-location/FinishedGoodsLocationPage";

type StockTab = "stock" | "analysis" | "location";

const TABS: { key: StockTab; label: string }[] = [
  { key: "stock", label: "재고현황" },
  { key: "analysis", label: "재고분석" },
  { key: "location", label: "창고입고" },
];

export function ProductStockBoardPage() {
  const [tab, setTab] = useState<StockTab>("stock");

  return (
    <div>
      {/* 상단 탭 바 — 같은 제품재고 데이터의 세 가지 보기를 전환한다 */}
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

      {tab === "stock" && <FinishedGoodsStockPage />}
      {tab === "analysis" && <FinishedGoodsStockAnalysisPage />}
      {tab === "location" && <FinishedGoodsLocationPage />}
    </div>
  );
}
