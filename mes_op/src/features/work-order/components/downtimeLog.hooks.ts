import { useEffect, useState } from "react";
import { fetchNonOperationEvents } from "../../../utils/api/api";
import { DowntimeStatusRow } from "@/types/downtime.interface";
import { applyEventsToRows, buildEmptyDowntimeRows } from "./downtimeLog.helpers";

// 매초 갱신되는 현재 시각을 돌려주는 훅. 언마운트 시 인터벌을 정리한다.
export function useTickingClock(): Date {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const ticker = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(ticker);
  }, []);
  return now;
}

// 작업지시 식별자가 바뀔 때마다 비가동 이벤트를 조회해 표 데이터를 채운다.
export function useDowntimeRows(workOrderSq?: number): DowntimeStatusRow[] {
  const [rows, setRows] = useState<DowntimeStatusRow[]>(buildEmptyDowntimeRows);

  useEffect(() => {
    if (!workOrderSq) return;

    let cancelled = false;
    const fetchAndFill = async () => {
      try {
        const events = await fetchNonOperationEvents(workOrderSq);
        if (cancelled || !events || events.length === 0) return;
        setRows((prev) => applyEventsToRows(prev, events));
      } catch (error) {
        // 조회가 실패하면 표는 빈 상태로 두고 콘솔에만 남긴다.
        console.error("비가동 현황 로드 실패:", error);
      }
    };

    fetchAndFill();
    return () => {
      cancelled = true;
    };
  }, [workOrderSq]);

  return rows;
}
