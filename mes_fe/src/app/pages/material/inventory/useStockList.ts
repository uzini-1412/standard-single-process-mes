/** 자재재고 목록 훅: 검색조건/페이징/정렬 상태 관리 + 서버 페이지 조회, 정렬 토글, 엑셀 출력. */
import { useCallback, useEffect, useMemo, useState } from "react";
import * as preReceivingApi from "../../../api/preReceivingApi";
import { MaterialInventoryData } from "@/types/material/inventory.interface";
import { showError } from "@/app/utils/toast";
import { useAccountTypes } from "@/app/hooks/useAccountTypes";
import { toStockRow } from "./stockListColumns";

export type StockSortDirection = "ASC" | "DESC";

export function useStockList() {
  const { accountTypes, matchFinished, isLoading: accountTypesLoading } = useAccountTypes();

  const [rows, setRows] = useState<MaterialInventoryData[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isFetching, setIsFetching] = useState(false);

  // 검색 입력값과 실제 적용된 필터를 분리 (검색 버튼 클릭 시 반영)
  const [itemCodeInput, setItemCodeInput] = useState("");
  const [itemNameInput, setItemNameInput] = useState("");
  const [activeFilters, setActiveFilters] = useState({ itemCode: "", itemName: "" });

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(50);
  const [sortField, setSortField] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<StockSortDirection>("ASC");

  // 완제품 계정구분은 서버 측에서 제외 — 페이징/size 정확성을 위해 BE로 코드 전달
  const finishedAccountTypes = useMemo(
    () => accountTypes.filter(matchFinished),
    [accountTypes, matchFinished],
  );

  const composeBaseParams = useCallback((): preReceivingApi.InventorySearchParams => {
    const params: preReceivingApi.InventorySearchParams = {};
    if (activeFilters.itemCode) params.itemCode = activeFilters.itemCode;
    if (activeFilters.itemName) params.itemName = activeFilters.itemName;
    if (finishedAccountTypes.length > 0) params.excludeAccountTypes = finishedAccountTypes;
    return params;
  }, [activeFilters, finishedAccountTypes]);

  const fetchPage = useCallback(async () => {
    if (accountTypesLoading) return;
    try {
      setIsFetching(true);
      const params: preReceivingApi.InventorySearchParams = {
        ...composeBaseParams(),
        page,
        size,
      };
      if (sortField) {
        params.sortField = sortField;
        params.sortDirection = sortDirection;
      }
      const res = await preReceivingApi.loadInventoryPage(params);
      const baseNo = res.page * res.size;
      setRows(res.content.map((item, idx) => toStockRow(item, baseNo + idx + 1)));
      setTotalElements(res.totalElements);
      setTotalPages(res.totalPages);
    } catch (error) {
      console.error("Failed to load stock data:", error);
      showError("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsFetching(false);
    }
  }, [page, size, sortField, sortDirection, composeBaseParams, accountTypesLoading]);

  useEffect(() => {
    void fetchPage();
  }, [fetchPage]);

  const applySearch = () => {
    setActiveFilters({ itemCode: itemCodeInput.trim(), itemName: itemNameInput.trim() });
    setPage(0);
  };

  // 같은 컬럼이면 방향 토글, 다른 컬럼이면 오름차순부터 시작
  const toggleSort = (key: string) => {
    if (sortField === key) {
      setSortDirection((dir) => (dir === "ASC" ? "DESC" : "ASC"));
    } else {
      setSortField(key);
      setSortDirection("ASC");
    }
    setPage(0);
  };

  const safePage = useMemo(
    () => (totalPages > 0 ? Math.min(page, totalPages - 1) : 0),
    [page, totalPages],
  );

  const exportExcel = async () => {
    try {
      setIsFetching(true);
      // 백엔드 SXSSF 스트리밍 — 대용량도 클라이언트 변환 없이 곧장 다운로드
      await preReceivingApi.downloadInventoryExcel(composeBaseParams());
    } catch (error) {
      console.error("Excel export failed:", error);
      showError("엑셀 출력 중 오류가 발생했습니다.");
    } finally {
      setIsFetching(false);
    }
  };

  return {
    rows,
    isFetching,
    itemCodeInput,
    setItemCodeInput,
    itemNameInput,
    setItemNameInput,
    sortField,
    sortDirection,
    safePage,
    size,
    totalElements,
    totalPages,
    setPage,
    setSize,
    applySearch,
    toggleSort,
    exportExcel,
    reloadPage: fetchPage,
  };
}
