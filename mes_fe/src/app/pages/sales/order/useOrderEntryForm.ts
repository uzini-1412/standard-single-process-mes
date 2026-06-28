import { useEffect, useState } from "react";
import * as clientApi from "@/app/api/clientApi";
import * as commonInfoApi from "@/app/api/commonInfoApi";
import * as orderApi from "@/app/api/orderApi";
import { showError, showSuccess, showWarning } from "@/app/utils/toast";
import { ensureDateOrder } from "@/app/utils/dateGuard";
import type { OrderItem } from "@/types/sales/order.interface";
import {
  buildLineFromProduct,
  recomputeLineMetrics,
  resolveTodayIso,
} from "./orderEntryCalc";

interface UseOrderEntryFormParams {
  mode: "create" | "edit";
  selectedId?: number;
  onBack: () => void;
  onRegister: (data: orderApi.OrderSaveReq) => void;
}

interface OrderFormErrors {
  customerName: boolean;
  orderDate: boolean;
  deliveryDate: boolean;
}

const CLEAN_ERRORS: OrderFormErrors = {
  customerName: false,
  orderDate: false,
  deliveryDate: false,
};

const AUTO_ORDER_NO = "자동 생성";

// 서버 상세 라인을 폼에서 다루는 문자열 기반 OrderItem으로 변환.
function mapDetailToLine(
  detail: orderApi.OrderDetailRes,
  index: number,
): OrderItem {
  const text = (value: unknown) => (value != null ? String(value) : "");
  return {
    selected: true,
    no: index + 1,
    itemSq: detail.itemSq,
    itemCode: detail.itemCode || "",
    itemName: detail.itemName || "",
    basisWeight: text(detail.basisWeight),
    width: text(detail.width),
    length: text(detail.length),
    orderQty: text(detail.orderQty),
    orderQtyEa: text(detail.orderQtyEa),
    orderQtyM2: text(detail.orderQtyM2),
    weight: text(detail.weight),
    unitPrice: text(detail.unitPrice),
    unitVatAmt: detail.unitVatAmt != null ? String(detail.unitVatAmt) : "0",
    supplyAmt: text(detail.supplyAmt),
    vatAmt: text(detail.vatAmt),
    totalAmt: text(detail.totalAmt),
  };
}

