/** [품질관리 > 공정검사현황] 공정 자주검사의 진행 상황과 결과를 조회하는 워크벤치. API: processInspectionApi(/api/inspect/result). */
import { PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import { DateRangePickerWithLabel } from "../../../components/common/DateRangePickerWithLabel";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import { SelectWithLabel } from "../../../components/common/SelectWithLabel";
import { ListPageHeader } from "../../../components/common/ListPageHeader";
import { ListSearchFilter } from "../../../components/common/ListSearchFilter";
import { useInProcessSelfCheck } from "./useInProcessSelfCheck";
import { ProgressStatusTable } from "./ProgressStatusTable";
import { SampleResultTable } from "./SampleResultTable";

export function InProcessSelfCheckPage() {
  const selfCheck = useInProcessSelfCheck();

  // 라인 셀렉트는 "전체" 항목을 앞에 두고 코드 옵션을 이어붙인다
  const lineSelectOptions = [
    { value: "", label: "전체" },
    ...selfCheck.lineOptions.map((option) => ({ value: option, label: option })),
  ];

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <ListPageHeader title="공정검사" />

        <div data-help="self-inspection-search">
          <ListSearchFilter onSearch={selfCheck.runSearch}>
            <DateRangePickerWithLabel
              label="검사일"
              dateFrom={selfCheck.searchDateFrom}
              dateTo={selfCheck.searchDateTo}
              onDateFromChange={selfCheck.setSearchDateFrom}
              onDateToChange={selfCheck.setSearchDateTo}
            />
            <InputWithLabel label="품번" value={selfCheck.searchItemCode} onChange={selfCheck.setSearchItemCode} />
            <InputWithLabel label="품명" value={selfCheck.searchItemName} onChange={selfCheck.setSearchItemName} />
            <SelectWithLabel
              label="라인"
              value={selfCheck.searchLine}
              onChange={selfCheck.setSearchLine}
              options={lineSelectOptions}
            />
          </ListSearchFilter>
        </div>

        <ProgressStatusTable
          rows={selfCheck.pagedHeaderData}
          loading={selfCheck.loading}
          activeWorkOrderSq={selfCheck.activeWorkOrderSq}
          onRowToggle={selfCheck.toggleRow}
          page={selfCheck.safePage}
          size={selfCheck.pageSize}
          totalElements={selfCheck.totalElements}
          totalPages={selfCheck.totalPages}
          onPageChange={selfCheck.goToPage}
          onSizeChange={selfCheck.changePageSize}
        />

        <SampleResultTable
          rows={selfCheck.resultData}
          hasSelection={selfCheck.activeWorkOrderSq !== null}
          onExport={selfCheck.exportReportExcel}
        />
      </div>
    </div>
  );
}
