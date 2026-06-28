/** 선택 품목의 재고이력 훅(서버 페이징): 선택 항목/페이지 변경 시 이력 재조회. */
import { useCallback, useEffect, useMemo, useState } from "react";
import * as preReceivingApi from "../../../api/preReceivingApi";
import { MaterialInventoryData, InventoryHistoryData } from "@/types/material/inventory.interface";

export function useStockHistory(selectedItem: MaterialInventoryData | null) {
  const [historyRows, setHistoryRows] = useState<InventoryHistoryData[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);
  const [historySize, setHistorySize] = useState(50);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const resetHistory = useCallback(() => {
    setHistoryRows([]);
    setHistoryTotal(0);
    setHistoryTotalPages(0);
  }, []);

  const fetchHistory = useCallback(async () => {
    if (!selectedItem || !selectedItem.itemSq) {
      resetHistory();
      return;
    }
    try {
      setIsHistoryLoading(true);
      const res = await preReceivingApi.loadInventoryHistoryPage({
        itemSq: selectedItem.itemSq,
        page: historyPage,
        size: historySize,
      });
      setHistoryRows(
        res.content.map((entry) => ({
          no: entry.no,
          warehouseLoc: entry.warehouseLoc,
          changeType: entry.changeType,
          lotNo: entry.lotNo,
          changeQty: entry.changeQty,
          currQty: entry.currQty,
          regDt: entry.regDt,
        })),
      );
      setHistoryTotal(res.totalElements);
      setHistoryTotalPages(res.totalPages);
    } catch (error) {
      console.error("Failed to load inventory history:", error);
      resetHistory();
    } finally {
      setIsHistoryLoading(false);
    }
  }, [selectedItem, historyPage, historySize, resetHistory]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const historySafePage = useMemo(
    () => (historyTotalPages > 0 ? Math.min(historyPage, historyTotalPages - 1) : 0),
    [historyPage, historyTotalPages],
  );

  return {
    historyRows,
    historyTotal,
    historyTotalPages,
    historySafePage,
    historySize,
    isHistoryLoading,
    setHistoryPage,
    setHistorySize,
  };
}