export function useOrderEntryForm({
  mode,
  selectedId,
  onBack,
  onRegister,
}: UseOrderEntryFormParams) {
  const [loading, setLoading] = useState(mode === "edit");
  const [isSaving, setIsSaving] = useState(false);
  const [isProductSelectOpen, setIsProductSelectOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [customerSq, setCustomerSq] = useState<number | null>(null);
  const [customerCode, setCustomerCode] = useState("");
  const [clientList, setClientList] = useState<clientApi.ClientRes[]>([]);
  const [paymentTerms, setPaymentTerms] = useState("");
  const [paymentTermsList, setPaymentTermsList] = useState<string[]>([]);
  const [orderNumber, setOrderNumber] = useState(AUTO_ORDER_NO);
  const [orderDate, setOrderDate] = useState(resolveTodayIso());
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [note, setNote] = useState("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [errors, setErrors] = useState<OrderFormErrors>(CLEAN_ERRORS);

  useEffect(() => {
    void bootstrap();
  }, [mode, selectedId]);

  // 거래처 목록(공급사 제외)과 결제조건 옵션을 적재한다.
  const loadReferenceData = async () => {
    // 거래처 목록과 결제조건 옵션은 독립적이라 동시에 조회한다.
    const [clients, terms] = await Promise.all([
      clientApi.fetchClientList(),
      commonInfoApi.fetchDetailContentsByItemName("결제조건").catch((error) => {
        console.error("Failed to load payment terms:", error);
        return [] as string[];
      }),
    ]);
    setClientList(clients.filter((client) => client.customerType !== "공급사"));
    setPaymentTermsList(terms);
  };

  // 수정 모드: 기존 수주 1건을 읽어 폼 상태를 채운다.
  const hydrateFromExisting = async (orderSq: number) => {
    const data = await orderApi.fetchOrderById(orderSq);
    setOrderNumber(data.orderNo || "");
    setClientName(data.customerName || "");
    setCustomerSq(data.customerSq);
    setCustomerCode(data.customerCode || "");
    setOrderDate(data.orderDate || resolveTodayIso());
    setDeliveryDate(data.deliveryReqDate || "");
    setDeliveryLocation(data.deliveryPlace || "");
    setPaymentTerms(data.paymentTerms || "");
    setNote(data.remark || "");
    setOrderItems((data.details || []).map(mapDetailToLine));
  };

  // 등록 모드: 오늘 날짜를 세팅하고 새 수주번호를 발번한다.
  const prepareNewOrder = async () => {
    setOrderDate(resolveTodayIso());
    try {
      const nextOrderNo = await orderApi.generateOrderNo();
      setOrderNumber(nextOrderNo || AUTO_ORDER_NO);
    } catch (error) {
      console.error("Failed to generate order number:", error);
      setOrderNumber(AUTO_ORDER_NO);
    }
  };

  const bootstrap = async () => {
    try {
      setLoading(true);
      // 참조 데이터(거래처/결제조건)와 폼 초기화(기존 조회 or 신규 발번)는
      // 서로 독립적이라 동시에 진행한다.
      const initForm =
        mode === "edit" && selectedId
          ? hydrateFromExisting(selectedId)
          : prepareNewOrder();
      await Promise.all([loadReferenceData(), initForm]);
    } catch (error) {
      console.error("Failed to initialize order form:", error);
      showError("수주 등록 화면을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleClientSelect = (value: string) => {
    setClientName(value);
    setErrors((prev) => ({ ...prev, customerName: false }));

    const picked = clientList.find((client) => client.customerName === value);
    if (!picked) {
      return;
    }

    // 거래처가 실제로 바뀌면 담아둔 품목을 비운다.
    if (customerSq !== picked.customerSq) {
      setOrderItems([]);
    }

    setCustomerSq(picked.customerSq);
    setCustomerCode(picked.customerCode);
  };

  const handleOrderDateChange = (value: string) => {
    setOrderDate(value);
    // 과거 날짜여도 등록은 허용하되 하단에 안내만 표기.
    const isPast = !!(value && value < resolveTodayIso());
    setErrors((prev) => ({
      ...prev,
      orderDate: isPast,
      deliveryDate: !!(deliveryDate && value && deliveryDate < value),
    }));
  };

  const handleDeliveryDateChange = (value: string) => {
    setDeliveryDate(value);
    setErrors((prev) => ({
      ...prev,
      deliveryDate: !!(value && orderDate && value < orderDate),
    }));
  };

  const handleProductSelect = (products: any[]) => {
    const keyOf = (itemSq: any, width: any) => `${itemSq ?? ""}|${width ?? ""}`;
    const alreadyAdded = new Set(
      orderItems.map((item) => keyOf(item.itemSq, item.width)),
    );
    const seenInBatch = new Set<string>();
    const appended: OrderItem[] = [];
    let dropped = 0;

    for (const product of products) {
      const key = keyOf(product.itemSq, product.width);
      if (alreadyAdded.has(key) || seenInBatch.has(key)) {
        dropped += 1;
        continue;
      }
      seenInBatch.add(key);
      appended.push(
        buildLineFromProduct(product, orderItems.length + appended.length + 1),
      );
    }

    if (dropped > 0) {
      showWarning(`이미 추가된 품목 ${dropped}건은 제외되었습니다.`);
    }

    if (appended.length > 0) {
      setOrderItems((prev) => [...prev, ...appended]);
    }
  };

  // 특정 라인의 한 필드만 바꾼 뒤 파생값을 재계산하는 공통 처리.
  const updateLineField = (
    index: number,
    patch: Partial<Pick<OrderItem, "orderQty" | "unitVatAmt">>,
  ) => {
    setOrderItems((prev) =>
      prev.map((item, i) =>
        i === index ? recomputeLineMetrics({ ...item, ...patch }) : item,
      ),
    );
  };

  const handleOrderQuantityChange = (index: number, value: string) =>
    updateLineField(index, { orderQty: value });

  const handleUnitVatAmtChange = (index: number, value: string) =>
    updateLineField(index, { unitVatAmt: value });

  const handleOrderItemSelectedChange = (index: number, checked: boolean) => {
    setOrderItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, selected: checked } : item,
      ),
    );
  };

  // 저장 직전 검증 결과를 한 번에 산출.
  const collectValidation = (): OrderFormErrors => ({
    customerName: !customerSq,
    // 과거 수주일자는 표기만, 저장은 막지 않는다.
    orderDate: !!(orderDate && orderDate < resolveTodayIso()),
    deliveryDate: !!(deliveryDate && orderDate && deliveryDate < orderDate),
  });

  const handleSave = async () => {
    const nextErrors = collectValidation();
    setErrors(nextErrors);

    if (nextErrors.customerName) {
      showWarning("필수항목 거래처명을 선택해주세요.");
      return;
    }

    if (nextErrors.deliveryDate) {
      showWarning(
        ensureDateOrder(orderDate, deliveryDate, "수주일자", "납품요청일") ?? "",
      );
      return;
    }

    const chosenItems = orderItems.filter((item) => item.selected);
    if (chosenItems.length === 0) {
      showWarning("저장할 품목을 선택해주세요.");
      return;
    }

    try {
      setIsSaving(true);

      const num = (value: string) => parseFloat(value) || 0;
      const optNum = (value: string) => (value ? parseFloat(value) : undefined);

      const saveData: orderApi.OrderSaveReq = {
        orderSq: mode === "edit" && selectedId ? selectedId : undefined,
        orderNo: orderNumber !== AUTO_ORDER_NO ? orderNumber : undefined,
        customerSq: customerSq!,
        orderDate,
        deliveryReqDate: deliveryDate || undefined,
        deliveryPlace: deliveryLocation || undefined,
        paymentTerms: paymentTerms || undefined,
        remark: note || undefined,
        details: chosenItems.map((item) => ({
          itemSq: item.itemSq!,
          orderQty: num(item.orderQty),
          orderQtyEa: optNum(item.orderQtyEa),
          orderQtyM2: optNum(item.orderQtyM2),
          unitPrice: num(item.unitPrice),
          unitVatAmt: num(item.unitVatAmt),
          basisWeight: optNum(item.basisWeight),
          width: optNum(item.width),
          length: optNum(item.length),
          weight: optNum(item.weight),
          supplyAmt: optNum(item.supplyAmt),
          vatAmt: optNum(item.vatAmt),
          totalAmt: optNum(item.totalAmt),
        })),
      };

      await orderApi.saveOrder(saveData);
      showSuccess(
        mode === "edit"
          ? "수주정보가 수정되었습니다."
          : "수주정보가 등록되었습니다.",
      );
      onRegister(saveData);
      onBack();
    } catch (error) {
      console.error("Failed to save order:", error);
      showError("수주정보 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    loading,
    isSaving,
    isProductSelectOpen,
    setIsProductSelectOpen,
    clientName,
    customerSq,
    customerCode,
    clientList,
    paymentTerms,
    paymentTermsList,
    orderNumber,
    orderDate,
    deliveryDate,
    deliveryLocation,
    note,
    orderItems,
    errors,
    setPaymentTerms,
    setDeliveryLocation,
    setNote,
    handleClientSelect,
    handleOrderDateChange,
    handleDeliveryDateChange,
    handleProductSelect,
    handleOrderQuantityChange,
    handleUnitVatAmtChange,
    handleOrderItemSelectedChange,
    handleSave,
  };
}
