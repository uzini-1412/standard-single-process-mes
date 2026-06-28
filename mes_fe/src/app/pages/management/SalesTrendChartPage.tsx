import { PAGE_LAYOUT_STYLES } from "../../styles/button-styles";
import type { SalesViewMode } from "./SalesLedgerPage";
import { useSalesTrend } from "./useSalesTrend";
import { SalesSearchBar } from "./SalesSearchBar";
import { SalesViewSwitch } from "./SalesViewSwitch";
import { SalesTrendChart } from "./SalesTrendChart";
import { SalesTrendTable } from "./SalesTrendTable";

interface SalesTrendChartPageProps {
  currentView: SalesViewMode;
  onViewChange: (mode: SalesViewMode) => void;
}

export function SalesTrendChartPage({ currentView, onViewChange }: SalesTrendChartPageProps) {
  const trend = useSalesTrend();
  const showTable = !trend.isFetching && trend.series.length > 0;

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        {/* 제목 */}
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-semibold text-gray-900">매출현황</h1>
        </div>

        <SalesViewSwitch value={currentView} onChange={onViewChange} />

        <SalesSearchBar
          dateFrom={trend.draftFrom}
          dateTo={trend.draftTo}
          customerCode={trend.draftCustomer}
          customerOptions={trend.customerOptions}
          onDateFromChange={trend.setDraftFrom}
          onDateToChange={trend.setDraftTo}
          onCustomerChange={trend.setDraftCustomer}
          onSearch={trend.applySearch}
        />

        <SalesTrendChart
          series={trend.series}
          loading={trend.isFetching}
          seriesLabel={trend.seriesLabel}
          total={trend.grandTotal}
        />

        {showTable && (
          <SalesTrendTable
            pagedRows={trend.pagedSeries}
            total={trend.grandTotal}
            totalCount={trend.series.length}
            totalPages={trend.totalPages}
            page={trend.clampedPage}
            size={trend.pageSize}
            loading={trend.isFetching}
            onPageChange={trend.setPageIndex}
            onSizeChange={trend.changeSize}
          />
        )}
      </div>
    </div>
  );
}
