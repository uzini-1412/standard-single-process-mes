/** [출하관리 > 제품재고분석] 완제품 재고를 폭별/기간별로 분석해 보여줌. API: productInventoryApi(/api/product-stock). */
import { Button } from "../../../components/ui/button";
import { PAGE_LAYOUT_STYLES, BUTTON_STYLES } from "../../../styles/button-styles";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import { ListTable } from "../../../components/common/ListTable";
import { useClientPagedList } from "../../../hooks/useClientPagedList";
import { ANALYSIS_GRID_COLUMNS } from "./stockAnalysisUtils";
import { useFinishedGoodsStockAnalysis } from "./useFinishedGoodsStockAnalysis";

export function FinishedGoodsStockAnalysisPage() {
  const { isFetching, filters, setFilters, visibleRows, fetchAnalysisRows, downloadExcel } =
    useFinishedGoodsStockAnalysis();

  const { pagedRows, pagination } = useClientPagedList(visibleRows);

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">제품재고분석</h1>
          <Button onClick={downloadExcel} className={BUTTON_STYLES.primary}>
            엑셀출력
          </Button>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center" style={{ minWidth: "200px" }}>
              <div className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 h-9 flex items-center whitespace-nowrap rounded-l-md border border-gray-300">
                기준월
              </div>
              <input
                type="month"
                value={filters.baseMonth}
                onChange={(e) => setFilters((prev) => ({ ...prev, baseMonth: e.target.value }))}
                className="h-9 px-3 bg-white border border-l-0 border-gray-300 rounded-r-md text-xs focus:outline-none focus:ring-2 focus:ring-[#5B6FD8] flex-1"
              />
            </div>
            <InputWithLabel
              label="품번"
              value={filters.itemCode}
              onChange={(v) => setFilters((prev) => ({ ...prev, itemCode: v }))}
            />
            <InputWithLabel
              label="품명"
              value={filters.itemName}
              onChange={(v) => setFilters((prev) => ({ ...prev, itemName: v }))}
            />
            <Button onClick={fetchAnalysisRows} className={BUTTON_STYLES.search}>
              검색
            </Button>
          </div>
        </div>

        <ListTable
          columns={ANALYSIS_GRID_COLUMNS}
          rows={pagedRows}
          isLoading={isFetching}
          rowKey={(_row, index) => index}
          pagination={pagination}
          height="calc(100vh - 280px)"
        />
      </div>
    </div>
  );
}
