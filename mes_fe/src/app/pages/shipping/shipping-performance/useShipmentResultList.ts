import { useCallback, useEffect, useMemo, useState } from "react";
import * as shippingResultApi from "../../../api/shippingResultApi";
import type { ShippingPerformanceData } from "@/types/shipping/performance.interface";
import { showError } from "@/app/utils/toast";
import {
  EMPTY_SHIPMENT_QUERY,
  mapResultsToRows,
  type OrderDirection,
  type ShipmentQuery,
} from "./shipmentResultHelpers";

// 적용된 조회 조건과 정렬을 검색 파라미터 객체로 합친다
const composeParams = (
  applied: ShipmentQuery,
  sortKey: string,
  sortDir: OrderDirection,
  paging?: { page: number; size: number },
): shippingResultApi.ShipmentResultSearchParams => {
  const params: shippingResultApi.ShipmentResultSearchParams = paging ? { ...paging } : {};
  if (applied.dateFrom) params.dateFrom = applied.dateFrom;
  if (applied.dateTo) params.dateTo = applied.dateTo;
  if (applied.itemCode) params.itemCode = applied.itemCode;
  if (applied.itemName) params.itemName = applied.itemName;
  if (applied.customerName) params.customerName = applied.customerName;
  if (paging && sortKey) {
    params.sortField = sortKey;
    params.sortDirection = sortDir;
  }
  return params;
};

// 출하실적 목록의 서버 페이징/정렬/조회 상태 전반을 관리하는 훅
export function useShipmentResultList() {
  const [rows, setRows] = useState<ShippingPerformanceData[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [busy, setBusy] = useState(false);

  const [draftQuery, setDraftQuery] = useState<ShipmentQuery>(EMPTY_SHIPMENT_QUERY);
  const [appliedQuery, setAppliedQuery] = useState<ShipmentQuery>(EMPTY_SHIPMENT_QUERY);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<OrderDirection>("DESC");

  // 현재 조건/정렬/페이지로 한 페이지 분량의 출하실적을 조회한다
  const reload = useCallback(async () => {
    try {
      setBusy(true);
      const params = composeParams(appliedQuery, sortKey, sortDir, {
        page: pageIndex,
        size: pageSize,
      });
      const res = await shippingResultApi.loadShipmentResultListPaged(params);
      setRows(mapResultsToRows(res.content, res.page * res.size));
      setTotalElements(res.totalElements);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error("[ShippingPerformance] Error:", err);
      showError("출하실적 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }, [pageIndex, pageSize, sortKey, sortDir, appliedQuery]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // 조회 폼 입력 한 항목을 갱신한다
  const updateDraft = (field: string, value: string) =>
    setDraftQuery((prev) => ({ ...prev, [field]: value }));

  // 검색 버튼: 입력값을 트림하여 적용 조건으로 확정하고 첫 페이지로 이동
  const submitSearch = () => {
    setAppliedQuery({
      dateFrom: draftQuery.dateFrom,
      dateTo: draftQuery.dateTo,
      itemCode: draftQuery.itemCode.trim(),
      itemName: draftQuery.itemName.trim(),
      customerName: draftQuery.customerName.trim(),
    });
    setPageIndex(0);
  };

  // 초기화 버튼: 입력/적용 조건을 모두 비우고 첫 페이지로 이동
  const clearSearch = () => {
    setDraftQuery(EMPTY_SHIPMENT_QUERY);
    setAppliedQuery(EMPTY_SHIPMENT_QUERY);
    setPageIndex(0);
  };

  // 같은 컬럼이면 방향만 토글, 다른 컬럼이면 내림차순으로 새로 정렬
  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "ASC" ? "DESC" : "ASC");
    } else {
      setSortKey(key);
      setSortDir("DESC");
    }
    setPageIndex(0);
  };

  const changePageSize = (s: number) => {
    setPageSize(s);
    setPageIndex(0);
  };

  // 전체 페이지 수를 넘어선 페이지 인덱스를 안전 범위로 보정
  const safePageIndex = useMemo(
    () => (totalPages > 0 ? Math.min(pageIndex, totalPages - 1) : 0),
    [pageIndex, totalPages],
  );
  const rowOffset = safePageIndex * pageSize;

  // 엑셀 출력용: 적용 조건으로 전체 결과를 받아 화면과 동일 규칙으로 추가 필터링한다
  const fetchAllForExport = async (): Promise<ShippingPerformanceData[]> => {
    const params = composeParams(appliedQuery, sortKey, sortDir);
    const allResults = await shippingResultApi.loadShipmentResultList(params);
    const filtered = mapResultsToRows(allResults, 0).filter((item) => {
      if (
        appliedQuery.itemName &&
        !item.itemName.toLowerCase().includes(appliedQuery.itemName.toLowerCase())
      )
        return false;
      if (
        appliedQuery.customerName &&
        !item.customerName.toLowerCase().includes(appliedQuery.customerName.toLowerCase())
      )
        return false;
      return true;
    });
    return filtered.map((item, idx) => ({ ...item, no: String(idx + 1) }));
  };

  return {
    rows,
    totalElements,
    totalPages,
    busy,
    setBusy,
    draftQuery,
    updateDraft,
    submitSearch,
    clearSearch,
    sortKey,
    sortDir,
    toggleSort,
    pageSize,
    changePageSize,
    setPageIndex,
    safePageIndex,
    rowOffset,
    reload,
    fetchAllForExport,
  };
}
