/** 발주 1건의 원본 데이터를 비동기로 불러오는 훅. 상세 화면에서 사용. */
import { useEffect, useState } from "react";
import * as purchaseOrderApi from "../../../api/purchaseOrderApi";
import { showError } from "@/app/utils/toast";

export function usePurchaseOrderRecord(orderId: number) {
  const [record, setRecord] = useState<any>(null);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    let active = true;

    const pull = async () => {
      try {
        setIsFetching(true);
        const detail = await purchaseOrderApi.loadPurchaseOrderDetail(orderId);
        if (active) setRecord(detail);
      } catch (err) {
        console.error("Error fetching order detail:", err);
        showError("발주 정보를 불러오는 중 오류가 발생했습니다.");
      } finally {
        if (active) setIsFetching(false);
      }
    };

    void pull();
    return () => {
      active = false;
    };
  }, [orderId]);

  return { record, isFetching };
}
