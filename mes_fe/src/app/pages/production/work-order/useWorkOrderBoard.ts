/** 작업지시 보드 화면의 상태/검색/페이징/CRUD 흐름을 묶은 커스텀 훅. */
import { useState, useEffect } from "react";
import * as workOrderApi from "../../../api/workOrderApi";
import type { WorkOrderRes } from "../../../api/workOrderApi";
import * as commonInfoApi from "../../../api/commonInfoApi";
import type { WorkOrderData, WorkOrderPageMode } from "@/types/production/workOrder.interface";
import { showSuccess, showError } from "@/app/utils/toast";
import { showConfirm } from "@/app/utils/confirm";
import { toBoardRow } from "./workOrderBoardHelpers";

export function useWorkOrderBoard() {
  const [screenMode, setScreenMode] = useState<WorkOrderPageMode>("list");
  const [activeRow, setActiveRow] = useState<WorkOrderData | null>(null);
  const [activeRawOrder, setActiveRawOrder] = useState<WorkOrderRes | null>(null);

  const [rows, setRows] = useState<WorkOrderData[]>([]);
  const [rawByRowId, setRawByRowId] = useState<Map<string, WorkOrderRes>>(new Map());
  const [isFetching, setIsFetching] = useState(false);

  // 검색 필터 상태
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterItemCode, setFilterItemCode] = useState("");
  const [filterItemName, setFilterItemName] = useState("");
  const [filterLine, setFilterLine] = useState("");

  // 서버 페이징 메타
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // 라인구분 셀렉트 옵션 (기준정보에서 동적 수집)
  const [lineOptions, setLineOptions] = useState<string[]>([]);

  // 마운트 시 라인구분 옵션 한 번 적재
  useEffect(() => {
    commonInfoApi
      .fetchDetailContentsByItemName("라인구분")
      .then((options) => setLineOptions(options))
      .catch((error) => console.error("[WorkOrderBoard] 라인구분 옵션 로드 실패:", error));
  }, []);

  // 목록 모드로 들어올 때마다 첫 페이지부터 재조회
  useEffect(() => {
    if (screenMode === "list") {
      fetchBoardPage(0, pageSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenMode]);

  const fetchBoardPage = async (targetPage: number, targetSize: number) => {
    try {
      setIsFetching(true);

      const paged = await workOrderApi.fetchWorkOrderListPaged({
        dateFrom: filterDateFrom || undefined,
        dateTo: filterDateTo || undefined,
        itemCode: filterItemCode.trim() || undefined,
        itemName: filterItemName.trim() || undefined,
        lineName: filterLine || undefined,
        page: targetPage,
        size: targetSize,
      });

      const orders = paged.content;
      setPageIndex(paged.page);
      setPageSize(paged.size);
      setTotalElements(paged.totalElements);
      setTotalPages(paged.totalPages);

      // No 값은 페이지 경계를 넘어 연속되도록 baseNo 기준으로 부여
      const baseNo = paged.page * paged.size;
      setRows(orders.map((order: WorkOrderRes, idx: number) => toBoardRow(order, baseNo + idx + 1)));
      setRawByRowId(new Map(orders.map((order: WorkOrderRes) => [String(order.workOrderSq), order])));
    } catch (error) {
      console.error("[WorkOrderBoard] Failed to load work orders:", error);
    } finally {
      setIsFetching(false);
    }
  };

  const runSearch = () => fetchBoardPage(0, pageSize);
  const goToPage = (next: number) => fetchBoardPage(next, pageSize);
  const changePageSize = (next: number) => fetchBoardPage(0, next);

  const openCreate = () => setScreenMode("create");

  const openDetail = (row: WorkOrderData) => {
    setActiveRow(row);
    setActiveRawOrder(row.id ? rawByRowId.get(row.id) || null : null);
    setScreenMode("detail");
  };

  const switchToEdit = () => setScreenMode("edit");

  const backToList = () => {
    setScreenMode("list");
    setActiveRow(null);
  };

  const removeActiveOrder = async () => {
    if (!activeRow || !activeRow.id) return;
    if (!(await showConfirm("이 작업지시를 삭제하시겠습니까?"))) return;

    try {
      await workOrderApi.deleteWorkOrder(activeRow.id);
      showSuccess("작업지시가 삭제되었습니다.");
      setScreenMode("list");
      setActiveRow(null);
      setActiveRawOrder(null);
      // 삭제 후 보던 페이지를 그대로 유지한 채 새로고침
      fetchBoardPage(pageIndex, pageSize);
    } catch (error) {
      console.error("[WorkOrderBoard] Failed to delete work order:", error);
      showError("작업지시 삭제에 실패했습니다.");
    }
  };

  return {
    screenMode,
    activeRow,
    activeRawOrder,
    rows,
    isFetching,
    lineOptions,
    filters: {
      dateFrom: filterDateFrom,
      dateTo: filterDateTo,
      itemCode: filterItemCode,
      itemName: filterItemName,
      line: filterLine,
      setDateFrom: setFilterDateFrom,
      setDateTo: setFilterDateTo,
      setItemCode: setFilterItemCode,
      setItemName: setFilterItemName,
      setLine: setFilterLine,
    },
    paging: {
      page: pageIndex,
      size: pageSize,
      totalElements,
      totalPages,
      onPageChange: goToPage,
      onSizeChange: changePageSize,
    },
    runSearch,
    openCreate,
    openDetail,
    switchToEdit,
    backToList,
    removeActiveOrder,
  };
}
