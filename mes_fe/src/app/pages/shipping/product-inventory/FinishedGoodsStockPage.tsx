/** [출하관리 > 제품재고현황] 완제품 현재고와 입출고이력(누적재고)을 함께 조회. API: productInventoryApi(/api/product-stock). */
import { useState } from "react";
import { Button } from "../../../components/ui/button";
import { PAGE_LAYOUT_STYLES, BUTTON_STYLES } from "../../../styles/button-styles";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import { SelectWithLabel } from "../../../components/common/SelectWithLabel";
import { ProductInventoryData } from "@/types/shipping/inventory.interface";
import { ListTable } from "../../../components/common/ListTable";
import { STOCK_GRID_COLUMNS } from "./stockHistoryUtils";
import { useFinishedGoodsStock } from "./useFinishedGoodsStock";
import { useStockMovementHistory } from "./useStockMovementHistory";
import { StockMovementHistoryTable } from "./StockMovementHistoryTable";

export function FinishedGoodsStockPage() {
  const {
    rows,
    totalElements,
    totalPages,
    isFetching,
    draftFilters,
    setDraftFilters,
    productTypeChoices,
    pageIndex,
    setPageIndex,
    pageSize,
    setPageSize,
    clampedPage,
    applySearch,
    downloadExcel,
  } = useFinishedGoodsStock();

  // 상단 그리드에서 선택한 품목 → 하단 입출고 이력의 조회 대상
  const [focusedItem, setFocusedItem] = useState<ProductInventoryData | null>(null);

  const {
    historyRows,
    historyTotalElements,
    historyTotalPages,
    setHistoryPageIndex,
    historyPageSize,
    setHistoryPageSize,
    isHistoryFetching,
    clampedHistoryPage,
  } = useStockMovementHistory(focusedItem);

  // 행 선택 시 해당 품목으로 이력 첫 페이지부터 다시 조회
  const handleRowSelect = (item: ProductInventoryData) => {
    setFocusedItem(item);
    setHistoryPageIndex(0);
  };

  const focusedKey = focusedItem ? `${focusedItem.itemCode}|${focusedItem.width}` : null;

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">제품재고현황</h1>
          <Button onClick={downloadExcel} className={BUTTON_STYLES.primary}>
            엑셀출력
          </Button>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 mb-4" data-help="product-inventory-search">
          <div className="flex items-center gap-3">
            <div className="flex items-center" style={{ minWidth: "200px" }}>
              <div className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 h-9 flex items-center whitespace-nowrap rounded-l-md border border-gray-300">
                기준월
              </div>
              <input
                type="month"
                value={draftFilters.baseMonth}
                onChange={(e) => setDraftFilters((prev) => ({ ...prev, baseMonth: e.target.value }))}
                className="h-9 px-3 bg-white border border-l-0 border-gray-300 rounded-r-md text-xs focus:outline-none focus:ring-2 focus:ring-[#5B6FD8] flex-1"
              />
            </div>
            <InputWithLabel
              label="품번"
              value={draftFilters.itemCode}
              onChange={(v) => setDraftFilters((prev) => ({ ...prev, itemCode: v }))}
            />
            <InputWithLabel
              label="품명"
              value={draftFilters.itemName}
              onChange={(v) => setDraftFilters((prev) => ({ ...prev, itemName: v }))}
            />
            <SelectWithLabel
              label="제품구분"
              value={draftFilters.itemType}
              onChange={(v) => setDraftFilters((prev) => ({ ...prev, itemType: v }))}
              options={productTypeChoices.map((t) => ({ value: t, label: t }))}
            />
            <Button onClick={applySearch} className={BUTTON_STYLES.search}>
              검색
            </Button>
          </div>
        </div>

        {/* 상단: 완제품 현재고 그리드 */}
        <div className="mb-4" data-help="product-inventory-table">
          <ListTable
            columns={STOCK_GRID_COLUMNS}
            rows={rows}
            isLoading={isFetching}
            rowKey={(row) => `${row.itemCode}|${row.width}`}
            onRowClick={handleRowSelect}
            highlightedKey={focusedKey}
            height="calc((100vh - 280px) * 2 / 3)"
            pagination={{
              page: clampedPage,
              size: pageSize,
              totalElements,
              totalPages,
              onPageChange: setPageIndex,
              onSizeChange: (s) => {
                setPageSize(s);
                setPageIndex(0);
              },
            }}
          />
        </div>

        {/* 하단: 선택 품목의 입출고 이력 + 누적재고 */}
        <StockMovementHistoryTable
          focusedItem={focusedItem}
          historyRows={historyRows}
          isHistoryFetching={isHistoryFetching}
          clampedHistoryPage={clampedHistoryPage}
          historyPageSize={historyPageSize}
          historyTotalElements={historyTotalElements}
          historyTotalPages={historyTotalPages}
          onHistoryPageChange={setHistoryPageIndex}
          onHistorySizeChange={(s) => {
            setHistoryPageSize(s);
            setHistoryPageIndex(0);
          }}
        />
      </div>
    </div>
  );
}
