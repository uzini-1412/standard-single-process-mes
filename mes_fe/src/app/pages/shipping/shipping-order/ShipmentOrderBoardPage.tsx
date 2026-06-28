/** [출하관리 > 출하지시관리] 출하지시 목록/현황 화면. 폼·출하성적서·거래명세서로 분기 진입한다.
 *  shippingOrderApi(/api/shipment/order) 외 plan/report/trade-statement API 사용. */
import { Button } from "../../../components/ui/button";
import { PAGE_LAYOUT_STYLES, BUTTON_STYLES } from "../../../styles/button-styles";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import { DateRangePickerWithLabel } from "../../../components/common/DateRangePickerWithLabel";
import { TableStateRow } from "../../../components/common/TableStateRow";
import { ServerPagination } from "../../../components/common/ServerPagination";
import { SHIPPING_ORDER_COLUMNS } from "@/app/constants/shipping";
import { showWarning } from "@/app/utils/toast";
import { usePermission } from "../../../context/UserContext";
import { formatNumber } from "@/app/utils/numberFormat";
import { NUMBER_ALIGN, HEADER_ALIGN } from "@/app/styles/table-styles";
import { ShipmentOrderFormPage } from "./ShipmentOrderFormPage";
import { TradeStatementView } from "./TradeStatementView";
import { ShipmentReportView } from "./ShipmentReportView";
import { ShipmentOrderDetailView } from "./ShipmentOrderDetailView";
import { useShipmentOrderBoard } from "./useShipmentOrderBoard";
import { exportShipmentOrders } from "./shipmentOrderExcel";

export function ShipmentOrderBoardPage() {
  const board = useShipmentOrderBoard();
  const perm = usePermission("shipping-order");

  // 거래명세서 출력 분기 — 단건 선택 필수.
  if (board.screen === "print" && board.activeOrder?.shipOrderSq) {
    return (
      <TradeStatementView
        shipOrderSq={board.activeOrder.shipOrderSq}
        onBack={board.resetToList}
      />
    );
  }

  // 출하성적서 출력 분기.
  if (board.screen === "report" && board.activeOrder?.shipOrderSq) {
    return (
      <ShipmentReportView
        shipOrderSq={board.activeOrder.shipOrderSq}
        onBack={() => board.setScreen("detail")}
      />
    );
  }

  // 신규 등록 폼 분기.
  if (board.screen === "create") {
    return (
      <ShipmentOrderFormPage
        onBack={board.resetToList}
        onSave={async () => {
          await board.reload();
          board.setScreen("list");
        }}
      />
    );
  }

  // 상세/수정 분기 — 별도 서브컴포넌트로 위임.
  if (board.screen === "detail" || board.screen === "edit") {
    return <ShipmentOrderDetailView board={board} />;
  }

  // 기본: 목록 화면.
  const handleExcel = () => {
    if (board.filteredRows.length === 0) {
      showWarning("출력할 데이터가 없습니다.");
      return;
    }
    exportShipmentOrders(board.filteredRows);
  };

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-semibold text-gray-900">출하지시관리</h1>
          <div className="flex gap-2">
            <Button className={BUTTON_STYLES.primary} onClick={handleExcel}>엑셀출력</Button>
            <Button className={BUTTON_STYLES.primary} onClick={board.openTradeStatement}>거래명세서 출력</Button>
            {perm.createAuth && (
              <Button data-help="shipping-order-register" className={BUTTON_STYLES.primary} onClick={board.goCreate}>등록</Button>
            )}
          </div>
        </div>

        <div
          data-help="shipping-order-search"
          className="bg-gray-50 rounded-lg p-3 mb-3"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const tag = (e.target as HTMLElement).tagName;
              if (tag === "INPUT" || tag === "SELECT") {
                e.preventDefault();
                void board.runSearch();
              }
            }
          }}
        >
          <div className="flex items-center gap-3">
            <DateRangePickerWithLabel
              label="출하일"
              dateFrom={board.dateFrom}
              dateTo={board.dateTo}
              onDateFromChange={board.setDateFrom}
              onDateToChange={board.setDateTo}
            />
            <InputWithLabel label="품번" value={board.itemCodeQuery} onChange={board.setItemCodeQuery} />
            <InputWithLabel label="품명" value={board.itemNameQuery} onChange={board.setItemNameQuery} />
            <InputWithLabel label="거래처" value={board.clientQuery} onChange={board.setClientQuery} />
            <Button className={BUTTON_STYLES.search} onClick={board.runSearch}>검색</Button>
          </div>
        </div>

        <div data-help="shipping-order-table" className="border border-gray-200 rounded-sm overflow-hidden">
          <div className="h-[calc(100vh-330px)] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#4A5CC7] border-b border-gray-200">
                  {SHIPPING_ORDER_COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      style={{ minWidth: col.width }}
                      className={`px-4 py-3 ${HEADER_ALIGN} text-xs font-semibold text-white tracking-wider whitespace-pre-line border-r border-white`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                <TableStateRow
                  loading={board.loading}
                  isEmpty={board.pagedRows.length === 0}
                  colSpan={SHIPPING_ORDER_COLUMNS.length}
                  emptyText="등록된 출하지시가 없습니다."
                />
                {!board.loading &&
                  board.pagedRows.map((item, index) => (
                    <tr
                      key={`${item.shipOrderSq}_${board.baseNo + index}`}
                      onClick={() => board.setHighlightedOrder(item)}
                      onDoubleClick={() => board.openDetail(item)}
                      className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${board.highlightedOrder?.shipOrderSq === item.shipOrderSq ? "bg-blue-50" : ""}`}
                    >
                      <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{board.baseNo + index + 1}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{item.expectedShipDate}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{item.customerName || item.customerCode}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{item.itemCode}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{item.itemName}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap font-mono border-r border-gray-200">{item.lotNo || "-"}</td>
                      <td className={`px-4 py-3 text-sm text-gray-900 ${NUMBER_ALIGN} whitespace-nowrap border-r border-gray-200`}>{formatNumber(item.basisWeight)}</td>
                      <td className={`px-4 py-3 text-sm text-gray-900 ${NUMBER_ALIGN} whitespace-nowrap border-r border-gray-200`}>{formatNumber(item.width)}</td>
                      <td className={`px-4 py-3 text-sm text-gray-900 ${NUMBER_ALIGN} whitespace-nowrap border-r border-gray-200`}>{formatNumber(item.length)}</td>
                      <td className={`px-4 py-3 text-sm text-gray-900 ${NUMBER_ALIGN} whitespace-nowrap border-r border-gray-200`}>{formatNumber(item.planQty)}</td>
                      <td className={`px-4 py-3 text-sm text-gray-900 ${NUMBER_ALIGN} whitespace-nowrap border-r border-gray-200`}>{formatNumber(item.planQtyEa as string | number)}</td>
                      <td className={`px-4 py-3 text-sm text-gray-900 ${NUMBER_ALIGN} whitespace-nowrap border-r border-gray-200`}>{formatNumber(item.currentStock)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{item.destination}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-center whitespace-nowrap border-r border-gray-200">{item.expectedShipTime}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-200">
            <ServerPagination
              page={board.safePage}
              size={board.size}
              totalElements={board.totalElements}
              totalPages={board.totalPages}
              onPageChange={board.setPage}
              onSizeChange={(s) => {
                board.setSize(s);
                board.setPage(0);
              }}
              loading={board.loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
