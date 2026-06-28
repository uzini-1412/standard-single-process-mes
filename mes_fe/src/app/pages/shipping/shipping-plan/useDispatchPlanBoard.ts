import { useEffect, useState } from "react";
import * as shippingPlanApi from "../../../api/shippingPlanApi";
import { ShippingPlanData } from "@/types/shipping/plan.interface";
import { showError } from "@/app/utils/toast";
import { useClientPagedList } from "../../../hooks/useClientPagedList";
import { matchesBoardFilters, normalizePlanRow } from "./dispatchPlanHelpers";

export type BoardView = "list" | "create" | "edit" | "detail";

// 출하계획 목록 화면의 상태(뷰모드/검색조건/데이터/선택행)와 조회 로직을 한곳에 모은 훅.
export function useDispatchPlanBoard() {
  const [boardView, setBoardView] = useState<BoardView>("list");
  const [rows, setRows] = useState<ShippingPlanData[]>([]);
  const [activeRow, setActiveRow] = useState<ShippingPlanData | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [itemCodeQuery, setItemCodeQuery] = useState("");
  const [itemNameQuery, setItemNameQuery] = useState("");
  const [clientQuery, setClientQuery] = useState("");

  // 목록 뷰로 돌아올 때마다 서버에서 다시 읽어온다.
  useEffect(() => {
    if (boardView === "list") {
      void fetchPlans();
    }
  }, [boardView]);

  const fetchPlans = async () => {
    try {
      setIsFetching(true);
      const plans = await shippingPlanApi.loadShippingPlans({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setRows(plans.map((plan: any, index: number) => normalizePlanRow(plan, index)));
    } catch (error) {
      console.error("[ShippingPlan] Error loading list:", error);
      showError("출하계획 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsFetching(false);
    }
  };

  const openDetail = (row: ShippingPlanData) => {
    if (row.itemCode) {
      setBoardView("detail");
      setActiveRow(row);
    }
  };

  const openCreate = () => setBoardView("create");
  const openEdit = () => setBoardView("edit");
  const returnToList = () => {
    setBoardView("list");
    setActiveRow(null);
  };

  const visibleRows = rows.filter((row) =>
    matchesBoardFilters(row, {
      dateFrom,
      dateTo,
      itemCode: itemCodeQuery,
      itemName: itemNameQuery,
      client: clientQuery,
    }),
  );

  const { pagedRows, pagination } = useClientPagedList(visibleRows);

  return {
    boardView,
    activeRow,
    isFetching,
    filters: {
      dateFrom,
      dateTo,
      itemCodeQuery,
      itemNameQuery,
      clientQuery,
      setDateFrom,
      setDateTo,
      setItemCodeQuery,
      setItemNameQuery,
      setClientQuery,
    },
    pagedRows,
    pagination,
    fetchPlans,
    openDetail,
    openCreate,
    openEdit,
    returnToList,
  };
}
