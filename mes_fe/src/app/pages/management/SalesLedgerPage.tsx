import { useState } from "react";
import { SalesLedgerListPage } from "./SalesLedgerListPage";
import { SalesTrendChartPage } from "./SalesTrendChartPage";

export type SalesViewMode = "list" | "trend";

// 매출현황을 목록/추이 두 모드로 전환하는 컨테이너
export function SalesLedgerPage() {
  const [currentView, setCurrentView] = useState<SalesViewMode>("list");

  if (currentView === "trend") {
    return <SalesTrendChartPage currentView={currentView} onViewChange={setCurrentView} />;
  }

  return <SalesLedgerListPage currentView={currentView} onViewChange={setCurrentView} />;
}
