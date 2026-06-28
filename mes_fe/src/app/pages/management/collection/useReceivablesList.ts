import { useState, useEffect } from "react";
import { useSessionState } from "../../../hooks/useSessionState";
import { useClientPagedList } from "../../../hooks/useClientPagedList";
import { searchReceivables } from "../../../api/collectionApi";
import { showError } from "@/app/utils/toast";
import type { CollectionListItem } from "@/types/management/collection.interface";

// 미수금 목록 화면의 조회 상태(검색 조건·로딩·페이징)를 한곳에 묶은 훅.
export function useReceivablesList() {
  const [rows, setRows] = useState<CollectionListItem[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [fromDate, setFromDate] = useSessionState("collection:dateFrom", "");
  const [toDate, setToDate] = useSessionState("collection:dateTo", "");

  // 현재 선택된 수금일자 범위로 서버에서 목록을 다시 받아온다.
  const refresh = async () => {
    try {
      setIsFetching(true);
      const fetched = await searchReceivables({
        dateFrom: fromDate || undefined,
        dateTo: toDate || undefined,
      });
      setRows(fetched);
    } catch {
      showError("자금관리 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsFetching(false);
    }
  };

  // 최초 진입 시 한 번 조회한다.
  useEffect(() => { refresh(); }, []);

  const { pagedRows, baseNo, pagination } = useClientPagedList(rows);

  return {
    fromDate, setFromDate,
    toDate, setToDate,
    isFetching,
    refresh,
    pagedRows, baseNo, pagination,
  };
}
