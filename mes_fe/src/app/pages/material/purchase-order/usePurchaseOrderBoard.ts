/** 발주 목록 화면의 조회/검색 상태를 담는 훅. 응답을 품목 단위로 펼쳐 보관하고 조건 필터를 적용한다. */
import { useEffect, useState } from "react";
import { useSessionState } from "../../../hooks/useSessionState";
import * as purchaseOrderApi from "../../../api/purchaseOrderApi";
import { showError } from "@/app/utils/toast";
import type { PurchaseOrderListItem } from "@/types/material/purchaseorder.intergace";
import { buildListRows } from "./purchaseOrderViewModel";

export function usePurchaseOrderBoard() {
  const [rows, setRows] = useState<PurchaseOrderListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 검색 조건(세션 보존).
  const [dateFrom, setDateFrom] = useSessionState("purchase-order:dateFrom", "");
  const [dateTo, setDateTo] = useSessionState("purchase-order:dateTo", "");
  const [purchaseNo, setPurchaseNo] = useSessionState("purchase-order:purchaseNo", "");
  const [clientCode, setClientCode] = useSessionState("purchase-order:clientCode", "");
  const [clientName, setClientName] = useSessionState("purchase-order:clientName", "");

  // 서버에서 발주 목록을 받아 품목 단위 행으로 펼친다.
  const reload = async () => {
    try {
      setIsLoading(true);
      const orders = await purchaseOrderApi.loadPurchaseOrders({});
      setRows(buildListRows(orders));
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      showError("발주 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  // 화면단 실시간 필터(기간/발주번호/거래처번호·명).
  const filteredRows = rows.filter((item) => {
    if (dateFrom && (!item.orderDate || item.orderDate < dateFrom)) return false;
    if (dateTo && (!item.orderDate || item.orderDate > dateTo)) return false;
    if (purchaseNo && !item.orderNo.toLowerCase().includes(purchaseNo.toLowerCase())) return false;
    if (clientCode && !item.customerCode.toLowerCase().includes(clientCode.toLowerCase())) return false;
    if (clientName && !item.customerName.toLowerCase().includes(clientName.toLowerCase())) return false;
    return true;
  });

  return {
    isLoading,
    filteredRows,
    reload,
    search: {
      dateFrom,
      dateTo,
      purchaseNo,
      clientCode,
      clientName,
      setDateFrom,
      setDateTo,
      setPurchaseNo,
      setClientCode,
      setClientName,
    },
  };
}
