/** [생산관리 > 생산소요량산출] 수주 선택 → 소요량 재집계 워크벤치의 상태/조회 훅. orderApi + productionRequirementApi 사용. */
import { useCallback, useEffect, useMemo, useState } from "react";
import * as orderApi from "../../../api/orderApi";
import * as productionRequirementApi from "../../../api/productionRequirementApi";
import type {
  ProductionCustomerOrder,
  ProductionRequirement,
} from "@/types/production/requirement.interface";
import {
  collectSelectedRequirements,
  computeClientSlice,
  groupRequirementsByOrderNo,
  mapOrderToRow,
} from "./materialRequirementHelpers";

interface DateFilters {
  dateFrom: string;
  dateTo: string;
}

export function useMaterialRequirementWorkbench() {
  // 상단 수주 표 데이터/서버 페이징.
  const [orderRows, setOrderRows] = useState<ProductionCustomerOrder[]>([]);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderTotalPages, setOrderTotalPages] = useState(0);
  const [orderPage, setOrderPage] = useState(0);
  const [orderSize, setOrderSize] = useState(50);

  // 하단 소요량 표 클라이언트 페이징.
  const [reqPage, setReqPage] = useState(0);
  const [reqSize, setReqSize] = useState(50);

  // 검색 입력 / 확정 필터.
  const [dateFromInput, setDateFromInput] = useState("");
  const [dateToInput, setDateToInput] = useState("");
  const [activeFilters, setActiveFilters] = useState<DateFilters>({ dateFrom: "", dateTo: "" });

  const [isLoading, setIsLoading] = useState(true);

  // 체크된 수주를 orderNo 단위로 보관.
  const [selectedOrderNos, setSelectedOrderNos] = useState<Set<string>>(new Set());

  // BE가 계산을 끝낸 소요량을 orderNo로 묶어 둔 Map. 생산계획과 동일 소스.
  const [requirementGroups, setRequirementGroups] = useState<Map<string, ProductionRequirement[]>>(new Map());

  // 확정 필터를 날짜 파라미터로 변환. (수주/소요량 조회 공용)
  const buildDateParams = useCallback((): DateFilters | Record<string, string> => {
    const params: { dateFrom?: string; dateTo?: string } = {};
    if (activeFilters.dateFrom) params.dateFrom = activeFilters.dateFrom;
    if (activeFilters.dateTo) params.dateTo = activeFilters.dateTo;
    return params;
  }, [activeFilters]);

  // 상단 수주 목록 조회.
  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: orderApi.OrderListPagedParams = { page: orderPage, size: orderSize };
      if (activeFilters.dateFrom) params.dateFrom = activeFilters.dateFrom;
      if (activeFilters.dateTo) params.dateTo = activeFilters.dateTo;
      const res = await orderApi.fetchOrderListPaged(params);
      setOrderRows(res.content.map(mapOrderToRow));
      setOrderTotal(res.totalElements);
      setOrderTotalPages(res.totalPages);
    } catch (error) {
      console.error("[ProductionRequirement] Failed to load orders:", error);
      setOrderRows([]);
      setOrderTotal(0);
      setOrderTotalPages(0);
    } finally {
      setIsLoading(false);
    }
  }, [orderPage, orderSize, activeFilters]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  // 검색조건이 바뀌면 BE 산출 소요량도 다시 받아 Map을 새로 만든다.
  // FE에서 item/stock/expectedShip을 직접 join하지 않고 BE 계산값을 그대로 써서 0으로 빠지는 race를 없앤다.
  useEffect(() => {
    productionRequirementApi
      .fetchMaterialRequirements(buildDateParams())
      .then((reqs) => setRequirementGroups(groupRequirementsByOrderNo(reqs as any[])))
      .catch((e) => console.error("[ProductionRequirement] requirement list load failed:", e));
  }, [buildDateParams]);

  // 검색 클릭: 입력 일자를 확정 필터로 옮기고 수주 페이지를 처음으로.
  const applySearch = () => {
    setActiveFilters({ dateFrom: dateFromInput, dateTo: dateToInput });
    setOrderPage(0);
  };

  // 수주 행 체크 토글 — orderNo 기준.
  const toggleOrder = (order: ProductionCustomerOrder) => {
    const key = order.orderNo;
    setSelectedOrderNos((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // 선택된 수주들의 BE 산출 행만 모은 결과.
  const requirementRows = useMemo<ProductionRequirement[]>(
    () => collectSelectedRequirements(selectedOrderNos, requirementGroups),
    [selectedOrderNos, requirementGroups],
  );

  // 상단 표 서버 페이징 메타.
  const orderSafePage = useMemo(
    () => (orderTotalPages > 0 ? Math.min(orderPage, orderTotalPages - 1) : 0),
    [orderPage, orderTotalPages],
  );
  const orderBaseNo = orderSafePage * orderSize;

  // 하단 표 클라이언트 슬라이싱.
  const reqTotal = requirementRows.length;
  const reqSlice = computeClientSlice(reqTotal, reqSize, reqPage);
  const pagedRequirements = requirementRows.slice(reqSlice.baseNo, reqSlice.baseNo + reqSize);

  return {
    // 검색
    dateFromInput,
    setDateFromInput,
    dateToInput,
    setDateToInput,
    activeFilters,
    applySearch,
    // 상단 수주 표
    orderRows,
    isLoading,
    selectedOrderNos,
    toggleOrder,
    orderTotal,
    orderTotalPages,
    orderSafePage,
    orderSize,
    setOrderSize,
    setOrderPage,
    orderBaseNo,
    // 하단 소요량 표
    pagedRequirements,
    reqTotal,
    reqTotalPages: reqSlice.totalPages,
    reqSafePage: reqSlice.safePage,
    reqSize,
    setReqSize,
    setReqPage,
  };
}
