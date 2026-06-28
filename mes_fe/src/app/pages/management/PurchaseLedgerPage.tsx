import { useState } from "react";
import { PurchaseLedgerListPage } from "./PurchaseLedgerListPage";
import { PurchaseTrendChartPage } from "./PurchaseTrendChartPage";

export type PurchaseLedgerMode = "list" | "trend";

// 매입 목록과 추이 차트를 콤보 선택에 따라 번갈아 보여주는 컨테이너
export function PurchaseLedgerPage() {
  const [viewMode, setViewMode] = useState<PurchaseLedgerMode>("list");

  if (viewMode === "trend") {
    return <PurchaseTrendChartPage pageMode={viewMode} onPageModeChange={setViewMode} />;
  }
  return <PurchaseLedgerListPage pageMode={viewMode} onPageModeChange={setViewMode} />;
}
