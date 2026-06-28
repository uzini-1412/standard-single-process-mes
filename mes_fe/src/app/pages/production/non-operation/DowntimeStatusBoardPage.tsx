/** [생산관리 > 기간별비가동현황] 기간 내 설비 다운타임을 유형별로 집계 조회. API: workResultApi(/api/production/result/downtime*). */
import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import { DateRangePickerWithLabel } from "../../../components/common/DateRangePickerWithLabel";
import { SelectWithLabel } from "../../../components/common/SelectWithLabel";
import { ListTable, type ListColumnDef } from "../../../components/common/ListTable";
import { showWarning } from "@/app/utils/toast";
import { buildExcelFileName as buildStdExcelFileName } from "@/app/utils/excelDownload";
import { formatNumber } from "@/app/utils/numberFormat";
import type { NonOperationData } from "@/types/production/nonoperation.interface";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useDowntimeStatusBoard } from "./useDowntimeStatusBoard";
import { buildDateRangeToken } from "./downtimeBoardHelpers";

/** 비가동유형 동적 헤더를 받아 2단 그룹헤더 컬럼을 조립한다. */
const buildBoardColumns = (typeHeaders: string[]): ListColumnDef<NonOperationData>[] => {
  const base: ListColumnDef<NonOperationData>[] = [
    { key: "no", label: "No." },
    { key: "workDate", label: "생산일" },
    { key: "lineName", label: "라인구분" },
    { key: "startTime", label: "투입시간(분)", format: "number" },
    { key: "operationTime", label: "실동시간(분)", format: "number" },
    { key: "downtimeTotal", label: "비가동시간(분)", format: "number" },
  ];

  if (typeHeaders.length > 0) {
    base.push({
      label: "비가동유형시간",
      children: typeHeaders.map((type) => ({
        key: `dt_${type}`,
        label: type,
        align: "right" as const,
        render: (row: NonOperationData) => formatNumber(row.downtimeByType[type] || "0"),
      })),
    });
  }

  base.push({ key: "remark", label: "비고" });
  return base;
};

export function DowntimeStatusBoardPage() {
  const {
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    selectedLine, setSelectedLine,
    lineChoices,
    downtimeTypeHeaders,
    isFetching,
    visibleRows,
    pageRows,
    pagination,
    resetToFirstPage,
  } = useDowntimeStatusBoard();

  const columns = buildBoardColumns(downtimeTypeHeaders);

  // 현재 필터 결과를 엑셀로 내보낸다(유형별 컬럼은 동적으로 펼침).
  const exportToExcel = () => {
    if (visibleRows.length === 0) {
      showWarning("출력할 데이터가 없습니다.");
      return;
    }
    const sheetRows = visibleRows.map((item, idx) => {
      const record: Record<string, string> = {
        "No.": String(idx + 1),
        "생산일": item.workDate,
        "라인구분": item.lineName,
        "투입시간(분)": item.startTime,
        "실동시간(분)": item.operationTime,
        "비가동시간(분)": item.downtimeTotal,
      };
      downtimeTypeHeaders.forEach((type) => {
        record[type] = item.downtimeByType[type] || "0";
      });
      record["비고"] = item.remark;
      return record;
    });
    const worksheet = XLSX.utils.json_to_sheet(sheetRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "비가동현황");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const fileName = buildStdExcelFileName("비가동현황", [
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
          <h1 className="text-2xl font-semibold text-gray-900">비가동현황</h1>
          <Button onClick={exportToExcel} className={BUTTON_STYLES.primary}>엑셀출력</Button>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 mb-4" data-help="non-operation-status-search">
          <div className="flex items-center gap-3">
            <DateRangePickerWithLabel label="생산일" dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} />
            <SelectWithLabel
              label="라인"
              value={selectedLine}
              onChange={setSelectedLine}
              options={lineSelectOptions}
            />
            <Button onClick={resetToFirstPage} className={BUTTON_STYLES.search}>검색</Button>
          </div>
        </div>

        <div data-help="non-operation-status-table">
          <ListTable
            columns={columns}
            rows={pageRows}
            isLoading={isFetching}
            rowKey={(row) => row.id}
            minWidth="1200px"
            pagination={pagination}
          />
        </div>
      </div>
    </div>
  );
}
