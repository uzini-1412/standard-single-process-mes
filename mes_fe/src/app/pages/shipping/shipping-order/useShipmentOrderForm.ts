// 출하지시 등록 폼의 상태·동작 일체를 캡슐화한 훅.
// 출하계획 선택 → LOT 배분 → 목록 누적 → 일괄 저장 흐름을 담당한다.
import { useState, useEffect } from "react";
import * as shippingPlanApi from "../../../api/shippingPlanApi";
import * as shippingOrderApi from "../../../api/shippingOrderApi";
import { ShippingOrderData, ShippingOrderItem } from "@/types/shipping/order.interface";
import { showWarning, showError } from "@/app/utils/toast";
import { ensureDateOrder } from "@/app/utils/dateGuard";
import type { LotAllocation } from "../../../components/features/shipping/LotSelectModal";
import { useCrudForm } from "../../../hooks/useCrudForm";
import { deriveRollCount } from "./shipmentOrderHelpers";
import { todayYmd } from "@/app/utils/dateToday";

// 비어있는 폼 초기값. 출하일만 오늘 날짜로 채워 둔다.
function blankFormState(): ShippingOrderData {
  return {
    expectedShipDate: todayYmd(),
    customerCode: "",
    customerName: "",
    itemCode: "",
    itemName: "",
    basisWeight: "",
    width: "",
    length: "",
    planQty: "",
    planQtyEa: 0,
    currentStock: "",
    salesOrderQty: "",
    storageLocation: "",
    destination: "",
    expectedShipTime: "",
    customerReq: "",
    productLotNo: "",
  };
}

interface FormHookArgs {
  onBack?: () => void;
  onSave?: () => void;
}

