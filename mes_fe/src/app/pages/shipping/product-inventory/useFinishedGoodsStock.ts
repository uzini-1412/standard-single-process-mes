import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadProductStockListPaged,
  downloadProductStockStatusExcel,
} from "../../../api/productInventoryApi";
import { fetchDetailNamesByGroupName } from "../../../api/commonInfoApi";
import { ProductInventoryData } from "@/types/shipping/inventory.interface";
import { showError } from "@/app/utils/toast";
import { mapStockRow } from "./stockHistoryUtils";
import { todayYm } from "@/app/utils/dateToday";

const currentMonthValue = () => todayYm();

interface StockFilterState {
  itemCode: string;
  itemName: string;
  itemType: string;
  baseMonth: string;
}

const blankFilters = (): StockFilterState => ({
  itemCode: "",
  itemName: "",
  itemType: "",
  baseMonth: currentMonthValue(),
});

// 메인 재고 그리드의 조회/검색/페이지네이션/엑셀 로직을 한 곳에 모은 훅
export function useFinishedGoodsStock() {
  const [rows, setRows] = useState<ProductInventoryData[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isFetching, setIsFetching] = useState(false);

  const [draftFilters, setDraftFilters] = useState<StockFilterState>(blankFilters);
  const [committedFilters, setCommittedFilters] = useState<StockFilterState>(blankFilters);
  const [productTypeChoices, setProductTypeChoices] = useState<string[]>([]);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  // 적용된 필터를 서버 쿼리 파라미터로 변환 (빈 값은 제외)
  const toQueryParams = useCallback(() => {
    const params: any = {};
    if (committedFilters.itemCode) params.itemCode = committedFilters.itemCode;
    if (committedFilters.itemName) params.itemName = committedFilters.itemName;
    if (committedFilters.itemType) params.itemType = committedFilters.itemType;
    if (committedFilters.baseMonth) params.baseDate = committedFilters.baseMonth + "-01";
    return params;
  }, [committedFilters]);

  // 제품구분 셀렉트 옵션을 공통코드(제품구분)에서 1회 로드
  useEffect(() => {
    fetchDetailNamesByGroupName("제품구분")
      .then(setProductTypeChoices)
      .catch(() => setProductTypeChoices([]));
  }, []);

  const fetchStockPage = useCallback(async () => {
    try {
      setIsFetching(true);
      const res = await loadProductStockListPaged({
        ...toQueryParams(),
        page: pageIndex,
        size: pageSize,
      });
      const offset = res.page * res.size;
      const mapped = res.content.map((row: any, i: number) => mapStockRow(row, offset + i + 1));
      setRows(mapped);
      setTotalElements(res.totalElements);
      setTotalPages(res.totalPages);
    } catch (error) {
      console.error("[ProductInventory] Error:", error);
      showError("제품재고 현황을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsFetching(false);
    }
  }, [pageIndex, pageSize, toQueryParams]);

  useEffect(() => {
    void fetchStockPage();
  }, [fetchStockPage]);

  // 검색 버튼: 입력 중인 필터를 확정하고 첫 페이지로 이동
  const applySearch = useCallback(() => {
    setCommittedFilters({
      itemCode: draftFilters.itemCode,
      itemName: draftFilters.itemName,
      itemType: draftFilters.itemType,
      baseMonth: draftFilters.baseMonth,
    });
    setPageIndex(0);
  }, [draftFilters]);

  // 총 페이지 수가 줄어든 경우를 대비한 안전 페이지 보정
  const clampedPage = useMemo(
    () => (totalPages > 0 ? Math.min(pageIndex, totalPages - 1) : 0),
    [pageIndex, totalPages],
  );

  const downloadExcel = useCallback(async () => {
    try {
      setIsFetching(true);
      // 백엔드 SXSSF 스트리밍 — 대용량도 클라이언트 변환 없이 내려받음
      await downloadProductStockStatusExcel(toQueryParams());
    } catch (error) {
      console.error("[ProductInventory] Excel export failed:", error);
      showError("엑셀 출력 중 오류가 발생했습니다.");
    } finally {
      setIsFetching(false);
    }
  }, [toQueryParams]);

  return {
    rows,
    totalElements,
    totalPages,
    isFetching,
    draftFilters,
    setDraftFilters,
    productTypeChoices,
    pageIndex,
    setPageIndex,
    pageSize,
    setPageSize,
    clampedPage,
    applySearch,
    downloadExcel,
  };
}
