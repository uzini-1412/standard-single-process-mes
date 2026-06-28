/** [품질관리 > 부적합관리] NCR 목록 조회/현황 화면과 등록·상세 화면으로의 진입점. API: nonConformanceApi(/api/quality/ncr). */
import { usePermission } from "../../../context/UserContext";
import { Button } from "../../../components/ui/button";
import { PAGE_LAYOUT_STYLES, BUTTON_STYLES } from "../../../styles/button-styles";
import { DateRangePickerWithLabel } from "../../../components/common/DateRangePickerWithLabel";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import { SelectWithLabel } from "../../../components/common/SelectWithLabel";
import { ListPageHeader } from "../../../components/common/ListPageHeader";
import { ListSearchFilter } from "../../../components/common/ListSearchFilter";
import { ListTable, type ListColumn } from "../../../components/common/ListTable";
import { NonConformanceData, NonConformancePageProps } from "@/types/quality/nonConformance.interface";
import { NonConformColumns } from "@/app/constants/quailtyNonConform";
import { showWarning } from "@/app/utils/toast";
import { useNcrBoard } from "./useNcrBoard";
import { CATEGORY_CHOICES, exportBoardRowsToExcel } from "./ncrBoardSupport";

export function NonConformanceBoardPage({ onNavigateToRegister, onNavigateToDetail }: NonConformancePageProps) {
  const access = usePermission("non-conformance");
  const board = useNcrBoard();
  const { filters } = board;

  // 공용 컬럼 정의를 ListTable 형식으로 투영
  const tableColumns: ListColumn<NonConformanceData>[] = NonConformColumns.map((c) => ({
    key: c.key,
    label: c.label,
    width: c.width,
  }));

  // 엑셀 내보내기 트리거 — 대상 행이 없으면 경고 후 중단
  const onClickExcel = () => {
    if (board.matchedRows.length === 0) {
      showWarning("출력할 데이터가 없습니다.");
      return;
    }
    exportBoardRowsToExcel(board.matchedRows);
  };

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button onClick={onClickExcel} className={BUTTON_STYLES.primary}>엑셀출력</Button>
      {access.createAuth && (
        <Button onClick={onNavigateToRegister} data-help="non-conformance-register" className={BUTTON_STYLES.primary}>부적합등록</Button>
      )}
    </div>
  );

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <ListPageHeader title="부적합" actions={headerActions} />

        <div data-help="non-conformance-search">
          <ListSearchFilter onSearch={() => {}}>
            <DateRangePickerWithLabel
              label="발생일자"
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
              onDateFromChange={filters.setDateFrom}
              onDateToChange={filters.setDateTo}
            />
            <InputWithLabel label="품번" value={filters.itemCode} onChange={filters.setItemCode} />
            <InputWithLabel label="품명" value={filters.itemName} onChange={filters.setItemName} />
            <SelectWithLabel
              label="분류"
              value={filters.category}
              onChange={filters.setCategory}
              options={CATEGORY_CHOICES}
            />
            <SelectWithLabel
              label="부적합유형"
              value={filters.defectType}
              onChange={filters.setDefectType}
              placeholder="선택"
              options={board.defectTypeOptions.map((opt) => ({ value: opt, label: opt }))}
            />
          </ListSearchFilter>
        </div>

        <div data-help="non-conformance-table">
          <ListTable
            columns={tableColumns}
            rows={board.numberedRows}
            isLoading={board.isFetching}
            rowKey={(row) => row.ncrSq}
            onRowClick={(row) => onNavigateToDetail(row)}
            pagination={board.pagination}
          />
        </div>
      </div>
    </div>
  );
}
