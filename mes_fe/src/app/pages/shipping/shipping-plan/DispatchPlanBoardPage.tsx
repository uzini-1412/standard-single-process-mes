/** [출하관리 > 출하계획] 수주 기반 출하계획 목록/등록 진입. API: shippingPlanApi(/api/shipment/plan) + orderApi(수주참조). */
import { Button } from "../../../components/ui/button";
import { PAGE_LAYOUT_STYLES, BUTTON_STYLES } from "../../../styles/button-styles";
import { DispatchPlanFormPage } from "./DispatchPlanFormPage";
import { DispatchPlanViewPage } from "./DispatchPlanViewPage";
import { DateRangePickerWithLabel } from "../../../components/common/DateRangePickerWithLabel";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import { ListSearchFilter } from "../../../components/common/ListSearchFilter";
import { ListTable } from "../../../components/common/ListTable";
import { usePermission } from "../../../context/UserContext";
import { dispatchPlanBoardColumns } from "./dispatchPlanHelpers";
import { useDispatchPlanBoard } from "./useDispatchPlanBoard";

export function DispatchPlanBoardPage() {
  const perm = usePermission("shipping-plan");
  const board = useDispatchPlanBoard();
  const { filters } = board;

  // 등록/수정은 폼 화면으로, 상세 조회는 읽기 전용 화면으로 분기한다.
  if (board.boardView === "create" || board.boardView === "edit") {
    return (
      <DispatchPlanFormPage
        mode={board.boardView}
        item={board.boardView === "edit" ? board.activeRow : undefined}
        onBack={board.returnToList}
        onSave={board.returnToList}
      />
    );
  }

  if (board.boardView === "detail") {
    return (
      <DispatchPlanViewPage
        item={board.activeRow!}
        onBack={board.returnToList}
        onEdit={board.openEdit}
        onDelete={board.returnToList}
      />
    );
  }

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">출하계획</h1>
          {perm.createAuth && (
            <Button
              className={BUTTON_STYLES.primary}
              data-help="shipping-plan-register"
              onClick={board.openCreate}
            >
              출하계획등록
            </Button>
          )}
        </div>

        <div data-help="shipping-plan-search">
          <ListSearchFilter onSearch={board.fetchPlans}>
            <DateRangePickerWithLabel
              label="출하일"
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
              onDateFromChange={filters.setDateFrom}
              onDateToChange={filters.setDateTo}
            />
            <InputWithLabel label="품번" value={filters.itemCodeQuery} onChange={filters.setItemCodeQuery} />
            <InputWithLabel label="품명" value={filters.itemNameQuery} onChange={filters.setItemNameQuery} />
            <InputWithLabel label="거래처명" value={filters.clientQuery} onChange={filters.setClientQuery} />
          </ListSearchFilter>
        </div>

        <div data-help="shipping-plan-table">
          <ListTable
            columns={dispatchPlanBoardColumns}
            rows={board.pagedRows}
            isLoading={board.isFetching}
            rowKey={(row) => row.planSq ?? -1}
            onRowClick={board.openDetail}
            pagination={board.pagination}
            height="calc(100vh - 280px)"
          />
        </div>
      </div>
    </div>
  );
}
