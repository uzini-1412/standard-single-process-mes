/** [자재관리 > 입고현황] 가입고 내역을 현황으로 조회·검색하고 엑셀/라벨 출력. API: preReceivingApi(/material/inbound/list 겸용). */
import { Button } from "../../../components/ui/button";
import { PAGE_LAYOUT_STYLES, BUTTON_STYLES } from "../../../styles/button-styles";
import { DateRangePickerWithLabel } from "../../../components/common/DateRangePickerWithLabel";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import { ListPageHeader } from "../../../components/common/ListPageHeader";
import { ListSearchFilter } from "../../../components/common/ListSearchFilter";
import { ListTable } from "../../../components/common/ListTable";
import { LabelPrintDialog } from "../../../components/features/material/LabelPrintDialog";
import { RECEIPT_TABLE_COLUMNS } from "./receiptListColumns";
import { buildLabelTargets } from "./receiptListHelpers";
import { useReceiptList } from "./useReceiptList";

export function MaterialReceiptListPage() {
  const {
    search,
    tableRows,
    isFetching,
    checkedKeys,
    pagination,
    selectedRows,
    isLabelDialogOpen,
    setLabelDialogOpen,
    reload,
    toggleRow,
    toggleAll,
    exportExcel,
    openLabelDialog,
  } = useReceiptList();

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <ListPageHeader
          title="입고현황"
          actions={
            <div className="flex items-center gap-2">
              <Button onClick={exportExcel} className={BUTTON_STYLES.primary}>엑셀출력</Button>
              <Button onClick={openLabelDialog} className={BUTTON_STYLES.primary}>라벨출력</Button>
            </div>
          }
        />

        <div data-help="receiving-status-search">
          <ListSearchFilter onSearch={reload}>
            <DateRangePickerWithLabel
              label="입고일자"
              dateFrom={search.fromDate}
              dateTo={search.toDate}
              onDateFromChange={search.setFromDate}
              onDateToChange={search.setToDate}
            />
            <InputWithLabel label="거래처명" value={search.clientKeyword} onChange={search.setClientKeyword} />
            <InputWithLabel label="발주번호" value={search.purchaseNoKeyword} onChange={search.setPurchaseNoKeyword} />
            <InputWithLabel label="품번" value={search.itemCodeKeyword} onChange={search.setItemCodeKeyword} />
            <InputWithLabel label="품명" value={search.itemNameKeyword} onChange={search.setItemNameKeyword} />
          </ListSearchFilter>
        </div>

        <div data-help="receiving-status-table">
          <ListTable
            columns={RECEIPT_TABLE_COLUMNS}
            rows={tableRows}
            isLoading={isFetching}
            rowKey={(row) => row.no}
            selectable
            selectedKeys={checkedKeys}
            onToggleRow={(key) => toggleRow(key as number)}
            onToggleAll={toggleAll}
            onRowClick={(row) => toggleRow(row.no)}
            pagination={pagination}
            minWidth="1400px"
          />
        </div>
      </div>

      <LabelPrintDialog
        open={isLabelDialogOpen}
        onOpenChange={setLabelDialogOpen}
        items={buildLabelTargets(selectedRows)}
      />
    </div>
  );
}
