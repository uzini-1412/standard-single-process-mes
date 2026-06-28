/** [생산관리 > 설비가동관리] 라인별 설비 가동/비가동 구간 조회. API: workResultApi(/api/production/result). */
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import { DateRangePickerWithLabel } from "../../../components/common/DateRangePickerWithLabel";
import { SelectWithLabel } from "../../../components/common/SelectWithLabel";
import { ListTable, type ListColumnDef } from "../../../components/common/ListTable";
import { showWarning } from "@/app/utils/toast";
import { buildExcelFileName as buildStdExcelFileName } from "@/app/utils/excelDownload";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useFacilityRunStatus } from "./useFacilityRunStatus";
import { buildDateRangeToken, type RunSegmentRow } from "./runStatusHelpers";

// 가동/비가동을 2단 그룹헤더로 묶은 테이블 컬럼 정의.
const RUN_STATUS_COLUMNS: ListColumnDef<RunSegmentRow>[] = [
  { key: "no", label: "No." },
  { key: "workDate", label: "일자" },
  { key: "lineName", label: "라인구분" },
  {
    label: "가동",
    children: [
      { key: "opStart", label: "시작시간", render: (r) => r.opStart },
      { key: "opEnd", label: "종료시간", render: (r) => r.opEnd },
      { key: "opMinutes", label: "가동시간(분)", format: "number" },
    ],
  },
  {
    label: "비가동",
    children: [
      { key: "dtStart", label: "시작시간", render: (r) => r.dtStart },
      { key: "dtEnd", label: "종료시간", render: (r) => r.dtEnd },
      { key: "dtMinutes", label: "비가동시간(분)", format: "number" },
    ],
  },
  { key: "dtType", label: "비가동유형" },
];

export function FacilityRunStatusPage() {
  const {
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    selectedLine, setSelectedLine,
    lineChoices,
    isFetching,
    visibleRows,
    pageRows,
    pagination,
    resetToFirstPage,
  } = useFacilityRunStatus();

  // 현재 필터 결과를 엑셀 한 장으로 내보낸다.
  const exportToExcel = () => {
    if (visibleRows.length === 0) {
      showWarning("출력할 데이터가 없습니다.");
      return;
    }
    const sheetRows = visibleRows.map((r, idx) => ({
      "No.": String(idx + 1),
      "일자": r.workDate,
      "라인구분": r.lineName,
      "가동 시작시간": r.opStart,
      "가동 종료시간": r.opEnd,
      "가동시간(분)": r.opMinutes,
      "비가동 시작시간": r.dtStart,
      "비가동 종료시간": r.dtEnd,
      "비가동시간(분)": r.dtMinutes,
      "비가동유형": r.dtType,
    }));
    const worksheet = XLSX.utils.json_to_sheet(sheetRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "설비가동현황");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const fileName = buildStdExcelFileName("설비가동현황", [
      buildDateRangeToken(dateFrom, dateTo),
      selectedLine,
    ]);
    saveAs(new Blob([buffer], { type: "application/octet-stream" }), fileName);
  };

  const lineSelectOptions = [
    { value: "", label: "전체" },
    ...lineChoices.map((o) => ({ value: o, label: o })),
  ];

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">설비가동현황</h1>
          <Button onClick={exportToExcel} className={BUTTON_STYLES.primary}>엑셀출력</Button>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 mb-4" data-help="facility-operation-search">
          <div className="flex items-center gap-3">
            <DateRangePickerWithLabel
              label="일자"
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
            <SelectWithLabel
              label="라인"
              value={selectedLine}
              onChange={setSelectedLine}
              options={lineSelectOptions}
            />
            <Button onClick={resetToFirstPage} className={BUTTON_STYLES.search}>검색</Button>
          </div>
        </div>

        <div data-help="facility-operation-table">
          <ListTable
            columns={RUN_STATUS_COLUMNS}
            rows={pageRows}
            isLoading={isFetching}
            rowKey={(r) => r.id}
            minWidth="1200px"
            pagination={pagination}
          />
        </div>
      </div>
    </div>
  );
}
