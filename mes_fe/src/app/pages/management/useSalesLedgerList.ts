import { useCallback, useEffect, useMemo, useState } from "react";
import * as salesStatusApi from "../../api/salesStatusApi";
import type {
  SalesStatusItem,
  SalesStatusGroupRes,
  SalesStatusCustomerOption,
} from "@/types/management/sales.interface";
import { showError } from "@/app/utils/toast";

export type OrderDirection = "ASC" | "DESC";

export interface LedgerRow extends SalesStatusGroupRes {
  no: number;
}

interface AppliedFilter {
  dateFrom: string;
  dateTo: string;
  customerCode: string;
}

const EMPTY_FILTER: AppliedFilter = { dateFrom: "", dateTo: "", customerCode: "" };

export function useSalesLedgerList() {
  // 검색 폼에 입력 중인 값
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [draftCustomer, setDraftCustomer] = useState("");

  // 검색 버튼으로 확정된 조건
  const [activeFilter, setActiveFilter] = useState<AppliedFilter>(EMPTY_FILTER);

  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isFetching, setIsFetching] = useState(false);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [orderBy, setOrderBy] = useState<string>("");
  const [orderDir, setOrderDir] = useState<OrderDirection>("DESC");

  const [customerOptions, setCustomerOptions] = useState<SalesStatusCustomerOption[]>([]);

  // 거래명세서 발행 대상으로 선택된 그룹과 그 품목들
  const [pickedGroup, setPickedGroup] = useState<LedgerRow | null>(null);
  const [pickedItems, setPickedItems] = useState<SalesStatusItem[]>([]);

  // 확정 조건만으로 구성한 기본 파라미터
  const composeBaseParams = useCallback((): salesStatusApi.SalesQueryParams => {
    const params: salesStatusApi.SalesQueryParams = {};
    if (activeFilter.dateFrom) params.dateFrom = activeFilter.dateFrom;
    if (activeFilter.dateTo) params.dateTo = activeFilter.dateTo;
    if (activeFilter.customerCode) params.customerCode = activeFilter.customerCode;
    return params;
  }, [activeFilter]);

  const fetchPage = useCallback(async () => {
    try {
      setIsFetching(true);
      const params: salesStatusApi.SalesQueryParams = {
        ...composeBaseParams(),
        page: pageIndex,
        size: pageSize,
      };
      if (orderBy) {
        params.sortField = orderBy;
        params.sortDirection = orderDir;
      }
      const res = await salesStatusApi.fetchSalesGroupsPage(params);
      const offset = res.page * res.size;
      setRows(res.content.map((g, idx) => ({ ...g, no: offset + idx + 1 })));
      setTotalElements(res.totalElements);
      setTotalPages(res.totalPages);
    } catch (error) {
      console.error("[SalesStatus] Error loading data:", error);
      showError("매출현황 데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsFetching(false);
    }
  }, [pageIndex, pageSize, orderBy, orderDir, composeBaseParams]);

  useEffect(() => {
    void fetchPage();
  }, [fetchPage]);

  // 확정된 기간이 바뀌면 거래처 옵션을 다시 불러온다
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const params: salesStatusApi.SalesQueryParams = {};
        if (activeFilter.dateFrom) params.dateFrom = activeFilter.dateFrom;
        if (activeFilter.dateTo) params.dateTo = activeFilter.dateTo;
        const list = await salesStatusApi.fetchSalesCustomerOptions(params);
        setCustomerOptions(list);
      } catch (error) {
        console.error("[SalesStatus] Customer options load error:", error);
      }
    };
    void loadOptions();
  }, [activeFilter.dateFrom, activeFilter.dateTo]);

  const applySearch = useCallback(() => {
    setActiveFilter({
      dateFrom: draftFrom,
      dateTo: draftTo,
      customerCode: draftCustomer,
    });
    setPageIndex(0);
    setPickedGroup(null);
    setPickedItems([]);
  }, [draftFrom, draftTo, draftCustomer]);

  const toggleOrder = useCallback(
    (key: string) => {
      if (orderBy === key) {
        setOrderDir((prev) => (prev === "ASC" ? "DESC" : "ASC"));
      } else {
        setOrderBy(key);
        setOrderDir("DESC");
      }
      setPageIndex(0);
    },
    [orderBy],
  );

  const clampedPage = useMemo(
    () => (totalPages > 0 ? Math.min(pageIndex, totalPages - 1) : 0),
    [pageIndex, totalPages],
  );

  // 행을 선택하면 거래명세서용 품목까지 함께 적재
  const selectGroup = useCallback(
    async (g: LedgerRow) => {
      setPickedGroup(g);
      try {
        const items = await salesStatusApi.fetchSalesGroupDetails({
          ...composeBaseParams(),
          groupCustomerCode: g.customerCode,
          groupShipDate: g.shipDate,
          groupLotNo: g.lotNo,
        });
        setPickedItems(items);
      } catch (error) {
        console.error("[SalesStatus] selected items load error:", error);
        setPickedItems([]);
      }
    },
    [composeBaseParams],
  );

  const changeSize = useCallback((s: number) => {
    setPageSize(s);
    setPageIndex(0);
  }, []);

  return {
    // 검색 폼
    draftFrom,
    draftTo,
    draftCustomer,
    setDraftFrom,
    setDraftTo,
    setDraftCustomer,
    applySearch,
    // 표 데이터/상태
    rows,
    isFetching,
    totalElements,
    totalPages,
    clampedPage,
    pageSize,
    setPageIndex,
    changeSize,
    orderBy,
    orderDir,
    toggleOrder,
    // 거래처 옵션
    customerOptions,
    // 선택 상태
    pickedGroup,
    pickedItems,
    selectGroup,
    // 팝업 상세 조회용
    composeBaseParams,
  };
}
