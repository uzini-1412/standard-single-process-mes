import { useState, useEffect } from "react";
import { fetchWorkOrderList } from "../../../utils/api/workOrderApi";
import { buildProgressRows } from "./productionProgressUtils";
import type { WorkProgressRow } from "@/types/workProgress.interface";

// 매초 갱신되는 현재 시각을 돌려주는 훅
export function useLiveClock(): Date {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  return now;
}

interface ProgressFeed {
  rows: WorkProgressRow[];
  loading: boolean;
}

// 작업지시 목록을 받아 보드 행으로 만들고 30초마다 새로고침하는 훅
export function useProgressFeed(): ProgressFeed {
  const [rows, setRows] = useState<WorkProgressRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const refresh = async () => {
      try {
        setLoading(true);
        const orders = await fetchWorkOrderList();

        if (!orders || orders.length === 0) {
          setRows([]);
          return;
        }

        setRows(buildProgressRows(orders));
      } catch (err) {
        console.error("작업진행현황 데이터 로드 실패:", err);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    refresh();
    const poll = setInterval(refresh, 30000);
    return () => clearInterval(poll);
  }, []);

  return { rows, loading };
}
