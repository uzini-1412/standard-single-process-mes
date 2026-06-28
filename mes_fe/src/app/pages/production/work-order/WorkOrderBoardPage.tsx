/** [생산관리 > 작업지시등록] 작업지시 목록/현황 조회 + 등록·상세·수정 진입. API: workOrderApi(/api/production/work-order). */
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import { DateRangePickerWithLabel } from "../../../components/common/DateRangePickerWithLabel";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import { SelectWithLabel } from "../../../components/common/SelectWithLabel";
import { ListTable } from "../../../components/common/ListTable";
import { usePermission } from "../../../context/UserContext";
import { WorkOrderEntryPage } from "./WorkOrderEntryPage";
import { useWorkOrderBoard } from "./useWorkOrderBoard";
import {
  boardColumnDefs,
  toDetailViewSubItems,
  toEditSubItems,
  toEntryInitialData,
} from "./workOrderBoardHelpers";

export function WorkOrderBoardPage() {
  const permission = usePermission("work-order");
  const board = useWorkOrderBoard();
  const { screenMode, filters, paging } = board;

  // 등록 진입: 빈 등록폼
  if (screenMode === "create") {
    return <WorkOrderEntryPage mode="create" onBack={board.backToList} />;
  }

  // 상세 보기: 선택 행의 원본 응답을 폼 초기값으로 변환해 읽기 전용 표시
  if (screenMode === "detail") {
    const raw = board.activeRawOrder;
    return (
      <WorkOrderEntryPage
        mode="detail"
        onBack={board.backToList}
        onEdit={board.switchToEdit}
        onDelete={board.removeActiveOrder}
        initialData={toEntryInitialData(raw)}
        initialSubItems={toDetailViewSubItems(raw)}
      />
    );
  }

  // 수정: 상세품목에 itemSq를 포함시켜 폼을 편집 가능 상태로 진입
  if (screenMode === "edit") {
    const raw = board.activeRawOrder;
    return (
      <WorkOrderEntryPage
        mode="edit"
        onBack={board.backToList}
        workOrderId={board.activeRow?.id}
        initialData={toEntryInitialData(raw)}
        initialSubItems={toEditSubItems(raw)}
      />
    );
  }

  // 기본(목록) 화면
  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        {/* 상단 타이틀 + 등록 버튼 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">작업지시</h1>
          {permission.createAuth && (
            <Button className={BUTTON_STYLES.primary} data-help="work-order-register" onClick={board.openCreate}>
              작업지시 등록
            </Button>
          )}
        </div>

        {/* 검색 필터 영역 */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4" data-help="work-order-search">
          <div className="flex items-center gap-3">
            <DateRangePickerWithLabel
              label="지시일"
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
              onDateFromChange={filters.setDateFrom}
              onDateToChange={filters.setDateTo}
            />
            <InputWithLabel label="품번" value={filters.itemCode} onChange={filters.setItemCode} />
            <InputWithLabel label="품명" value={filters.itemName} onChange={filters.setItemName} />
            <SelectWithLabel
              label="라인"
              value={filters.line}
              onChange={filters.setLine}
              options={board.lineOptions.map((opt) => ({ value: opt, label: opt }))}
            />
            <Button className={BUTTON_STYLES.search} onClick={board.runSearch}>
              검색
            </Button>
          </div>
        </div>

        {/* 작업지시목록 그리드 */}
        <div data-help="work-order-table">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">작업지시목록</h2>
          <ListTable
            columns={boardColumnDefs}
            rows={board.rows}
            isLoading={board.isFetching}
            rowKey={(row, index) => row.id ?? index}
            onRowClick={board.openDetail}
            emptyText="조회된 데이터가 없습니다."
            height="calc(100vh - 280px)"
            pagination={paging}
          />
        </div>
      </div>
    </div>
  );
}
