import { useEffect, useState } from "react";
import * as orderApi from "../../../api/orderApi";
import * as shippingPlanApi from "../../../api/shippingPlanApi";
import { peekNextShippingLotNo } from "../../../api/shippingPlanApi";
import { ShippingPlanData } from "@/types/shipping/plan.interface";
import { showError } from "@/app/utils/toast";
import { useCrudForm } from "../../../hooks/useCrudForm";
import {
  computeRollCount,
  flattenOrderDetails,
  keepUnplannedDetails,
} from "./dispatchPlanHelpers";
import { todayYmd } from "@/app/utils/dateToday";

interface UseDispatchPlanFormArgs {
  mode: "create" | "edit";
  item?: ShippingPlanData | null;
  onBack?: () => void;
  onSave?: () => void;
}

// 단일 출하계획 수정 시 사용하는 폼 초기값을 만든다.
const buildEditDraft = (item?: ShippingPlanData | null): ShippingPlanData => ({
  planSq: item?.planSq,
  no: item?.no || "",
  customerCode: item?.customerCode || "",
  customerName: item?.customerName || "",
  itemCode: item?.itemCode || "",
  itemName: item?.itemName || "",
  basisWeight: item?.basisWeight || "",
  width: item?.width || "",
  length: item?.length || "",
  currentStock: item?.currentStock || "",
  salesOrderQty: item?.salesOrderQty || "",
  planQty: item?.planQty || "",
  planQtyEa: item?.planQtyEa ?? 0,
  lotNo: item?.lotNo || "",
  orderNo: item?.orderNo || "",
  expectedShipDate: item?.expectedShipDate || todayYmd(),
  storageLocation: item?.storageLocation || "",
  remark: item?.remark || "",
});

