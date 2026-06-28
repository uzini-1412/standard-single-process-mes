/** [자재관리 > 자재재고현황] 입고 데이터를 집계한 자재재고 목록 + 품목별 이력 + 재고수정 팝업. API: preReceivingApi(/material/inbound/inventory-*). */
import { useState } from "react";
import { Button } from "../../../components/ui/button";
import { PAGE_LAYOUT_STYLES, BUTTON_STYLES } from "../../../styles/button-styles";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import { ListTable } from "../../../components/common/ListTable";
import { usePermission } from "../../../context/UserContext";
import { MaterialInventoryData } from "@/types/material/inventory.interface";
import { STOCK_TABLE_COLUMNS } from "./stockListColumns";
import { useStockList } from "./useStockList";
import { useStockHistory } from "./useStockHistory";
import { useStockAdjust } from "./useStockAdjust";
import { StockHistorySection } from "./StockHistorySection";
import { StockAdjustDialog } from "./StockAdjustDialog";

export function MaterialStockListPage() {
  const perm = usePermission("material-inventory-status");

  // 행 클릭으로 선택된 품목 (이력/수정 팝업의 기준)
  const [selectedItem, setSelectedItem] = useState<MaterialInventoryData | null>(null);

  const stock = useStockList();
  const history = useStockHistory(selectedItem);
  const adjust = useStockAdjust({
    selectedItem,
    onAdjusted: stock.reloadPage,
    onRefreshHistory: () => {
      if (selectedItem) handleRowClick(selectedItem);
    },
  });

  // 표 행 클릭 → 선택 품목 갱신 + 이력 첫 페이지로 이동
  const handleRowClick = (item: MaterialInventoryData) => {
    setSelectedItem(item);
    history.setHistoryPage(0);
  };

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className={`flex items-center justify-between ${PAGE_LAYOUT_STYLES.headerMargin}`}>
          <h1 className="text-2xl font-semibold text-gray-900">자재재고현황</h1>
          <div className="flex items-center gap-2">
            <Button onClick={stock.exportExcel} className={BUTTON_STYLES.primary}>엑셀출력</Button>
          </div>
        </div>

        <div data-help="material-inventory-status-search" className="bg-gray-50 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-4">
            <InputWithLabel label="품번" value={stock.itemCodeInput} onChange={stock.setItemCodeInput} />
            <InputWithLabel label="품명" value={stock.itemNameInput} onChange={stock.setItemNameInput} />
            <Button onClick={stock.applySearch} className={BUTTON_STYLES.search}>검색</Button>
          </div>
        </div>

        <div data-help="material-inventory-status-table" className="mb-4">
          <ListTable
            columns={STOCK_TABLE_COLUMNS}
            rows={stock.rows}
            isLoading={stock.isFetching}
            rowKey={(row) => row.itemCode}
            onRowClick={handleRowClick}
            highlightedKey={selectedItem?.itemCode ?? null}
            sortField={stock.sortField}
            sortDirection={stock.sortDirection}
            onSort={stock.toggleSort}
            height="calc(100vh - 400px)"
            pagination={{
              page: stock.safePage,
              size: stock.size,
              totalElements: stock.totalElements,
              totalPages: stock.totalPages,
              onPageChange: stock.setPage,
              onSizeChange: (s) => {
                stock.setSize(s);
                stock.setPage(0);
              },
            }}
          />
        </div>

        <StockHistorySection
          selectedItem={selectedItem}
          historyRows={history.historyRows}
          isHistoryLoading={history.isHistoryLoading}
          historySafePage={history.historySafePage}
          historySize={history.historySize}
          historyTotal={history.historyTotal}
          historyTotalPages={history.historyTotalPages}
          onPageChange={history.setHistoryPage}
          onSizeChange={(s) => {
            history.setHistorySize(s);
            history.setHistoryPage(0);
          }}
        />
      </div>

      {adjust.isDialogOpen && selectedItem && (
        <StockAdjustDialog
          selectedItem={selectedItem}
          candidateInbounds={adjust.candidateInbounds}
          targetInboundSq={adjust.targetInboundSq}
          targetInbound={adjust.targetInbound}
          qtyInput={adjust.qtyInput}
          direction={adjust.direction}
          onSelectTarget={adjust.setTargetInboundSq}
          onChangeQty={adjust.setQtyInput}
          onChangeDirection={adjust.setDirection}
          onClose={() => adjust.setDialogOpen(false)}
          onSave={adjust.save}
        />
      )}
    </div>
  );
}
