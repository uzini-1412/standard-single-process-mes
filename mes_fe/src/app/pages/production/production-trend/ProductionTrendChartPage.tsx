/** [생산관리 > 생산추이도] 라인·월 단위 생산 추이 차트 화면. API: workResultApi(/api/production/result/trend*). */
import { Button } from "../../../components/ui/button";
import { PAGE_LAYOUT_STYLES, BUTTON_STYLES } from "../../../styles/button-styles";
import { ListPageHeader } from "../../../components/common/ListPageHeader";
import { ListSearchFilter } from "../../../components/common/ListSearchFilter";
import { SelectWithLabel } from "../../../components/common/SelectWithLabel";
import { showWarning } from "@/app/utils/toast";
import { useProductionTrend } from "./useProductionTrend";
import { downloadTrendExcel } from "./trendChartExport";
import { TrendLineChart } from "./TrendLineChart";
import { TrendDataTable } from "./TrendDataTable";

export function ProductionTrendChartPage() {
  const {
    yearOptions,
    draftYear,
    setDraftYear,
    committedYear,
    isLoading,
    matrix,
    activeLines,
    chartSeries,
    lineTotals,
    monthlyTotals,
    commitYear,
  } = useProductionTrend();

  const exportToExcel = () => {
    if (activeLines.length === 0) {
      showWarning("출력할 데이터가 없습니다.");
      return;
    }
    downloadTrendExcel({
      activeLines,
      matrix,
      lineTotals,
      monthlyTotals,
      year: committedYear,
    });
  };

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <ListPageHeader
          title="생산분석"
          actions={
            <Button className={BUTTON_STYLES.primary} onClick={exportToExcel}>
              엑셀출력
            </Button>
          }
        />

        <ListSearchFilter onSearch={commitYear}>
          <SelectWithLabel
            label="연도"
            value={draftYear}
            onChange={setDraftYear}
            options={yearOptions}
          />
        </ListSearchFilter>

        <div className="bg-white border border-gray-300 rounded-md p-4 mb-4">
          <div className="text-center font-semibold text-gray-800 mb-2">
            생산길이 (m)
          </div>
          <div style={{ width: "100%", height: 360 }}>
            <TrendLineChart
              isLoading={isLoading}
              activeLines={activeLines}
              chartSeries={chartSeries}
            />
          </div>
        </div>

        <TrendDataTable
          isLoading={isLoading}
          activeLines={activeLines}
          matrix={matrix}
          lineTotals={lineTotals}
          monthlyTotals={monthlyTotals}
        />
      </div>
    </div>
  );
}
