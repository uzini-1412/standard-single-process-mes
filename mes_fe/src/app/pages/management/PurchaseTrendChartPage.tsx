import { PAGE_LAYOUT_STYLES } from "../../styles/button-styles";
import type { PurchaseLedgerMode } from "./PurchaseLedgerPage";
import { usePurchaseTrend } from "./usePurchaseTrend";
import { PurchaseLedgerFilterBar } from "./PurchaseLedgerFilterBar";
import { PurchaseViewModeSelect } from "./PurchaseViewModeSelect";
import { PurchaseTrendChart } from "./PurchaseTrendChart";
import { PurchaseTrendTable } from "./PurchaseTrendTable";

interface Props {
  pageMode: PurchaseLedgerMode;
  onPageModeChange: (mode: PurchaseLedgerMode) => void;
}

export function PurchaseTrendChartPage({ pageMode, onPageModeChange }: Props) {
  const trend = usePurchaseTrend();

  // 보조 표는 로딩이 끝나고 데이터가 있을 때만 노출
  const showTable = !trend.isFetching && trend.series.length > 0;

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-semibold text-gray-900">거래처원장</h1>
        </div>

        <PurchaseViewModeSelect value={pageMode} onChange={onPageModeChange} />

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
