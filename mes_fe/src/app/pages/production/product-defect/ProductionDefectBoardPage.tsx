/** [생산관리 > 기간별불량현황] 기간 단위 제품 불량 집계 화면. API: workResultApi(/api/production/result/defect*). */
import { useMemo } from "react";
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import { DateRangePickerWithLabel } from "../../../components/common/DateRangePickerWithLabel";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import { SelectWithLabel } from "../../../components/common/SelectWithLabel";
import { ListTable } from "../../../components/common/ListTable";
import { showWarning } from "@/app/utils/toast";
import { useDefectBoard } from "./useDefectBoard";
import { buildDefectColumns, downloadDefectExcel } from "./defectBoardExport";

export function ProductionDefectBoardPage() {
  const {
    search,
    patchSearch,
    isFetching,
    lineChoices,
    defectKinds,
    filteredRows,
    pagedRows,
    pagination,
    runSearch,
  } = useDefectBoard();

  // 불량유형 목록이 바뀔 때만 컬럼 정의를 다시 만든다.
  const tableColumns = useMemo(() => buildDefectColumns(defectKinds), [defectKinds]);

  // 라인 셀렉트 옵션: 맨 앞 "전체" + 공통정보 라인 목록.
  const lineSelectOptions = useMemo(
    () => [{ value: "", label: "전체" }, ...lineChoices.map((o) => ({ value: o, label: o }))],
    [lineChoices],
  );

  const exportToExcel = () => {
    if (filteredRows.length === 0) {
      showWarning("출력할 데이터가 없습니다.");
      return;
    }
    downloadDefectExcel(filteredRows, defectKinds);
  };

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">불량현황</h1>
          <Button onClick={exportToExcel} className={BUTTON_STYLES.primary}>엑셀출력</Button>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 mb-4" data-help="product-defect-status-search">
          <div className="flex items-center gap-3">
            <DateRangePickerWithLabel
              label="생산일"
              dateFrom={search.dateFrom}
              dateTo={search.dateTo}
              onDateFromChange={(v) => patchSearch({ dateFrom: v })}
              onDateToChange={(v) => patchSearch({ dateTo: v })}
            />
            <InputWithLabel label="품번" value={search.itemCode} onChange={(v) => patchSearch({ itemCode: v })} />
            <InputWithLabel label="품명" value={search.itemName} onChange={(v) => patchSearch({ itemName: v })} />
            <SelectWithLabel
              label="라인"
              value={search.line}
              onChange={(v) => patchSearch({ line: v })}
              options={lineSelectOptions}
            />
            <Button className={BUTTON_STYLES.search} onClick={runSearch}>검색</Button>
          </div>
        </div>

        <div data-help="product-defect-status-table">
          <ListTable
            rows={pagedRows}
            columns={tableColumns}
            rowKey={(row) => row.id}
            isLoading={isFetching}
            pagination={pagination}
            minWidth="1200px"
          />
        </div>
      </div>
    </div>
  );
}