export function useShipmentOrderForm({ onBack, onSave }: FormHookArgs) {
  const { saving, runSave } = useCrudForm();
  const [formData, setFormData] = useState<ShippingOrderData>(blankFormState());
  const [planRows, setPlanRows] = useState<any[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [stagedItems, setStagedItems] = useState<ShippingOrderItem[]>([]);
  const [activePlanSq, setActivePlanSq] = useState<number | undefined>(undefined);
  const [orderDateOfPlan, setOrderDateOfPlan] = useState("");
  const [shipDateInvalid, setShipDateInvalid] = useState(false);

  // LOT 선택 모달이 확정한 LOT별 출하 수량. 출하지시량 = 이 합계가 진실의 원천.
  const [allocations, setAllocations] = useState<LotAllocation[]>([]);
  const [lotModalVisible, setLotModalVisible] = useState(false);
  // 수주잔여 초과분을 사용자가 승인했는지 여부 (모달에서 "확인" 선택 시 true).
  const [overCapAcknowledged, setOverCapAcknowledged] = useState(false);
  // 선택 plan 의 수주잔여 산정 컨텍스트 (모달로 전달).
  const [planSalesOrderQty, setPlanSalesOrderQty] = useState(0);
  const [planReservedQty, setPlanReservedQty] = useState(0);
  const [planQtyBaseline, setPlanQtyBaseline] = useState(0);
  const [planSalesOrderDtlSq, setPlanSalesOrderDtlSq] = useState<number | undefined>(undefined);

  // 첫 렌더에서 출하계획 목록 적재.
  useEffect(() => {
    void fetchPlans();
  }, []);

  // 출하지시량/길이가 바뀔 때마다 롤수(EA)를 다시 계산.
  useEffect(() => {
    const ea = deriveRollCount(parseFloat(formData.planQty), parseFloat(formData.length));
    setFormData((prev) => ({ ...prev, planQtyEa: ea }));
  }, [formData.planQty, formData.length]);

  async function fetchPlans() {
    try {
      setPlansLoading(true);
      const plans = await shippingPlanApi.loadShippingPlans();
      setPlanRows(plans);
    } catch (err) {
      console.error("[ShippingOrderForm] Failed to load plans:", err);
      showError("출하계획 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setPlansLoading(false);
    }
  }

  // 같은 수주(salesOrderDtlSq)에 대해 현재 화면 하단 목록이 잡고 있는 수량 합계.
  function pendingQtyForSalesOrder(salesOrderDtlSq: number | null | undefined): number {
    if (salesOrderDtlSq == null) return 0;
    return stagedItems
      .filter((it) => it.salesOrderDtlSq === salesOrderDtlSq)
      .reduce((sum, it) => sum + (parseFloat(it.planQty) || 0), 0);
  }

  // 출하계획 한 행을 골랐을 때: 폼 채우기 + 모달용 잔여 컨텍스트 세팅.
  function selectPlan(plan: any) {
    setActivePlanSq(plan.planSq);
    setOrderDateOfPlan(plan.orderDate || "");
    setShipDateInvalid(false);
    setAllocations([]);
    setOverCapAcknowledged(false);

    const salesOrderQtyNum = parseFloat(plan.salesOrderQty) || 0;
    const reservedFromDb = parseFloat(plan.reservedQty) || 0;
    setPlanSalesOrderQty(salesOrderQtyNum);
    setPlanReservedQty(reservedFromDb + pendingQtyForSalesOrder(plan.salesOrderDtlSq));
    setPlanQtyBaseline(parseFloat(plan.planQty) || 0);
    setPlanSalesOrderDtlSq(plan.salesOrderDtlSq);

    const ea = deriveRollCount(parseFloat(plan.planQty), parseFloat(plan.length));
    setFormData({
      planSq: plan.planSq,
      salesOrderDtlSq: plan.salesOrderDtlSq,
      expectedShipDate: plan.expectedShipDate || todayYmd(),
      customerCode: plan.customerCode || "",
      customerName: plan.customerName || "",
      itemCode: plan.itemCode || "",
      itemName: plan.itemName || "",
      basisWeight: plan.basisWeight?.toString() || "",
      width: plan.width?.toString() || "",
      length: plan.length?.toString() || "",
      planQty: plan.planQty?.toString() || "",
      planQtyEa: ea,
      currentStock: plan.currentStock?.toString() || "",
      salesOrderQty: plan.salesOrderQty?.toString() || "",
      storageLocation: plan.storageLocation || "",
      destination: plan.deliveryPlace || "",
      expectedShipTime: "",
      customerReq: "",
      productLotNo: "",
    });
  }

  // 모달이 LOT별 수량을 확정했을 때. force=true 면 수주잔여 초과를 승인한 것.
  function applyLotAllocations(planQty: string, nextAllocations: LotAllocation[], force: boolean) {
    setAllocations(nextAllocations);
    setOverCapAcknowledged(force);
    const ea = deriveRollCount(parseFloat(planQty), parseFloat(formData.length));
    setFormData((prev) => ({
      ...prev,
      planQty,
      planQtyEa: ea,
      // 단일 LOT 이면 기존 productLotNo 필드도 호환 유지.
      productLotNo: nextAllocations.length === 1 ? nextAllocations[0].lotNo : "",
    }));
  }

  function openLotModal() {
    if (!formData.itemCode) {
      showWarning("출하계획에서 품목을 먼저 선택해주세요.");
      return;
    }
    setLotModalVisible(true);
  }

  const lotSummaryText =
    allocations.length === 0 ? "" : allocations.map((a) => `${a.lotNo}: ${a.qty}m`).join(", ");

  // 폼 단일 필드 변경. 출하일 변경 시 수주일자와 선후관계를 즉시 검증.
  function changeField(field: keyof ShippingOrderData, value: string) {
    setFormData({ ...formData, [field]: value });
    if (field === "expectedShipDate") {
      setShipDateInvalid(!!value && !!orderDateOfPlan && value < orderDateOfPlan);
    }
  }

  // 입력 폼 → 하단 출하지시 품목 목록으로 적재 (LOT 단위로 행 분리).
  function stageCurrentForm() {
    if (!formData.itemCode || !formData.itemName) {
      showWarning("필수항목 품번, 품명을 입력해주세요.");
      return;
    }
    if (allocations.length === 0) {
      showWarning("LOT 선택 모달에서 출하할 제품 LOT을 선택해주세요.");
      return;
    }
    const dateErr = ensureDateOrder(orderDateOfPlan, formData.expectedShipDate, "수주일자", "출하일");
    if (dateErr) {
      setShipDateInvalid(true);
      showWarning(dateErr);
      return;
    }

    const lengthNum = parseFloat(formData.length);
    const offset = stagedItems.length;
    const appended: ShippingOrderItem[] = allocations.map((alloc, idx) => ({
      ...formData,
      planQty: String(alloc.qty),
      planQtyEa: !Number.isNaN(lengthNum) && lengthNum > 0 ? Math.ceil(alloc.qty / lengthNum) : 0,
      productLotNo: alloc.lotNo,
      // 행마다 초과승인 플래그를 동봉해 저장 시 force 로 전송.
      force: overCapAcknowledged,
      selected: true,
      no: offset + idx + 1,
    }));

    setStagedItems([...stagedItems, ...appended]);
    setActivePlanSq(undefined);
    setOrderDateOfPlan("");
    setShipDateInvalid(false);
    setAllocations([]);
    setOverCapAcknowledged(false);
    setPlanSalesOrderQty(0);
    setPlanReservedQty(0);
    setPlanQtyBaseline(0);
    setPlanSalesOrderDtlSq(undefined);
    setFormData(blankFormState());
  }

  function toggleStagedSelection(index: number) {
    const next = [...stagedItems];
    next[index].selected = !next[index].selected;
    setStagedItems(next);
  }

  // 같은 수주의 잔여(DB 누적 + 하단 pending)가 수주수량 미만인 plan 만 노출.
  function visiblePlans(): any[] {
    return planRows.filter((plan) => {
      const salesOrderQty = parseFloat(plan.salesOrderQty) || 0;
      if (salesOrderQty <= 0) return true;
      const reservedQty = parseFloat(plan.reservedQty) || 0;
      return reservedQty + pendingQtyForSalesOrder(plan.salesOrderDtlSq) < salesOrderQty;
    });
  }

  function submit() {
    const chosen = stagedItems.filter((it) => it.selected);
    runSave({
      validate: () => (chosen.length === 0 ? "저장할 출하지시를 추가해주세요." : null),
      submit: async () => {
        const payload = chosen.map((it) => ({
          planSq: it.planSq,
          expectedShipDate: it.expectedShipDate,
          expectedShipTime: it.expectedShipTime,
          customerCode: it.customerCode,
          customerName: it.customerName,
          itemCode: it.itemCode,
          itemName: it.itemName,
          basisWeight: it.basisWeight,
          width: it.width,
          length: it.length,
          planQty: it.planQty,
          planQtyEa: it.planQtyEa,
          currentStock: it.currentStock,
          salesOrderQty: it.salesOrderQty,
          storageLocation: it.storageLocation,
          destination: it.destination,
          customerReq: it.customerReq,
          productLotNo: it.productLotNo,
          // 초과승인 시 BE cap 검증을 건너뛴다.
          force: it.force === true,
        }));
        await shippingOrderApi.saveShippingOrderBatch(payload);
      },
      successMessage: `${chosen.length}건의 출하지시가 등록되었습니다.`,
      onSuccess: () => {
        onSave?.();
        onBack?.();
      },
      onError: (err) => {
        console.error("[ShippingOrderForm] Error saving:", err);
        showError("출하지시 저장 중 오류가 발생했습니다.");
      },
    });
  }

  return {
    saving,
    formData,
    plansLoading,
    stagedItems,
    activePlanSq,
    orderDateOfPlan,
    shipDateInvalid,
    allocations,
    lotModalVisible,
    setLotModalVisible,
    lotSummaryText,
    planSalesOrderQty,
    planReservedQty,
    planQtyBaseline,
    planSalesOrderDtlSq,
    selectPlan,
    applyLotAllocations,
    openLotModal,
    changeField,
    stageCurrentForm,
    toggleStagedSelection,
    visiblePlans,
    submit,
  };
}
