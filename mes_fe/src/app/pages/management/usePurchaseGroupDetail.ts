import { useCallback, useState } from "react";
import * as purchaseStatusApi from "../../api/purchaseStatusApi";
import type { PurchaseStatusItem } from "@/types/management/purchase.interface";
import type { NumberedPurchaseGroup } from "./purchaseLedgerHelpers";

// 상세내역 팝업의 열림 상태와 항목 로딩을 담당하는 훅
export function usePurchaseGroupDetail(
  buildBaseQuery: () => purchaseStatusApi.PurchaseLedgerQuery,
) {
  const [targetGroup, setTargetGroup] = useState<NumberedPurchaseGroup | null>(null);
  const [items, setItems] = useState<PurchaseStatusItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 팝업을 열며 해당 그룹의 세부 항목을 비동기로 채운다
  const open = useCallback(
    async (group: NumberedPurchaseGroup) => {
      setTargetGroup(group);
      setIsLoading(true);
      try {
        const result = await purchaseStatusApi.requestPurchaseGroupItems({
          ...buildBaseQuery(),
          groupAccountType: group.accountType,
          groupCustomerCode: group.customerCode,
          groupInboundDate: group.inboundDate,
        });
        setItems(result);
      } catch (err) {
        console.error("[PurchaseStatus] popup items load error:", err);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    },
    [buildBaseQuery],
  );

  // 팝업을 닫고 보관 중이던 항목을 비운다
  const close = useCallback(() => {
    setTargetGroup(null);
    setItems([]);
  }, []);

  return { targetGroup, items, isLoading, open, close };
}