// 등록/수정 폼의 상태·부수효과·저장 흐름을 통째로 담당하는 훅.
export function useDispatchPlanForm({ mode, item, onBack, onSave }: UseDispatchPlanFormArgs) {
  const { saving, runSave } = useCrudForm();
  const [, setOrderList] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectableOrders, setSelectableOrders] = useState<any[]>([]);
  const [draftItems, setDraftItems] = useState<ShippingPlanData[]>([]);
  const [lotByOrder, setLotByOrder] = useState<Map<string, string>>(new Map());
  const [lotPrefix, setLotPrefix] = useState<string | null>(null);
  const [lotCounter, setLotCounter] = useState<number>(1);

  const [editDraft, setEditDraft] = useState<ShippingPlanData>(() => buildEditDraft(item));

  // 등록 모드 진입 시: 수주 목록을 채우고, 다음 Lot-No의 접두/일련번호를 미리 파싱해 둔다.
  useEffect(() => {
    if (mode === "create") {
      void loadSelectableOrders();
      peekNextShippingLotNo()
        .then((lotNo) => {
          const lastDash = lotNo.lastIndexOf("-");
          setLotPrefix(lotNo.substring(0, lastDash + 1));
          setLotCounter(parseInt(lotNo.substring(lastDash + 1), 10));
        })
        .catch(() => {});
    }
  }, []);

  // 수정 모드: 출하량/길이가 바뀔 때마다 롤수(EA)를 다시 계산한다.
  useEffect(() => {
    if (mode === "edit") {
      const rollCount = computeRollCount(editDraft.planQty, editDraft.length);
      setEditDraft((prev) => ({ ...prev, planQtyEa: rollCount }));
    }
  }, [editDraft.planQty, editDraft.length]);

  const loadSelectableOrders = async () => {
    try {
      setOrdersLoading(true);
      const orders = await orderApi.fetchOrderList();
      const flattened = flattenOrderDetails(orders);
      setOrderList(flattened);
      setSelectableOrders(keepUnplannedDetails(flattened));
    } catch (error) {
      console.error("[ShippingPlanForm] Failed to load orders:", error);
      showError("수주정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setOrdersLoading(false);
    }
  };

  // 수주 행 클릭: 이미 담긴 항목이면 빼고, 아니면 Lot-No를 배정해 담는다.
  const toggleOrderDetail = (detail: any) => {
    const { orderNo, orderDtlSq } = detail;

    const alreadyAdded = draftItems.some((row) => row.orderDtlSq === orderDtlSq);
    if (alreadyAdded) {
      const remaining = draftItems.filter((row) => row.orderDtlSq !== orderDtlSq);
      setDraftItems(remaining.map((row, idx) => ({ ...row, no: idx + 1 })));
      const orderStillPresent = remaining.some((row) => row.orderNo === orderNo);
      if (!orderStillPresent) {
        const nextMap = new Map(lotByOrder);
        nextMap.delete(orderNo);
        setLotByOrder(nextMap);
      }
      return;
    }

    let lotNo = lotByOrder.get(orderNo);
    if (!lotNo) {
      lotNo = lotPrefix ? lotPrefix + String(lotCounter).padStart(3, "0") : `SH-${orderNo}`;
      const nextMap = new Map(lotByOrder);
      nextMap.set(orderNo, lotNo);
      setLotByOrder(nextMap);
      setLotCounter((prev) => prev + 1);
    }

    const addedItem: ShippingPlanData = {
      selected: true,
      no: 0,
      orderDtlSq: detail.orderDtlSq,
      orderNo,
      lotNo,
      customerCode: detail.customerCode,
      customerName: detail.customerName,
      customerSq: detail.customerSq,
      itemCode: detail.itemCode,
      itemName: detail.itemName,
      itemSq: detail.itemSq,
      basisWeight: detail.basisWeight || "",
      width: detail.width || "",
      length: detail.length || "",
      salesOrderQty: detail.salesOrderQty || "",
      currentStock: "",
      storageLocation: "",
      planQty: "",
      planQtyEa: 0,
      expectedShipDate: todayYmd(),
      remark: "",
    };

    setDraftItems((prev) => {
      const merged = [...prev, addedItem];
      return merged.map((row, idx) => ({ ...row, no: idx + 1 }));
    });
  };

  const updateDraftShipDate = (idx: number, value: string) => {
    setDraftItems((prev) =>
      prev.map((row, i) => (i !== idx ? row : { ...row, expectedShipDate: value })),
    );
  };

  const updateDraftRemark = (idx: number, value: string) => {
    setDraftItems((prev) => prev.map((row, i) => (i !== idx ? row : { ...row, remark: value })));
  };

  // 등록 목록에서 출하량을 직접 입력하면 롤수(EA)를 즉시 갱신한다.
  const updateDraftPlanQty = (idx: number, value: string) => {
    setDraftItems((prev) =>
      prev.map((row, i) =>
        i !== idx ? row : { ...row, planQty: value, planQtyEa: computeRollCount(value, row.length) },
      ),
    );
  };

  const submitForm = () => {
    runSave({
      validate: () => {
        if (mode === "create") {
          if (draftItems.length === 0) {
            return "저장할 출하계획을 추가해주세요.";
          }
          const missingQty = draftItems.find(
            (row) => !row.planQty || parseFloat(row.planQty) <= 0,
          );
          if (missingQty) {
            return "출하량(m)이 입력되지 않은 항목이 있습니다.";
          }
          return null;
        }
        if (!editDraft.itemCode || !editDraft.itemName) {
          return "필수 항목을 입력해주세요.";
        }
        return null;
      },
      submit: async () => {
        if (mode === "create") {
          const payload = draftItems.map((row) => ({
            salesOrderDtlSq: row.orderDtlSq,
            customerCode: row.customerCode,
            customerName: row.customerName,
            itemCode: row.itemCode,
            itemName: row.itemName,
            basisWeight: row.basisWeight,
            width: row.width,
            length: row.length,
            salesOrderQty: row.salesOrderQty,
            currentStock: row.currentStock,
            planQty: row.planQty,
            planQtyEa: row.planQtyEa,
            lotNo: row.lotNo || "",
            orderNo: row.orderNo || "",
            expectedShipDate: row.expectedShipDate,
            storageLocation: row.storageLocation,
            remark: row.remark || "",
          }));
          await shippingPlanApi.saveShippingPlanBatch(payload);
          return;
        }

        const payload: shippingPlanApi.ShippingPlanSaveReq = {
          planSq: editDraft.planSq,
          customerCode: editDraft.customerCode,
          customerName: editDraft.customerName,
          itemCode: editDraft.itemCode,
          itemName: editDraft.itemName,
          basisWeight: editDraft.basisWeight,
          width: editDraft.width,
          length: editDraft.length,
          salesOrderQty: editDraft.salesOrderQty,
          currentStock: editDraft.currentStock,
          planQty: editDraft.planQty,
          planQtyEa: editDraft.planQtyEa,
          expectedShipDate: editDraft.expectedShipDate,
          storageLocation: editDraft.storageLocation,
          remark: editDraft.remark,
        };

        if (editDraft.planSq) {
          await shippingPlanApi.modifyShippingPlan(editDraft.planSq, payload);
        } else {
          await shippingPlanApi.saveShippingPlan(payload);
        }
      },
      successMessage:
        mode === "create"
          ? `${draftItems.length}건의 출하계획이 등록되었습니다.`
          : "출하계획이 수정되었습니다.",
      onSuccess: () => {
        onSave?.();
        onBack?.();
      },
      onError: (error) => {
        console.error("[ShippingPlanForm] Error saving:", error);
        showError("출하계획 저장 중 오류가 발생했습니다.");
      },
    });
  };

  const addedDtlSqSet = new Set(draftItems.map((row) => row.orderDtlSq));

  return {
    saving,
    ordersLoading,
    selectableOrders,
    draftItems,
    editDraft,
    setEditDraft,
    addedDtlSqSet,
    toggleOrderDetail,
    updateDraftShipDate,
    updateDraftRemark,
    updateDraftPlanQty,
    submitForm,
  };
}
