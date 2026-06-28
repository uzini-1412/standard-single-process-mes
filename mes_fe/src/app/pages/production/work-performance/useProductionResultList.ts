/** [생산관리 > 생산일보] 검색/페이징/정렬/엑셀까지 관장하는 상태 훅. workResultApi 조회를 캡슐화한다. */
import { useCallback, useEffect, useState } from "react";
import * as workResultApi from "../../../api/workResultApi";
import type { WorkPerformanceData } from "@/types/production/performance.interface";
import { showWarning } from "@/app/utils/toast";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  EMPTY_RESULT_FILTERS,
  composeResultExcelFileName,
  buildResultSheetRecords,
  mapResultsToRows,
  type ListSortDirection,
  type ResultAppliedFilters,
} from "./productionResultHelpers";

export function useProductionResultList() {
  // 검색 입력 필드 상태.
  const [dateFromInput, setDateFromInput] = useState("");
  const [dateToInput, setDateToInput] = useState("");
  const [itemCodeInput, setItemCodeInput] = useState("");
  const [itemNameInput, setItemNameInput] = useState("");
  const [lineInput, setLineInput] = useState("");

  // 검색 버튼을 눌러 확정한 필터. 페이지 이동/정렬은 이 값을 기준으로 재조회한다.
  const [activeFilters, setActiveFilters] = useState<ResultAppliedFilters>(EMPTY_RESULT_FILTERS);

  // 현재 페이지 행만 보관. LOT 펼침 때문에 size와 실제 행 개수가 어긋날 수 있다.
  const [rows, setRows] = useState<WorkPerformanceData[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [lineOptions, setLineOptions] = useState<string[]>([]);

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(50);
  const [sortField, setSortField] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<ListSortDirection>("DESC");

  // 라인구분 셀렉트 옵션은 공통코드에서 가져온다.
  useEffect(() => {
    const fetchLineChoices = async () => {
      try {
        const { fetchDetailContentsByItemName } = await import("../../../api/commonInfoApi");
        const choices = await fetchDetailContentsByItemName("라인구분");
        setLineOptions(choices);
      } catch (error) {
        console.error("라인구분 옵션 로드 실패:", error);
      }
    };
    void fetchLineChoices();
  }, []);

  // 확정 필터/페이지/정렬에 맞춰 검색 파라미터를 채운다. (조회·엑셀 공용)
  const buildSearchParams = useCallback(
    (withPaging: boolean): workResultApi.WorkResultSearchParams => {
      const params: workResultApi.WorkResultSearchParams = withPaging ? { page, size } : {};
      if (activeFilters.dateFrom) params.dateFrom = activeFilters.dateFrom;
      if (activeFilters.dateTo) params.dateTo = activeFilters.dateTo;
      if (activeFilters.itemCode) params.itemCode = activeFilters.itemCode;
      if (activeFilters.itemName) params.itemName = activeFilters.itemName;
      if (activeFilters.lineName) params.lineName = activeFilters.lineName;
      if (sortField) {
        params.sortField = sortField;
        params.sortDirection = sortDirection;
      }
      return params;
    },
    [activeFilters, page, size, sortField, sortDirection],
  );

  const fetchCurrentPage = useCallback(async () => {
    try {
      setLoading(true);
      const pageData = await workResultApi.fetchDailyProductionReportPaged(buildSearchParams(true));
      setRows(mapResultsToRows(pageData.content, page * size));
      setTotalElements(pageData.totalElements);
      setTotalPages(Math.max(1, pageData.totalPages));
    } catch (error) {
      console.error("데이터 로드 실패:", error);
      setRows([]);
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [buildSearchParams, page, size]);

  useEffect(() => {
    void fetchCurrentPage();
  }, [fetchCurrentPage]);

  // 검색 클릭: 입력값을 확정 필터로 옮기고 첫 페이지로.
  const applySearch = () => {
    setActiveFilters({
      dateFrom: dateFromInput,
      dateTo: dateToInput,
      itemCode: itemCodeInput.trim(),
      itemName: itemNameInput.trim(),
      lineName: lineInput,
    });
    setPage(0);
  };

  // 같은 컬럼이면 방향 토글, 다른 컬럼이면 해당 컬럼 DESC부터.
  const applySort = (key: string) => {
    if (sortField === key) {
      setSortDirection((prev) => (prev === "ASC" ? "DESC" : "ASC"));
    } else {
      setSortField(key);
      setSortDirection("DESC");
    }
    setPage(0);
  };

  // 엑셀은 버튼 클릭 시점에만 확정 필터 범위 전체를 조회해서 내려받는다.
  const exportExcel = async () => {
    try {
      setLoading(true);
      const everything = await workResultApi.fetchDailyProductionReport(buildSearchParams(false));
      const everyRow = mapResultsToRows(everything, 0).map((row, idx) => ({ ...row, no: String(idx + 1) }));
      if (everyRow.length === 0) {
        showWarning("출력할 데이터가 없습니다.");
        return;
      }
      const sheet = XLSX.utils.json_to_sheet(buildResultSheetRecords(everyRow));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "생산실적");
      const binary = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      saveAs(new Blob([binary], { type: "application/octet-stream" }), composeResultExcelFileName(activeFilters));
    } catch (error) {
      console.error("엑셀 출력 실패:", error);
      showWarning("엑셀 출력에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const safePage = totalPages > 0 ? Math.min(page, totalPages - 1) : 0;

  return {
    dateFromInput,
    setDateFromInput,
    dateToInput,
    setDateToInput,
    itemCodeInput,
    setItemCodeInput,
    itemNameInput,
    setItemNameInput,
    lineInput,
    setLineInput,
    lineOptions,
    rows,
    loading,
    totalElements,
    totalPages,
    safePage,
    size,
    setSize,
    setPage,
    sortField,
    sortDirection,
    applySearch,
    applySort,
    exportExcel,
  };
}
