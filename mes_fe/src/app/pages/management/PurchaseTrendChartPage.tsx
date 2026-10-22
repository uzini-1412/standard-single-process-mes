import { PAGE_LAYOUT_STYLES } from "../../styles/button-styles";
import { usePurchaseTrend } from "./usePurchaseTrend";
import { PurchaseLedgerFilterBar } from "./PurchaseLedgerFilterBar";
import { PurchaseTrendChart } from "./PurchaseTrendChart";
import { PurchaseTrendTable } from "./PurchaseTrendTable";

export function PurchaseTrendChartPage() {
  const trend = usePurchaseTrend();

  // 보조 표는 로딩이 끝나고 데이터가 있을 때만 노출
  const showTable = !trend.isFetching && trend.series.length > 0;

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-semibold text-gray-900">매입현황</h1>
        </div>

        <PurchaseLedgerFilterBar
          dateFrom={trend.draftDateFrom}
          dateTo={trend.draftDateTo}
          customerCode={trend.draftCustomer}
          customerOptions={trend.customerOptions}
          onDateFromChange={trend.setDraftDateFrom}
          onDateToChange={trend.setDraftDateTo}
          onCustomerChange={trend.setDraftCustomer}
          onSearch={trend.applySearch}
        />

        <PurchaseTrendChart
          series={trend.series}
          seriesLabel={trend.seriesLabel}
          totalAmount={trend.totalAmount}
          isLoading={trend.isFetching}
        />

        {showTable && (
          <PurchaseTrendTable
            pagedSeries={trend.pagedSeries}
            totalAmount={trend.totalAmount}
            totalElements={trend.series.length}
            totalPages={trend.totalPages}
            pageIndex={trend.pageIndex}
            pageSize={trend.pageSize}
            isLoading={trend.isFetching}
            onPageChange={trend.setPageIndex}
            onSizeChange={trend.changePageSize}
          />
        )}
      </div>
    </div>
  );
}
