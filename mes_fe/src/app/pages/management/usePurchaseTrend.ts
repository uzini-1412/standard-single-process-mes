import { useCallback, useEffect, useMemo, useState } from "react";
import * as purchaseStatusApi from "../../api/purchaseStatusApi";
import { showError } from "@/app/utils/toast";
import type {
  PurchaseStatusCustomerOption,
  PurchaseStatusTrendRes,
} from "@/types/management/purchase.interface";

interface CommittedFilter {
  dateFrom: string;
  dateTo: string;
  customerCode: string;
}

// 매입 추이 화면의 조회·집계·표 페이징 로직을 담는 훅
export function usePurchaseTrend() {
  const [draftDateFrom, setDraftDateFrom] = useState("");
  const [draftDateTo, setDraftDateTo] = useState("");
  const [draftCustomer, setDraftCustomer] = useState("");

  const [committedFilter, setCommittedFilter] = useState<CommittedFilter>({
    dateFrom: "",
    dateTo: "",
    customerCode: "",
  });

  const [series, setSeries] = useState<PurchaseStatusTrendRes[]>([]);
  const [customerOptions, setCustomerOptions] = useState<PurchaseStatusCustomerOption[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  // 차트는 전체 series를 쓰고, 보조 표만 페이지 단위로 자른다
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(12);

  // 적용된 검색 조건으로 월별 추이를 가져온다
  const fetchTrend = useCallback(async () => {
    try {
      setIsFetching(true);
      const query: purchaseStatusApi.PurchaseLedgerQuery = {};
      if (committedFilter.dateFrom) query.dateFrom = committedFilter.dateFrom;
      if (committedFilter.dateTo) query.dateTo = committedFilter.dateTo;
      if (committedFilter.customerCode) query.customerCode = committedFilter.customerCode;
      const rows = await purchaseStatusApi.requestPurchaseMonthlyTrend(query);
      setSeries(rows);
    } catch (err) {
      console.error("[PurchaseStatusTrend] load error:", err);
      showError("매입 추이 데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsFetching(false);
    }
  }, [committedFilter]);

  useEffect(() => {
    void fetchTrend();
  }, [fetchTrend]);

  // 날짜 조건 변경 시 거래처 콤보 후보를 갱신
  useEffect(() => {
    const pullCustomers = async () => {
      try {
        const query: purchaseStatusApi.PurchaseLedgerQuery = {};
        if (committedFilter.dateFrom) query.dateFrom = committedFilter.dateFrom;
        if (committedFilter.dateTo) query.dateTo = committedFilter.dateTo;
        const list = await purchaseStatusApi.requestPurchaseCustomerList(query);
        setCustomerOptions(list);
      } catch (err) {
        console.error("[PurchaseStatusTrend] customer options load error:", err);
      }
    };
    void pullCustomers();
  }, [committedFilter.dateFrom, committedFilter.dateTo]);

  const applySearch = useCallback(() => {
    setCommittedFilter({
      dateFrom: draftDateFrom,
      dateTo: draftDateTo,
      customerCode: draftCustomer,
    });
  }, [draftDateFrom, draftDateTo, draftCustomer]);

  // 범례·툴팁에 쓸 라벨: 거래처 미선택이면 전체 합계
  const seriesLabel = useMemo(() => {
    if (!committedFilter.customerCode) return "전체 합계";
    const opt = customerOptions.find((c) => c.customerCode === committedFilter.customerCode);
    return opt ? `${opt.customerName} (${opt.customerCode})` : committedFilter.customerCode;
  }, [committedFilter.customerCode, customerOptions]);

  const totalAmount = useMemo(
    () => series.reduce((acc, row) => acc + (row.amount || 0), 0),
    [series],
  );

  // 보조 표를 위한 클라이언트 슬라이싱
  const totalPages = Math.max(1, Math.ceil(series.length / pageSize));
  const safePageIndex = Math.min(pageIndex, totalPages - 1);
  const pagedSeries = useMemo(
    () => series.slice(safePageIndex * pageSize, (safePageIndex + 1) * pageSize),
    [series, safePageIndex, pageSize],
  );

  // 데이터나 페이지 크기가 바뀌면 첫 페이지로 되돌린다
  useEffect(() => {
    setPageIndex(0);
  }, [series, pageSize]);

  const changePageSize = useCallback((next: number) => {
    setPageSize(next);
    setPageIndex(0);
  }, []);

  return {
    draftDateFrom,
    setDraftDateFrom,
    draftDateTo,
    setDraftDateTo,
    draftCustomer,
    setDraftCustomer,
    applySearch,
    series,
    pagedSeries,
    customerOptions,
    isFetching,
    seriesLabel,
    totalAmount,
    pageSize,
    pageIndex: safePageIndex,
    setPageIndex,
    changePageSize,
    totalPages,
  };
}
