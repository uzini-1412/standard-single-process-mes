import { useCallback, useState } from "react";
import * as salesStatusApi from "../../api/salesStatusApi";
import type { SalesStatusItem, SalesStatusGroupRes } from "@/types/management/sales.interface";

// 상세내역 팝업의 열림/로딩/데이터 상태를 관리하는 훅
export function useSalesDetailPopup(
  composeBaseParams: () => salesStatusApi.SalesQueryParams,
) {
  const [target, setTarget] = useState<SalesStatusGroupRes | null>(null);
  const [items, setItems] = useState<SalesStatusItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const open = useCallback(
    async (g: SalesStatusGroupRes) => {
      setTarget(g);
      setIsLoading(true);
      try {
        const fetched = await salesStatusApi.fetchSalesGroupDetails({
          ...composeBaseParams(),
          groupCustomerCode: g.customerCode,
          groupShipDate: g.shipDate,
          groupLotNo: g.lotNo,
        });
        setItems(fetched);
      } catch (error) {
        console.error("[SalesStatus] popup items load error:", error);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    },
    [composeBaseParams],
  );

  const close = useCallback(() => {
    setTarget(null);
    setItems([]);
  }, []);

  return { target, items, isLoading, open, close };
}
