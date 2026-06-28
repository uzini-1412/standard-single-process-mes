/** [생산관리 > 생산일보] 일자별 생산실적을 조회하고 엑셀로 내려받는 목록 화면. API: workResultApi(/api/production/result). */
import { useMemo } from "react";
import { Button } from "../../../components/ui/button";
import { PAGE_LAYOUT_STYLES, BUTTON_STYLES } from "../../../styles/button-styles";
import { DateRangePickerWithLabel } from "../../../components/common/DateRangePickerWithLabel";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import { SelectWithLabel } from "../../../components/common/SelectWithLabel";
import { ListTable } from "../../../components/common/ListTable";
import { buildResultListColumns } from "./productionResultHelpers";
import { useProductionResultList } from "./useProductionResultList";

export function ProductionResultListPage() {
  const list = useProductionResultList();

  // 컬럼 스펙은 매 렌더마다 다시 만들 필요가 없어 한 번만 계산해 둔다.
  const listColumns = useMemo(() => buildResultListColumns(), []);

  // 라인 셀렉트 항목 = 전체 + 공통코드 라인구분 목록.
  const lineSelectOptions = useMemo(
    () => [{ value: "", label: "전체" }, ...list.lineOptions.map((opt) => ({ value: opt, label: opt }))],
    [list.lineOptions],
  );

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">생산실적</h1>
          <Button onClick={list.exportExcel} className={BUTTON_STYLES.primary}>엑셀출력</Button>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 mb-4" data-help="work-performance-status-search">
          <div className="flex items-center gap-3">
            <DateRangePickerWithLabel
              label="작업지시일"
              dateFrom={list.dateFromInput}
              dateTo={list.dateToInput}
              onDateFromChange={list.setDateFromInput}
              onDateToChange={list.setDateToInput}
            />
            <InputWithLabel label="품번" value={list.itemCodeInput} onChange={list.setItemCodeInput} />
            <InputWithLabel label="품명" value={list.itemNameInput} onChange={list.setItemNameInput} />
            <SelectWithLabel
              label="라인"
              value={list.lineInput}
              onChange={list.setLineInput}
              options={lineSelectOptions}
            />
            <Button onClick={list.applySearch} className={BUTTON_STYLES.search}>검색</Button>
          </div>
        </div>

        <div data-help="work-performance-status-table">
          <ListTable
            columns={listColumns}
            rows={list.rows}
            rowKey={(row) => row.id}
            isLoading={list.loading}
            height="calc(100vh - 280px)"
            sortField={list.sortField}
            sortDirection={list.sortDirection}
            onSort={list.applySort}
            pagination={{
              page: list.safePage,
              size: list.size,
              totalElements: list.totalElements,
              totalPages: list.totalPages,
              onPageChange: list.setPage,
              onSizeChange: (s) => { list.setSize(s); list.setPage(0); },
            }}
          />
        </div>
      </div>
    </div>
  );
}
