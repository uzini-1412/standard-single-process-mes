/** 가입고 등록 화면 상태/로직 훅: 후보 발주 조회, 행 선택→LOT 채번, 입력 검증, 저장, 가입고 조정. */
import { useEffect, useState } from "react";
import * as preReceivingApi from "../../../api/preReceivingApi";
import * as purchaseOrderApi from "../../../api/purchaseOrderApi";
import * as itemApi from "../../../api/itemApi";
import { AvailableOrderItem, PreReceivingTableItem } from "@/types/material/prereceive.interface";
import { showSuccess, showWarning, showError } from "@/app/utils/toast";
import { ensureDateOrder } from "@/app/utils/dateGuard";
import { buildAvailableOrders, validateInboundQty } from "./incomingPrepHelpers";
import { todayYmd } from "@/app/utils/dateToday";

type FieldErrors = { [rowNo: number]: { inboundQty: string; inboundDate: string } };
type AdjustDirection = "plus" | "minus";

export function useIncomingPrepEntry() {
  // 검색 조건(발주일자 범위)
  const [searchDateFrom, setSearchDateFrom] = useState("");
  const [searchDateTo, setSearchDateTo] = useState("");

  // 가입고 후보 발주 목록
  const [availableOrders, setAvailableOrders] = useState<AvailableOrderItem[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // 후보 목록 클라이언트 페이징
  const [availPage, setAvailPage] = useState(0);
  const [availSize, setAvailSize] = useState(50);

  // 체크된 후보 행과 검증 에러
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [errors, setErrors] = useState<FieldErrors>({});

  // 하단 입력 테이블 + 저장 진행 플래그
  const [tableItems, setTableItems] = useState<PreReceivingTableItem[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);

  // 가입고 이력
  const [inboundHistory, setInboundHistory] = useState<preReceivingApi.InboundRes[]>([]);

  // 조정 팝업 상태
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<preReceivingApi.InboundRes | null>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustType, setAdjustType] = useState<AdjustDirection>("plus");

  // 발주/품목/입고 데이터를 한 번에 받아 후보 행으로 합쳐 보관
  const reloadOrders = async () => {
    try {
      setIsLoadingOrders(true);
      // 발주/품목/입고 목록은 서로 독립적이라 동시에 조회한다.
      const [orders, items, inbounds] = await Promise.all([
        purchaseOrderApi.loadPurchaseOrders({
          dateFrom: searchDateFrom || undefined,
          dateTo: searchDateTo || undefined,
        }),
        itemApi.fetchItemList(),
        preReceivingApi.loadInbounds({}),
      ]);
      setInboundHistory(inbounds);
      setAvailableOrders(buildAvailableOrders(orders, items, inbounds));
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    void reloadOrders();
  }, []);

  // 행 토글: 해제 시 하단 테이블에서 제거, 선택 시 LOT-No 미리채번 후 추가
  const toggleRow = async (no: number) => {
    const nextSelected = new Set(selectedRows);
    if (nextSelected.has(no)) {
      nextSelected.delete(no);
      setTableItems((prev) => prev.filter((item) => item.no !== no));
    } else {
      nextSelected.add(no);
      const order = availableOrders.find((o) => o.no === no);
      if (order) {
        let purchaseLotNoPreview = "";
        try {
          // 서버에서 다음 구매 LOT-No 실제값을 미리 받아 표시
          purchaseLotNoPreview = await preReceivingApi.nextPurchaseLotNo(order.orderDtlSq);
        } catch (e) {
          console.error("Error generating purchase lot no:", e);
        }
        setTableItems((prev) => [
          ...prev,
          {
            ...order,
            selected: true,
            inboundQty: "",
            inboundDate: todayYmd(),
            purchaseLotNoPreview,
          },
        ]);
      }
    }
    setSelectedRows(nextSelected);
  };

  // 단일 행의 수량 검증 결과를 errors에 반영
  const checkQty = (no: number, inboundQtyStr: string, orderQtyStr: string, existingTotal: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      if (!next[no]) next[no] = { inboundQty: "", inboundDate: "" };
      next[no] = { ...next[no], inboundQty: validateInboundQty(inboundQtyStr, orderQtyStr, existingTotal) };
      return next;
    });
  };

  // 하단 테이블 수량 입력 변경
  const changeInboundQty = (index: number, value: string) => {
    setTableItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], inboundQty: value };
      return next;
    });
    const row = tableItems[index];
    checkQty(row.no, value, row.orderQty, row.totalInboundQty);
  };

  // 하단 테이블 가입고일자 변경 + 발주일 이전 금지 검증
  const changeInboundDate = (index: number, value: string) => {
    const next = [...tableItems];
    next[index] = { ...next[index], inboundDate: value };
    setTableItems(next);

    const row = next[index];
    setErrors((prev) => {
      const updated = { ...prev };
      if (!updated[row.no]) updated[row.no] = { inboundQty: "", inboundDate: "" };
      updated[row.no] = {
        ...updated[row.no],
        inboundDate: ensureDateOrder(row.orderDate, value, "발주일자", "가입고일자") ?? "",
      };
      return updated;
    });
  };

  // 체크된 후보의 가입고 이력만 추려 노출
  const selectedOrders = availableOrders.filter((o) => selectedRows.has(o.no));
  const filteredHistoryItems = inboundHistory.filter((h) =>
    selectedOrders.some((o) => o.orderDtlSq === h.orderDtlSq),
  );

  // 저장: 전체 재검증 후 이상 없으면 일괄 등록
  const submit = async () => {
    const targets = tableItems.filter((item) => item.selected);
    if (targets.length === 0 || isRegistering) return;

    let dateErrorFound = false;
    const nextErrors: FieldErrors = { ...errors };

    targets.forEach((item) => {
      if (!nextErrors[item.no]) nextErrors[item.no] = { inboundQty: "", inboundDate: "" };
      nextErrors[item.no] = {
        ...nextErrors[item.no],
        inboundQty: validateInboundQty(item.inboundQty, item.orderQty, item.totalInboundQty),
      };
      const dateErr = ensureDateOrder(item.orderDate, item.inboundDate, "발주일자", "가입고일자");
      if (dateErr) {
        nextErrors[item.no] = { ...nextErrors[item.no], inboundDate: dateErr };
        dateErrorFound = true;
      }
    });
    setErrors(nextErrors);

    const hasQtyError = targets.some((item) => nextErrors[item.no]?.inboundQty);
    if (hasQtyError || dateErrorFound) {
      showWarning("입력값을 확인해주세요.");
      return;
    }

    setIsRegistering(true);
    try {
      const payload: preReceivingApi.InboundSaveReq[] = targets.map((item) => ({
        inboundSq: null,
        orderDtlSq: item.orderDtlSq,
        itemSq: item.itemSq,
        inboundDate: item.inboundDate,
        inboundQty: parseInt(item.inboundQty, 10) || 0,
        remark: "",
        writerId: "admin",
        inboundType: "REGISTER",
      }));

      await preReceivingApi.persistInbounds(payload);
      showSuccess("가입고정보가 저장되었습니다.");
      setTableItems([]);
      setSelectedRows(new Set());
      await reloadOrders();
    } catch (error) {
      console.error("Error registering pre-receiving:", error);
      showError("가입고 저장 중 오류가 발생했습니다.");
    } finally {
      setTimeout(() => setIsRegistering(false), 2000);
    }
  };

  // 조정 팝업 열기
  const openAdjust = (item: preReceivingApi.InboundRes, type: AdjustDirection) => {
    setAdjustTarget(item);
    setAdjustType(type);
    setAdjustQty("");
    setAdjustOpen(true);
  };

  // 조정 저장: 양수 검증 후 부호 적용하여 ADJUST 건 등록
  const submitAdjust = async () => {
    if (!adjustTarget || !adjustQty) return;
    const qty = parseInt(adjustQty, 10);
    if (isNaN(qty) || qty <= 0) {
      showWarning("조정 수량을 올바르게 입력해주세요.");
      return;
    }
    const signedQty = adjustType === "minus" ? -qty : qty;

    try {
      await preReceivingApi.persistInbounds([
        {
          inboundSq: null,
          orderDtlSq: adjustTarget.orderDtlSq,
          itemSq: adjustTarget.itemSq,
          inboundDate: todayYmd(),
          inboundQty: signedQty,
          remark: `가입고 조정 (${adjustType === "plus" ? "추가" : "감소"} ${qty})`,
          writerId: "admin",
          inboundType: "ADJUST",
          lotNo: adjustTarget.lotNo,
          purchaseLotNo: adjustTarget.purchaseLotNo,
        },
      ]);

      showSuccess("가입고 조정이 완료되었습니다.");
      setAdjustOpen(false);
      setAdjustTarget(null);
      await reloadOrders();
    } catch (error) {
      console.error("Error adjusting:", error);
      showError("가입고 조정 중 오류가 발생했습니다.");
    }
  };

  return {
    // 검색
    searchDateFrom,
    setSearchDateFrom,
    searchDateTo,
    setSearchDateTo,
    runSearch: reloadOrders,
    // 후보 목록
    availableOrders,
    isLoadingOrders,
    availPage,
    setAvailPage,
    availSize,
    setAvailSize,
    selectedRows,
    toggleRow,
    // 하단 입력 테이블
    tableItems,
    errors,
    changeInboundQty,
    changeInboundDate,
    checkQty,
    // 이력
    filteredHistoryItems,
    // 저장
    isRegistering,
    submit,
    // 조정 팝업
    adjustOpen,
    setAdjustOpen,
    adjustTarget,
    adjustQty,
    setAdjustQty,
    adjustType,
    openAdjust,
    submitAdjust,
  };
}
