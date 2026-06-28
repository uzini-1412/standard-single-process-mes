import { useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { PAGE_LAYOUT_STYLES, BUTTON_STYLES } from "../../styles/button-styles";
import { SALES_STATUS_COLUMNS } from "@/app/constants/management";
import { TradeStatementView } from "../shipping/shipping-order/TradeStatementView";
import { showWarning } from "@/app/utils/toast";
import { usePermission } from "../../context/UserContext";
import { ListTable, type ListColumn } from "../../components/common/ListTable";
import type { SalesViewMode } from "./SalesLedgerPage";
import { useSalesLedgerList, type LedgerRow } from "./useSalesLedgerList";
import { useSalesDetailPopup } from "./useSalesDetailPopup";
import { SalesSearchBar } from "./SalesSearchBar";
import { SalesViewSwitch } from "./SalesViewSwitch";
import { SalesDetailDialog } from "./SalesDetailDialog";
import { ORDERABLE_FIELDS, groupRowKey, toWonText, composeTradeStatementDraft } from "./salesLedgerHelpers";

type ScreenStage = "list" | "print";

interface SalesLedgerListPageProps {
  currentView: SalesViewMode;
  onViewChange: (mode: SalesViewMode) => void;
}

export function SalesLedgerListPage({ currentView, onViewChange }: SalesLedgerListPageProps) {
  const permission = usePermission("sales-management");
  const [stage, setStage] = useState<ScreenStage>("list");

  const ledger = useSalesLedgerList();
  const popup = useSalesDetailPopup(ledger.composeBaseParams);

  // 거래명세서 발행 버튼: 먼저 행 선택을 강제
  const goToStatement = () => {
    if (!ledger.pickedGroup) {
      showWarning("거래명세서를 발행할 항목을 목록에서 먼저 선택해주세요.");
      return;
    }
    setStage("print");
  };

  const columns: ListColumn<LedgerRow>[] = useMemo(
    () => [
      ...SALES_STATUS_COLUMNS.map((c) => ({
        key: c.key,
        label: c.label,
        width: c.width,
        sortable: ORDERABLE_FIELDS.has(c.key),
        ...(c.key === "salesAmount"
          ? { align: "right" as const, render: (row: LedgerRow) => toWonText(row.salesAmount || 0) }
          : {}),
      })),
      {
        key: "_detail",
        label: "상세내역",
        width: "80px",
        render: (row: LedgerRow) => (
          <button
            className="bg-green-600 text-white text-[11px] px-2.5 py-0.5 rounded hover:bg-green-700"
            onClick={(e) => {
              e.stopPropagation();
              void popup.open(row);
            }}
          >
            팝업
          </button>
        ),
      },
    ],
    [popup],
  );

  const highlightKey = ledger.pickedGroup ? groupRowKey(ledger.pickedGroup) : null;

  if (stage === "print" && ledger.pickedGroup) {
    return (
      <TradeStatementView
        shipOrderSq={ledger.pickedGroup.shipOrderSq || 0}
        initialForm={composeTradeStatementDraft(ledger.pickedGroup, ledger.pickedItems)}
        onBack={() => setStage("list")}
      />
    );
  }

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        {/* 제목과 발행 버튼 */}
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-semibold text-gray-900">매출현황</h1>
          {permission.createAuth && (
            <Button data-help="sales-management-register" className={BUTTON_STYLES.dark} onClick={goToStatement}>
              거래명세서 발행
            </Button>
          )}
        </div>

        <SalesViewSwitch value={currentView} onChange={onViewChange} />

        <SalesSearchBar
          helpKey="sales-management-search"
          dateFrom={ledger.draftFrom}
          dateTo={ledger.draftTo}
          customerCode={ledger.draftCustomer}
          customerOptions={ledger.customerOptions}
          onDateFromChange={ledger.setDraftFrom}
          onDateToChange={ledger.setDraftTo}
          onCustomerChange={ledger.setDraftCustomer}
          onSearch={ledger.applySearch}
        />

        {/* 그룹 요약 표 */}
        <div data-help="sales-management-table">
          <ListTable
            columns={columns}
            rows={ledger.rows}
            isLoading={ledger.isFetching}
            rowKey={(row) => groupRowKey(row)}
            onRowClick={ledger.selectGroup}
            highlightedKey={highlightKey}
            sortField={ledger.orderBy}
            sortDirection={ledger.orderDir}
            onSort={ledger.toggleOrder}
            emptyText="매출 데이터가 없습니다."
            height="calc(100vh - 320px)"
            pagination={{
              page: ledger.clampedPage,
              size: ledger.pageSize,
              totalElements: ledger.totalElements,
              totalPages: ledger.totalPages,
              onPageChange: ledger.setPageIndex,
              onSizeChange: ledger.changeSize,
            }}
          />
        </div>
      </div>

      {popup.target && (
        <SalesDetailDialog
          group={popup.target}
          items={popup.items}
          loading={popup.isLoading}
          onClose={popup.close}
        />
      )}
    </div>
  );
}
