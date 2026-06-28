import { useCallback, useEffect, useMemo, useState } from "react";
import { loadProductStockHistoryPaged } from "../../../api/productInventoryApi";
import { ProductInventoryData } from "@/types/shipping/inventory.interface";
import {
  InOutHistoryRow,
  renderSignedQuantity,
  resolveChangeTypeLabel,
} from "./stockHistoryUtils";

// 선택된 품목의 입출고 이력(누적재고)을 페이지 단위로 조회하는 훅
export function useStockMovementHistory(focusedItem: ProductInventoryData | null) {
  const [historyRows, setHistoryRows] = useState<InOutHistoryRow[]>([]);
  const [historyTotalElements, setHistoryTotalElements] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(0);
  const [historyPageIndex, setHistoryPageIndex] = useState(0);
  const [historyPageSize, setHistoryPageSize] = useState(50);
  const [isHistoryFetching, setIsHistoryFetching] = useState(false);

  const resetHistory = useCallback(() => {
    setHistoryRows([]);
    setHistoryTotalElements(0);
    setHistoryTotalPages(0);
  }, []);

  const fetchHistoryPage = useCallback(async () => {
    if (!focusedItem || !focusedItem.itemSq) {
      resetHistory();
      return;
    }
    try {
      setIsHistoryFetching(true);
      const parsedWidth = focusedItem.width ? Number(focusedItem.width) : null;
      const res = await loadProductStockHistoryPaged({
        itemSq: focusedItem.itemSq,
        width: parsedWidth != null && !Number.isNaN(parsedWidth) ? parsedWidth : undefined,
        page: historyPageIndex,
        size: historyPageSize,
      });

      const offset = res.page * res.size;
      const mapped: InOutHistoryRow[] = res.content.map((entry, i) => {
        const cumulative =
          typeof entry.cumulativeQtyM === "number"
            ? entry.cumulativeQtyM
            : Number(entry.cumulativeQtyM);
        return {
          no: offset + i + 1,
          itemCode: focusedItem.itemCode,
          itemName: focusedItem.itemName,
          date: entry.date || "",
          type: resolveChangeTypeLabel(entry.changeType),
          qty: renderSignedQuantity(entry.changeQtyM),
          stockAfter: Number.isNaN(cumulative)
            ? String(entry.cumulativeQtyM ?? "")
            : cumulative.toLocaleString(),
          storageLoc: entry.storageLoc || "",
          lotNo: entry.lotNo || "",
        };
      });

      setHistoryRows(mapped);
      setHistoryTotalElements(res.totalElements);
      setHistoryTotalPages(res.totalPages);
    } catch (err) {
      console.error("[ProductInventory] history fetch failed:", err);
      resetHistory();
    } finally {
      setIsHistoryFetching(false);
    }
  }, [focusedItem, historyPageIndex, historyPageSize, resetHistory]);

  useEffect(() => {
    void fetchHistoryPage();
  }, [fetchHistoryPage]);

  // 누적 재고 페이지가 줄었을 때를 위한 안전 페이지 계산
  const clampedHistoryPage = useMemo(
    () => (historyTotalPages > 0 ? Math.min(historyPageIndex, historyTotalPages - 1) : 0),
    [historyPageIndex, historyTotalPages],
  );

  return {
    historyRows,
    historyTotalElements,
    historyTotalPages,
    historyPageIndex,
    setHistoryPageIndex,
    historyPageSize,
    setHistoryPageSize,
    isHistoryFetching,
    clampedHistoryPage,
  };
}
