import { useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { PAGE_LAYOUT_STYLES, BUTTON_STYLES } from "../../styles/button-styles";
import { PURCHASE_STATUS_COLUMNS } from "@/app/constants/management";
import { TradeStatementView } from "../shipping/shipping-order/TradeStatementView";
import { showWarning } from "@/app/utils/toast";
import { usePermission } from "../../context/UserContext";
import { ListTable, type ListColumn } from "../../components/common/ListTable";
import type { PurchaseLedgerMode } from "./PurchaseLedgerPage";
import {
  composeTradeStatementForm,
  makeGroupKey,
  ORDERABLE_FIELD_KEYS,
  toWonText,
  type NumberedPurchaseGroup,
} from "./purchaseLedgerHelpers";
import { usePurchaseLedger } from "./usePurchaseLedger";
import { usePurchaseGroupDetail } from "./usePurchaseGroupDetail";
import { PurchaseLedgerFilterBar } from "./PurchaseLedgerFilterBar";
import { PurchaseViewModeSelect } from "./PurchaseViewModeSelect";
import { PurchaseGroupDetailDialog } from "./PurchaseGroupDetailDialog";

type ScreenStage = "list" | "print";

interface Props {
  pageMode: PurchaseLedgerMode;
  onPageModeChange: (mode: PurchaseLedgerMode) => void;
}

export function PurchaseLedgerListPage({ pageMode, onPageModeChange }: Props) {
  const permission = usePermission("purchase-management");
  const [stage, setStage] = useState<ScreenStage>("list");

  const ledger = usePurchaseLedger();
  const detail = usePurchaseGroupDetail(ledger.buildBaseQuery);

  // 선택된 그룹이 있어야 거래명세서 발행 화면으로 넘어간다
  const goToTradeStatement = () => {
    if (!ledger.activeGroup) {
      showWarning("거래명세서를 발행할 항목을 목록에서 먼저 선택해주세요.");
      return;
    }
    setStage("print");
  };

  // 현재 선택된 그룹의 식별 키 (테이블 하이라이트용)
  const highlightedKey = ledger.activeGroup ? makeGroupKey(ledger.activeGroup) : null;

  // 표준 컬럼 + 상세 팝업 버튼 컬럼을 합친다
  const columns = useMemo<ListColumn<NumberedPurchaseGroup>[]>(() => {
    const baseColumns = PURCHASE_STATUS_COLUMNS.map((c) => ({
      key: c.key,
      label: c.label,
      width: c.width,
      sortable: ORDERABLE_FIELD_KEYS.has(c.key),
      ...(c.key === "purchaseAmount"
        ? {
            align: "right" as const,
            render: (row: NumberedPurchaseGroup) => toWonText(row.purchaseAmount || 0),
          }
        : {}),
    }));

    const detailColumn: ListColumn<NumberedPurchaseGroup> = {
      key: "_detail",
      label: "상세내역",
      width: "80px",
      render: (row: NumberedPurchaseGroup) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            void detail.open(row);
          }}
          className="bg-green-600 text-white text-[11px] px-2.5 py-0.5 rounded hover:bg-green-700"
        >
          팝업
        </button>
      ),
    };

    return [...baseColumns, detailColumn];
  }, [detail]);

  // 발행 단계에서는 거래명세서 화면으로 완전히 대체한다
  if (stage === "print" && ledger.activeGroup) {
    return (
      <TradeStatementView
        shipOrderSq={0}
        initialForm={composeTradeStatementForm(ledger.activeGroup, ledger.activeGroupItems)}
        onBack={() => setStage("list")}
      />
    );
  }

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-semibold text-gray-900">거래처원장</h1>
          {permission.createAuth && (
            <Button
              data-help="purchase-management-register"
              onClick={goToTradeStatement}
              className={BUTTON_STYLES.dark}
            >
              거래명세서 발행
            </Button>
          )}
        </div>

        <PurchaseViewModeSelect value={pageMode} onChange={onPageModeChange} />

        <PurchaseLedgerFilterBar
          helpKey="purchase-management-search"
          dateFrom={ledger.draftDateFrom}
          dateTo={ledger.draftDateTo}
          customerCode={ledger.draftCustomer}
          customerOptions={ledger.customerOptions}
          onDateFromChange={ledger.setDraftDateFrom}
          onDateToChange={ledger.setDraftDateTo}
          onCustomerChange={ledger.setDraftCustomer}
          onSearch={ledger.applySearch}
        />

        <div data-help="purchase-management-table">
          <ListTable
            columns={columns}
            rows={ledger.groups}
            isLoading={ledger.isFetching}
            rowKey={(row) => makeGroupKey(row)}
            onRowClick={ledger.selectGroup}
            highlightedKey={highlightedKey}
            sortField={ledger.orderField}
            sortDirection={ledger.orderDir}
            onSort={ledger.toggleOrder}
            emptyText="매입 데이터가 없습니다."
            height="calc(100vh - 320px)"
            pagination={{
              page: ledger.safePageIndex,
              size: ledger.pageSize,
              totalElements: ledger.totalElements,
              totalPages: ledger.totalPages,
              onPageChange: ledger.setPageIndex,
              onSizeChange: ledger.changePageSize,
            }}
          />
        </div>
      </div>

      {detail.targetGroup && (
        <PurchaseGroupDetailDialog
          group={detail.targetGroup}
          items={detail.items}
          isLoading={detail.isLoading}
          onClose={detail.close}
        />
      )}
    </div>
  );
}
