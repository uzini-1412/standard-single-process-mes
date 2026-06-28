import { useCallback, useEffect, useMemo, useState } from "react";
import * as salesStatusApi from "../../api/salesStatusApi";
import type {
  SalesStatusCustomerOption,
  SalesStatusTrendRes,
} from "@/types/management/sales.interface";
import { showError } from "@/app/utils/toast";

interface TrendFilter {
  dateFrom: string;
  dateTo: string;
  customerCode: string;
}

const BLANK_FILTER: TrendFilter = { dateFrom: "", dateTo: "", customerCode: "" };

// 매출 추이 화면의 데이터·필터·페이징 로직을 캡슐화한 훅
export function useSalesTrend() {
  // 입력 중인 검색 값
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [draftCustomer, setDraftCustomer] = useState("");

  // 검색으로 확정된 조건
  const [activeFilter, setActiveFilter] = useState<TrendFilter>(BLANK_FILTER);

  const [series, setSeries] = useState<SalesStatusTrendRes[]>([]);
  const [customerOptions, setCustomerOptions] = useState<SalesStatusCustomerOption[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  // 표 전용 페이징 (차트는 항상 전체를 그린다)
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(12);

  const fetchSeries = useCallback(async () => {
    try {
      setIsFetching(true);
      const params: salesStatusApi.SalesQueryParams = {};
      if (activeFilter.dateFrom) params.dateFrom = activeFilter.dateFrom;
      if (activeFilter.dateTo) params.dateTo = activeFilter.dateTo;
      if (activeFilter.customerCode) params.customerCode = activeFilter.customerCode;
      const data = await salesStatusApi.fetchMonthlySalesTrend(params);
      setSeries(data);
    } catch (error) {
      console.error("[SalesStatusTrend] load error:", error);
      showError("매출 추이 데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsFetching(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    void fetchSeries();
  }, [fetchSeries]);

  // 기간이 확정되면 거래처 옵션을 갱신
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const params: salesStatusApi.SalesQueryParams = {};
        if (activeFilter.dateFrom) params.dateFrom = activeFilter.dateFrom;
        if (activeFilter.dateTo) params.dateTo = activeFilter.dateTo;
        const list = await salesStatusApi.fetchSalesCustomerOptions(params);
        setCustomerOptions(list);
      } catch (error) {
        console.error("[SalesStatusTrend] customer options load error:", error);
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
  }, [draftFrom, draftTo, draftCustomer]);

  // 범례·툴팁에 노출할 계열 이름
  const seriesLabel = useMemo(() => {
    if (!activeFilter.customerCode) return "전체 합계";
    const matched = customerOptions.find((c) => c.customerCode === activeFilter.customerCode);
    return matched ? `${matched.customerName} (${matched.customerCode})` : activeFilter.customerCode;
  }, [activeFilter.customerCode, customerOptions]);

  const grandTotal = useMemo(
    () => series.reduce((acc, t) => acc + (t.amount || 0), 0),
    [series],
  );

  // 클라이언트에서 잘라낸 표 페이지
  const totalPages = Math.max(1, Math.ceil(series.length / pageSize));
  const clampedPage = Math.min(pageIndex, totalPages - 1);
  const pagedSeries = useMemo(
    () => series.slice(clampedPage * pageSize, (clampedPage + 1) * pageSize),
    [series, clampedPage, pageSize],
  );

  // 데이터나 페이지 크기가 바뀌면 첫 페이지로 되돌린다
  useEffect(() => {
    setPageIndex(0);
  }, [series, pageSize]);

  const changeSize = useCallback((s: number) => {
    setPageSize(s);
    setPageIndex(0);
  }, []);

  return {
    draftFrom,
    draftTo,
    draftCustomer,
    setDraftFrom,
    setDraftTo,
    setDraftCustomer,
    applySearch,
    series,
    pagedSeries,
    customerOptions,
    isFetching,
    seriesLabel,
    grandTotal,
    totalPages,
    clampedPage,
    pageSize,
    setPageIndex,
    changeSize,
  };
}
