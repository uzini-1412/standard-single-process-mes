/** [생산관리 > 생산계획] 보드 화면의 데이터 로딩 로직을 담은 훅. */
import { useState, useEffect, useCallback } from "react";
import * as productionPlanApi from "../../../api/productionPlanApi";
import { useClientPagedList } from "../../../hooks/useClientPagedList";
import { normalizePlanRow } from "./planBoardHelpers";

export function usePlanBoard() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 등록 탭 목록을 서버에서 받아 화면용 형태로 정규화한다.
  const refreshPlans = useCallback(async () => {
    try {
      setLoading(true);
      const list = await productionPlanApi.fetchProductionPlans();
      setRows(list.map((plan: any, idx: number) => normalizePlanRow(plan, idx)));
    } catch (err) {
      console.error("[ProductionPlanBoard] 목록 로딩 실패:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPlans();
  }, [refreshPlans]);

  const { pagedRows, pagination } = useClientPagedList(rows);

  return {
    rows,
    loading,
    pagedRows,
    pagination,
    refreshPlans,
  };
}
