// 출하지시 목록/상세/수정 화면의 상태와 동작을 모은 훅.
// 목록 조회·필터·페이징 + LOT split 상세 편집·저장·삭제까지 한곳에서 다룬다.
import { useState, useEffect, useMemo } from "react";
import * as shippingOrderApi from "../../../api/shippingOrderApi";
import { ShippingOrderData } from "@/types/shipping/order.interface";
import type { LotAllocation } from "../../../components/features/shipping/LotSelectModal";
import { showSuccess, showWarning, showError } from "@/app/utils/toast";
import { showApiError } from "@/app/utils/apiError";
import { showConfirm } from "@/app/utils/confirm";
import {
  toFiniteNumber,
  deriveRollCount,
  normalizeOrderRow,
  compareByShipDateDesc,
  matchesSearchKeywords,
  collapseByShipLot,
} from "./shipmentOrderHelpers";

export type BoardScreen = "list" | "detail" | "edit" | "create" | "print" | "report";

export function useShipmentOrderBoard() {
  const [screen, setScreen] = useState<BoardScreen>("list");
  const [activeOrder, setActiveOrder] = useState<ShippingOrderData | null>(null);
  // 같은 lotNo 로 묶인 LOT-split 상세들. 행마다 별도 shipOrderSq 를 가진다.
  const [splitRows, setSplitRows] = useState<ShippingOrderData[]>([]);
  const [rows, setRows] = useState<ShippingOrderData[]>([]);
  const [loading, setLoading] = useState(false);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  // 입력창에 바인딩되는 라이브 값(타이핑마다 바뀌지만 목록 필터에는 쓰지 않는다).
  const [itemCodeQuery, setItemCodeQuery] = useState("");
  const [itemNameQuery, setItemNameQuery] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  // 검색 버튼/엔터로 확정된 값. 목록 필터는 이 값만 본다.
  const [appliedItemCode, setAppliedItemCode] = useState("");
  const [appliedItemName, setAppliedItemName] = useState("");
  const [appliedClient, setAppliedClient] = useState("");

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(50);

  // 수정 화면의 제품 LOT 재배분 모달 표시 여부.
  const [lotModalOpen, setLotModalOpen] = useState(false);
  // 수주잔여 초과 등록을 사용자가 승인했는지 (LotSelectModal 에서 확정한 force).
  const [overCapAcknowledged, setOverCapAcknowledged] = useState(false);
  // 목록에서 단일 클릭으로 선택된 행 (출력 버튼 대상).
  const [highlightedOrder, setHighlightedOrder] = useState<ShippingOrderData | null>(null);

  useEffect(() => {
    void reload();
  }, []);

  // 수정 모드에서 split 각 행의 롤수(EA)를 출하지시량 변경에 맞춰 자동 갱신.
  useEffect(() => {
    if (screen !== "edit") return;
    setSplitRows((prev) =>
      prev.map((d) => {
        const ea = deriveRollCount(parseFloat(d.planQty || "0"), parseFloat(d.length || "0"));
        return d.planQtyEa === ea ? d : { ...d, planQtyEa: ea };
      })
    );
  }, [screen, splitRows.map((d) => d.planQty).join(",")]);

  async function reload() {
    try {
      setLoading(true);
      const response = await shippingOrderApi.loadShippingOrders({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      const normalized = (response || []).map(normalizeOrderRow);
      normalized.sort(compareByShipDateDesc);
      setRows(normalized);
    } catch (err) {
      console.error("[ShippingOrder] Error loading data:", err);
      showError("출하지시 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // 검색 버튼/엔터: 입력한 키워드를 한 번에 확정하고 서버 목록을 다시 불러온다.
  async function runSearch() {
    setAppliedItemCode(itemCodeQuery);
    setAppliedItemName(itemNameQuery);
    setAppliedClient(clientQuery);
    setPage(0);
    await reload();
  }

  // 목록 행 더블클릭 → 같은 lotNo 의 split 들을 모아 상세 진입.
  function openDetail(item: ShippingOrderData) {
    const splits = item.lotNo ? rows.filter((d) => d.lotNo && d.lotNo === item.lotNo) : [item];
    setActiveOrder(item);
    setSplitRows(splits.map((s) => ({ ...s })));
    setScreen("detail");
  }

  function goCreate() {
    setScreen("create");
  }
  function goEdit() {
    setScreen("edit");
  }

  // 거래명세서 출력. 상세에서 진입했으면 activeOrder, 목록이면 highlightedOrder.
  function openTradeStatement() {
    const target = activeOrder || highlightedOrder;
    if (!target?.shipOrderSq) {
      showWarning("출력할 출하지시를 목록에서 먼저 선택해주세요.");
      return;
    }
    setActiveOrder(target);
    setScreen("print");
  }

  function openShipReport() {
    if (!activeOrder?.shipOrderSq) {
      showWarning("출하성적서를 출력할 출하지시를 먼저 선택해주세요.");
      return;
    }
    setScreen("report");
  }

  async function removeOrder() {
    const targets = splitRows.filter((d) => d.shipOrderSq);
    if (targets.length === 0) return;
    const msg =
      targets.length === 1
        ? "삭제하시겠습니까?"
        : `이 출하LOT의 ${targets.length}개 split을 모두 삭제하시겠습니까?`;
    if (!(await showConfirm(msg))) return;
    try {
      await Promise.all(targets.map((d) => shippingOrderApi.removeShippingOrder(d.shipOrderSq!)));
      showSuccess("출하지시가 삭제되었습니다.");
      await reload();
      resetToList();
    } catch (err) {
      console.error("[ShippingOrder] Error deleting:", err);
      showError("삭제 중 오류가 발생했습니다.");
    }
  }

  // 마스터 공통 필드(activeOrder) + 행별 필드(split)를 합쳐 BE payload 구성.
  function toOrderPayload(d: ShippingOrderData) {
    return {
      planSq: d.planSq,
      expectedShipDate: activeOrder!.expectedShipDate,
      expectedShipTime: activeOrder!.expectedShipTime,
      customerCode: activeOrder!.customerCode,
      customerName: activeOrder!.customerName,
      itemCode: d.itemCode,
      itemName: d.itemName,
      basisWeight: d.basisWeight,
      width: d.width,
      length: d.length,
      planQty: d.planQty,
      planQtyEa: d.planQtyEa,
      currentStock: d.currentStock,
      salesOrderQty: d.salesOrderQty,
      storageLocation: d.storageLocation,
      destination: activeOrder!.destination,
      customerReq: activeOrder!.customerReq,
      productLotNo: d.productLotNo,
    };
  }

  // LOT 재배분 결과 반영. 매칭 split 은 수량만 갱신, 빠진 건은 _deleted,
  // 신규 LOT 은 _isNew. 실제 저장은 delete → update → create 순서로 처리한다.
  function applyLotReallocation(_planQty: string, allocations: LotAllocation[], force: boolean) {
    if (!activeOrder) return;
    setOverCapAcknowledged(force);
    const lengthNum = parseFloat(activeOrder.length || "0");
    const allocMap = new Map(allocations.map((a) => [a.lotNo, a.qty]));
    const template = splitRows[0] || activeOrder;

    const next: ShippingOrderData[] = [];
    splitRows.forEach((existing) => {
      if ((existing as any)._deleted) {
        next.push(existing);
        return;
      }
      const lot = existing.productLotNo || "";
      if (allocMap.has(lot)) {
        const nextQty = allocMap.get(lot)!;
        next.push({
          ...existing,
          planQty: String(nextQty),
          planQtyEa: lengthNum > 0 ? Math.ceil(nextQty / lengthNum) : 0,
        });
        allocMap.delete(lot);
      } else {
        next.push({ ...existing, _deleted: true } as any);
      }
    });
    allocMap.forEach((qty, lot) => {
      next.push({
        ...(template as ShippingOrderData),
        shipOrderSq: undefined,
        productLotNo: lot,
        planQty: String(qty),
        planQtyEa: lengthNum > 0 ? Math.ceil(qty / lengthNum) : 0,
        shipStatus: "WAIT",
        inspectRegistered: false,
        inspectJudge: "",
        _isNew: true,
      } as any);
    });
    setSplitRows(next);
  }

  async function persistEdits() {
    if (!activeOrder || splitRows.length === 0) return;
    try {
      // 단계 간 순서는 유지해야 한다(삭제→갱신→생성: BE cap 검증 통과 조건).
      // 단, 각 단계 안의 개별 호출은 서로 독립적이라 동시에 처리한다.
      // 1) 빠진 split 삭제 → 동일 수주 예약수량을 먼저 해제.
      await Promise.all(
        splitRows
          .filter((d) => (d as any)._deleted && d.shipOrderSq)
          .map((d) => shippingOrderApi.removeShippingOrder(d.shipOrderSq!))
      );
      // 2) 유지되는 기존 split 갱신.
      await Promise.all(
        splitRows
          .filter((d) => !(d as any)._deleted && !(d as any)._isNew && d.shipOrderSq)
          .map((d) => shippingOrderApi.modifyShippingOrder(d.shipOrderSq!, toOrderPayload(d)))
      );
      // 3) 신규 split 생성. 삭제·갱신 반영 후라 BE cap 검증을 정상 통과한다.
      const fresh = splitRows.filter((d) => (d as any)._isNew && !(d as any)._deleted);
      if (fresh.length > 0) {
        await shippingOrderApi.saveShippingOrderBatch(
          fresh.map((d) => ({ ...toOrderPayload(d), force: overCapAcknowledged }))
        );
      }
      showSuccess("출하지시가 수정되었습니다.");
      await reload();
      resetToList();
      setOverCapAcknowledged(false);
    } catch (err: any) {
      console.error("[ShippingOrder] Error updating:", err);
      showApiError(err, "수정 중 오류가 발생했습니다.");
    }
  }

  function resetToList() {
    setScreen("list");
    setActiveOrder(null);
    setSplitRows([]);
  }

  // 마스터 공통 필드(출하일/시간/도착지/거래처/요청사항) 변경.
  function changeMasterField(field: keyof ShippingOrderData, value: string) {
    if (activeOrder) setActiveOrder({ ...activeOrder, [field]: value });
  }

  // _deleted 제외한 활성 split + 합계.
  const visibleSplits = splitRows.filter((d) => !(d as any)._deleted);
  const splitPlanQtySum = visibleSplits.reduce((s, d) => s + (parseFloat(d.planQty) || 0), 0);
  const splitPlanQtyEaSum = visibleSplits.reduce((s, d) => s + (Number(d.planQtyEa) || 0), 0);
  const groupHasInspect = visibleSplits.some((d) => d.inspectRegistered === true);

  const lotModalInitialAllocations: LotAllocation[] = visibleSplits
    .filter((d) => !!d.productLotNo)
    .map((d) => ({ lotNo: d.productLotNo as string, qty: parseFloat(d.planQty) || 0 }));
  const lotModalSalesOrderQty = parseFloat(activeOrder?.salesOrderQty || "0") || 0;

  // 같은 수주의 다른 그룹(plan)이 이미 잡은 누적 예약수량(NG 제외).
  // 현재 그룹 split 은 재배분 대상이라 제외한다.
  const lotModalReservedQty = useMemo(() => {
    if (!activeOrder?.salesOrderDtlSq) return 0;
    return rows
      .filter((d) => d.salesOrderDtlSq === activeOrder.salesOrderDtlSq)
      .filter((d) => d.lotNo !== activeOrder.lotNo)
      .filter((d) => d.inspectJudge !== "NG")
      .reduce((sum, d) => sum + (parseFloat(d.planQty) || 0), 0);
  }, [rows, activeOrder]);

  // 키워드 필터 후 출하LOT 단위로 합산한 목록(확정된 키워드만 반영).
  const filteredRows = useMemo(() => {
    const keyItem = appliedItemCode.toLowerCase();
    const keyName = appliedItemName.toLowerCase();
    const keyClient = appliedClient.toLowerCase();
    const matched = rows.filter((row) => matchesSearchKeywords(row, keyItem, keyName, keyClient));
    return collapseByShipLot(matched);
  }, [rows, appliedItemCode, appliedItemName, appliedClient]);

  const totalElements = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  const safePage = Math.min(page, totalPages - 1);
  const baseNo = safePage * size;
  const pagedRows = useMemo(
    () => filteredRows.slice(baseNo, baseNo + size),
    [filteredRows, baseNo, size]
  );

  // toFiniteNumber 는 helper 에서 재노출(엑셀 등에서 재사용 가능하도록).
  void toFiniteNumber;

  return {
    screen,
    setScreen,
    activeOrder,
    splitRows,
    rows,
    loading,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    itemCodeQuery,
    setItemCodeQuery,
    itemNameQuery,
    setItemNameQuery,
    clientQuery,
    setClientQuery,
    page,
    setPage,
    size,
    setSize,
    lotModalOpen,
    setLotModalOpen,
    highlightedOrder,
    setHighlightedOrder,
    reload,
    runSearch,
    openDetail,
    goCreate,
    goEdit,
    openTradeStatement,
    openShipReport,
    removeOrder,
    applyLotReallocation,
    persistEdits,
    resetToList,
    changeMasterField,
    visibleSplits,
    splitPlanQtySum,
    splitPlanQtyEaSum,
    groupHasInspect,
    lotModalInitialAllocations,
    lotModalSalesOrderQty,
    lotModalReservedQty,
    filteredRows,
    totalElements,
    totalPages,
    safePage,
    baseNo,
    pagedRows,
  };
}
