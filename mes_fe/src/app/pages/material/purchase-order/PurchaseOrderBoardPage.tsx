/** [자재관리 > 발주관리] 발주 목록 — 검색/조회/엑셀 및 등록·상세 화면 전환. 출처: purchaseOrderApi.ts(/api/purchase-order). */
import { useState } from "react";
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES } from "../../../styles/button-styles";
import { DateRangePickerWithLabel } from "../../../components/common/DateRangePickerWithLabel";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import { ListPageHeader } from "../../../components/common/ListPageHeader";
import { ListSearchFilter } from "../../../components/common/ListSearchFilter";
import { ListTable } from "../../../components/common/ListTable";
import { useClientPagedList } from "../../../hooks/useClientPagedList";
import { usePermission } from "../../../context/UserContext";
import type { PurchaseOrderViewMode } from "@/types/material/purchaseorder.intergace";
import { PurchaseOrderViewPage } from "./PurchaseOrderViewPage";
import { PurchaseOrderEntryPage } from "./PurchaseOrderEntryPage";
import { usePurchaseOrderBoard } from "./usePurchaseOrderBoard";
import {
  PURCHASE_ORDER_TABLE_COLUMNS,
  exportPurchaseOrders,
} from "./purchaseOrderBoardColumns";

interface PurchaseOrderBoardPageProps {
  onNavigateToRegister?: () => void;
}

export function PurchaseOrderBoardPage({ onNavigateToRegister }: PurchaseOrderBoardPageProps) {
  const perm = usePermission("purchase-order-status");
  const { isLoading, filteredRows, reload, search } = usePurchaseOrderBoard();

  // 목록/상세/수정 화면 전환 상태.
  const [viewMode, setViewMode] = useState<PurchaseOrderViewMode>("list");
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);

  // 페이지 단위로 잘린 행에 화면 일련번호를 다시 매긴다.
  const { pagedRows, baseNo, pagination } = useClientPagedList(filteredRows);
  const numberedRows = pagedRows.map((row, idx) => ({ ...row, no: baseNo + idx + 1 }));

  // 상세 화면.
  if (viewMode === "detail" && activeOrderId) {
    return (
      <PurchaseOrderViewPage
        id={activeOrderId}
        onBack={() => {
          setViewMode("list");
          void reload();
        }}
        onNavigateToEdit={(id) => {
          setActiveOrderId(id);
          setViewMode("edit");
        }}
      />
    );
  }

  // 수정 화면.
  if (viewMode === "edit" && activeOrderId) {
    return (
      <PurchaseOrderEntryPage
        mode="edit"
        selectedId={activeOrderId}
        onBack={() => {
          setViewMode("list");
          void reload();
        }}
        onRegister={() => setViewMode("detail")}
      />
    );
  }

  // 목록 화면.
  return (
    <div className="p-3">
      <div className="bg-white rounded-lg p-3">
        <ListPageHeader
          title="발주관리"
          actions={
            <div className="flex items-center gap-2">
              <Button className={BUTTON_STYLES.primary} onClick={() => exportPurchaseOrders(filteredRows)}>
                엑셀출력
              </Button>
              {perm.createAuth && (
                <Button
                  data-help="purchase-order-status-register"
                  className={BUTTON_STYLES.register}
                  onClick={onNavigateToRegister}
                >
                  발주등록
                </Button>
              )}
            </div>
          }
        />

        <div data-help="purchase-order-status-search">
          <ListSearchFilter onSearch={reload}>
            <DateRangePickerWithLabel
              label="발주일자"
              dateFrom={search.dateFrom}
              dateTo={search.dateTo}
              onDateFromChange={search.setDateFrom}
              onDateToChange={search.setDateTo}
            />
            <InputWithLabel label="발주번호" value={search.purchaseNo} onChange={search.setPurchaseNo} />
            <InputWithLabel label="거래처번호" value={search.clientCode} onChange={search.setClientCode} />
            <InputWithLabel label="거래처명" value={search.clientName} onChange={search.setClientName} />
          </ListSearchFilter>
        </div>

        <div data-help="purchase-order-status-table">
          <ListTable
            columns={PURCHASE_ORDER_TABLE_COLUMNS}
            rows={numberedRows}
            isLoading={isLoading}
            rowKey={(row) => row.no}
            onRowClick={(item) => {
              setActiveOrderId(item.orderSq!);
              setViewMode("detail");
            }}
            pagination={pagination}
          />
        </div>
      </div>
    </div>
  );
}
