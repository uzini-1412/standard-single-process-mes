import { useCallback, useEffect, useMemo, useState } from "react";
import * as purchaseStatusApi from "../../api/purchaseStatusApi";
import { showError } from "@/app/utils/toast";
import type {
  PurchaseStatusItem,
  PurchaseStatusCustomerOption,
} from "@/types/management/purchase.interface";
import type { NumberedPurchaseGroup } from "./purchaseLedgerHelpers";

type OrderDir = "ASC" | "DESC";

interface CommittedFilter {
  dateFrom: string;
  dateTo: string;
  customerCode: string;
}

// 거래처원장 목록 화면의 상태·조회 로직을 한곳에 모은 훅
export function usePurchaseLedger() {
  // 입력 중인 검색 조건
  const [draftDateFrom, setDraftDateFrom] = useState("");
  const [draftDateTo, setDraftDateTo] = useState("");
  const [draftCustomer, setDraftCustomer] = useState("");

  // 실제 조회에 반영된 검색 조건
  const [committedFilter, setCommittedFilter] = useState<CommittedFilter>({
    dateFrom: "",
    dateTo: "",
    customerCode: "",
  });

  const [groups, setGroups] = useState<NumberedPurchaseGroup[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isFetching, setIsFetching] = useState(false);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [orderField, setOrderField] = useState<string>("");
  const [orderDir, setOrderDir] = useState<OrderDir>("DESC");

  const [customerOptions, setCustomerOptions] = useState<PurchaseStatusCustomerOption[]>([]);

  const [activeGroup, setActiveGroup] = useState<NumberedPurchaseGroup | null>(null);
  const [activeGroupItems, setActiveGroupItems] = useState<PurchaseStatusItem[]>([]);

  // 적용된 필터만으로 기본 조회 파라미터를 만든다
  const buildBaseQuery = useCallback((): purchaseStatusApi.PurchaseLedgerQuery => {
    const query: purchaseStatusApi.PurchaseLedgerQuery = {};
    if (committedFilter.dateFrom) query.dateFrom = committedFilter.dateFrom;
    if (committedFilter.dateTo) query.dateTo = committedFilter.dateTo;
    if (committedFilter.customerCode) query.customerCode = committedFilter.customerCode;
    return query;
  }, [committedFilter]);

  // 페이지 + 정렬 조건을 합쳐 그룹 페이지를 가져온다
  const fetchGroupPage = useCallback(async () => {
    try {
      setIsFetching(true);
      const query: purchaseStatusApi.PurchaseLedgerQuery = {
        ...buildBaseQuery(),
        page: pageIndex,
        size: pageSize,
      };
      if (orderField) {
        query.sortField = orderField;
        query.sortDirection = orderDir;
      }
      const res = await purchaseStatusApi.requestPurchaseGroupPage(query);
      const offset = res.page * res.size;
      setGroups(res.content.map((group, idx) => ({ ...group, no: offset + idx + 1 })));
      setTotalElements(res.totalElements);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error("[PurchaseStatus] Error loading data:", err);
      showError("거래처원장 데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsFetching(false);
    }
  }, [pageIndex, pageSize, orderField, orderDir, buildBaseQuery]);

  useEffect(() => {
    void fetchGroupPage();
  }, [fetchGroupPage]);

  // 날짜 조건이 바뀔 때 거래처 콤보 후보를 다시 받아온다
  useEffect(() => {
    const pullCustomers = async () => {
      try {
        const query: purchaseStatusApi.PurchaseLedgerQuery = {};
        if (committedFilter.dateFrom) query.dateFrom = committedFilter.dateFrom;
        if (committedFilter.dateTo) query.dateTo = committedFilter.dateTo;
        const list = await purchaseStatusApi.requestPurchaseCustomerList(query);
        setCustomerOptions(list);
      } catch (err) {
        console.error("[PurchaseStatus] Customer options load error:", err);
      }
    };
    void pullCustomers();
  }, [committedFilter.dateFrom, committedFilter.dateTo]);

  // 검색 버튼: 입력값을 적용 필터로 확정하고 페이지/선택을 초기화
  const applySearch = useCallback(() => {
    setCommittedFilter({
      dateFrom: draftDateFrom,
      dateTo: draftDateTo,
      customerCode: draftCustomer,
    });
    setPageIndex(0);
    setActiveGroup(null);
    setActiveGroupItems([]);
  }, [draftDateFrom, draftDateTo, draftCustomer]);

  // 같은 컬럼 재클릭이면 방향 토글, 새 컬럼이면 내림차순으로 시작
  const toggleOrder = useCallback((key: string) => {
    setOrderField((prevField) => {
      if (prevField === key) {
        setOrderDir((prev) => (prev === "ASC" ? "DESC" : "ASC"));
        return prevField;
      }
      setOrderDir("DESC");
      return key;
    });
    setPageIndex(0);
  }, []);

  const safePageIndex = useMemo(
    () => (totalPages > 0 ? Math.min(pageIndex, totalPages - 1) : 0),
    [pageIndex, totalPages],
  );

  // 그룹 한 줄을 선택하면 해당 그룹의 세부 항목을 조회해 보관
  const selectGroup = useCallback(
    async (group: NumberedPurchaseGroup) => {
      setActiveGroup(group);
      try {
        const items = await purchaseStatusApi.requestPurchaseGroupItems({
          ...buildBaseQuery(),
          groupAccountType: group.accountType,
          groupCustomerCode: group.customerCode,
          groupInboundDate: group.inboundDate,
        });
        setActiveGroupItems(items);
      } catch (err) {
        console.error("[PurchaseStatus] selected items load error:", err);
        setActiveGroupItems([]);
      }
    },
    [buildBaseQuery],
  );

  const changePageSize = useCallback((next: number) => {
    setPageSize(next);
    setPageIndex(0);
  }, []);

  return {
    // 검색 입력
    draftDateFrom,
    setDraftDateFrom,
    draftDateTo,
    setDraftDateTo,
    draftCustomer,
    setDraftCustomer,
    applySearch,
    // 목록 데이터
    groups,
    totalElements,
    totalPages,
    isFetching,
    pageSize,
    safePageIndex,
    setPageIndex,
    changePageSize,
    // 정렬
    orderField,
    orderDir,
    toggleOrder,
    // 부가
    customerOptions,
    activeGroup,
    activeGroupItems,
    selectGroup,
    buildBaseQuery,
  };
}
