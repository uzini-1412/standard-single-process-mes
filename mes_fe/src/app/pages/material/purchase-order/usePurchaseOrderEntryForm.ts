/** 발주 등록/수정 화면의 상태·로딩·검증·저장을 모은 폼 훅. UI는 PurchaseOrderEntryPage가 담당. */
import { useEffect, useMemo, useState } from "react";
import * as purchaseOrderApi from "../../../api/purchaseOrderApi";
import * as commonInfoApi from "../../../api/commonInfoApi";
import * as clientApi from "../../../api/clientApi";
import type { PurchaseOrderItem } from "@/types/material/purchaseorder.intergace";
import { showSuccess, showError } from "@/app/utils/toast";
import { ensureDateOrder } from "@/app/utils/dateGuard";
import { useCrudForm } from "../../../hooks/useCrudForm";
import {
  buildOrderNoPlaceholder,
  detailsToOrderItems,
  hasMixedImportInspection,
  materialsToOrderItems,
  recomputeLineAmounts,
} from "./purchaseOrderEntryCalc";
import { todayYmd } from "@/app/utils/dateToday";

interface UseEntryFormArgs {
  mode: "create" | "edit";
  selectedId?: number;
  onRegister: (data: any) => void;
}

export function usePurchaseOrderEntryForm({ mode, selectedId, onRegister }: UseEntryFormArgs) {
  const isEdit = mode === "edit";
  const { saving, runSave } = useCrudForm();

  // --- 헤더 정보 상태 ---
  const [orderNo, setOrderNo] = useState("");
  const [orderSq, setOrderSq] = useState<number | null>(null);
  const [customerSq, setCustomerSq] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [orderDate, setOrderDate] = useState(todayYmd());
  const [inReqDate, setInReqDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [remark, setRemark] = useState("");

  // 제출서류 체크: 재료시험성적서 체크 + 품목 수입검사유무=true 시 인수검사에서 공급사성적서 필수가 됨.
  const [reqMaterialCertYn, setReqMaterialCertYn] = useState(false);
  const [reqTransSpecYn, setReqTransSpecYn] = useState(false);

  // --- 보조 목록/품목 상태 ---
  const [paymentTermsList, setPaymentTermsList] = useState<string[]>([]);
  const [clientList, setClientList] = useState<clientApi.ClientRes[]>([]);
  const [orderItems, setOrderItems] = useState<PurchaseOrderItem[]>([]);
  const [isMaterialSelectOpen, setIsMaterialSelectOpen] = useState(false);

  const [errors, setErrors] = useState({ inReqDate: false });

  // 수입검사유무 혼재 안내 alert: ack 전까지 유지, 같은 혼재 상태에서 중복 노출 방지.
  const [mixAlertOpen, setMixAlertOpen] = useState(false);
  const [mixAlertAck, setMixAlertAck] = useState(false);

  const [loading, setLoading] = useState(isEdit);

  const orderNoPlaceholder = buildOrderNoPlaceholder();

  // 발주번호 신규 채번.
  const issueOrderNo = async () => {
    try {
      const issued = await purchaseOrderApi.nextPurchaseOrderNo();
      setOrderNo(issued);
    } catch (error) {
      console.error("Error generating order number:", error);
      showError("발주번호 생성 중 오류가 발생했습니다.");
    }
  };

  // 수정모드 진입 시 기존 발주 1건을 화면 상태로 복원.
  const restoreOrder = async (targetSq: number) => {
    try {
      setLoading(true);
      const data = await purchaseOrderApi.loadPurchaseOrderDetail(targetSq);

      setOrderSq(data.orderSq);
      setOrderNo(data.orderNo || "");
      setCustomerSq(data.customerSq);
      setCustomerName(data.customerName || "");
      setCustomerCode(data.customerCode || "");
      setOrderDate(data.orderDate || "");
      setInReqDate(data.inReqDate || "");
      setPaymentTerms(data.paymentTerms || "");
      setRemark(data.remark || "");
      // 제출서류 체크 복원(기존 file_path 컬럼은 BE에 남아있되 UI는 체크박스로 전환됨).
      setReqMaterialCertYn(!!data.reqMaterialCertYn);
      setReqTransSpecYn(!!data.reqTransSpecYn);
      setOrderItems(detailsToOrderItems(data.details));
    } catch (error) {
      console.error("Error fetching order detail:", error);
      showError("발주 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 결제조건 코드 목록 로드.
  const loadPaymentTerms = async () => {
    try {
      const terms = await commonInfoApi.fetchDetailContentsByItemName("결제조건");
      setPaymentTermsList(terms);
    } catch (error) {
      console.error("Error fetching payment terms:", error);
      setPaymentTermsList([]);
    }
  };

  // 거래처 목록 로드(고객사 제외 = 매입처만).
  const loadClients = async () => {
    try {
      const clients = await clientApi.fetchClientList();
      setClientList(clients.filter((client) => client.customerType !== "고객사"));
    } catch (error) {
      console.error("Error loading client list:", error);
      showError("거래처 목록 로드 중 오류가 발생했습니다.");
    }
  };

  // 최초 진입 시: 공통목록 로드 + (수정이면 복원 / 신규면 채번).
  useEffect(() => {
    void loadPaymentTerms();
    void loadClients();
    if (isEdit && selectedId) {
      void restoreOrder(selectedId);
    } else {
      void issueOrderNo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedId]);

  // 수입검사유무 혼재 여부(품목 변동 시 재계산).
  const isInspMixed = useMemo(() => hasMixedImportInspection(orderItems), [orderItems]);

  // 재료시험성적서 체크 + 혼재 조건이면 안내. 조건 해소 시 ack 리셋.
  useEffect(() => {
    if (reqMaterialCertYn && isInspMixed) {
      if (!mixAlertAck) setMixAlertOpen(true);
    } else {
      setMixAlertAck(false);
      setMixAlertOpen(false);
    }
  }, [reqMaterialCertYn, isInspMixed, mixAlertAck]);

  // 거래처 선택 시 코드/sq 동기화.
  const selectCustomer = (name: string) => {
    setCustomerName(name);
    const picked = clientList.find((c) => c.customerName === name);
    if (picked) {
      setCustomerSq(picked.customerSq);
      setCustomerCode(picked.customerCode);
    }
  };

  // 발주일자 변경 → 입고요청일과의 순서 검증.
  const changeOrderDate = (value: string) => {
    setOrderDate(value);
    const invalid = !!(inReqDate && value && inReqDate < value);
    setErrors((prev) => ({ ...prev, inReqDate: invalid }));
  };

  // 입고요청일 변경 → 발주일자와의 순서 검증.
  const changeInReqDate = (value: string) => {
    setInReqDate(value);
    const invalid = !!(value && orderDate && value < orderDate);
    setErrors((prev) => ({ ...prev, inReqDate: invalid }));
  };

  // 다이얼로그에서 고른 자재를 품목에 추가.
  const appendMaterials = (materials: any[]) => {
    setOrderItems((prev) => [...prev, ...materialsToOrderItems(materials, prev.length)]);
    setIsMaterialSelectOpen(false);
  };

  // 단일 행 체크 토글.
  const toggleRowSelected = (index: number, checked: boolean) => {
    setOrderItems((prev) => {
      const next = [...prev];
      next[index].selected = checked;
      return next;
    });
  };

  // 전체 행 체크 토글.
  const toggleAllSelected = (checked: boolean) => {
    setOrderItems((prev) => prev.map((item) => ({ ...item, selected: checked })));
  };

  // 수량 변경 → 금액 재계산.
  const changeQuantity = (index: number, value: string) => {
    setOrderItems((prev) => {
      const next = [...prev];
      next[index].orderQty = value;
      next[index] = recomputeLineAmounts(next[index]);
      return next;
    });
  };

  // 단가 변경 → 금액 재계산.
  const changeUnitPrice = (index: number, value: string) => {
    setOrderItems((prev) => {
      const next = [...prev];
      next[index].unitPrice = value;
      next[index] = recomputeLineAmounts(next[index]);
      return next;
    });
  };

  // 혼재 안내 확인.
  const acknowledgeMixAlert = () => {
    setMixAlertOpen(false);
    setMixAlertAck(true);
  };

  // 저장(등록/수정). 검증 통과 시 서버 전송 후 콜백.
  const submitOrder = () => {
    if (!orderNo) {
      showError("발주번호가 생성되지 않았습니다.");
      return;
    }
    runSave({
      validate: () => {
        if (!customerSq) return "필수항목 거래처를 선택해주세요.";
        const dateErr = ensureDateOrder(orderDate, inReqDate, "발주일자", "입고요청일");
        if (dateErr) {
          setErrors({ inReqDate: true });
          return dateErr;
        }
        if (orderItems.length === 0) return "발주품목을 추가해주세요.";
        return null;
      },
      submit: async () => {
        const payload = {
          orderSq: isEdit ? orderSq : null,
          orderNo,
          customerSq: customerSq!, // validate에서 미선택 차단됨
          orderDate,
          inReqDate: inReqDate || undefined,
          paymentTerms: paymentTerms || undefined,
          remark: remark || undefined,
          reqMaterialCertYn,
          reqTransSpecYn,
          // 부가세 UI 미노출 → 미적용 저장(추후 토글/세율 재도입 예정).
          taxApplyYn: false,
          taxRate: 0,
          writerId: "admin",
          details: orderItems
            .filter((item) => item.selected !== false && (item.itemCode || item.itemName))
            .map((item) => ({
              orderDtlSq: item.orderDtlSq,
              itemSq: item.itemSq!,
              orderQty: parseFloat(item.orderQty) || 0,
              orderUnit: item.orderUnit || undefined,
              unitPrice: parseFloat(item.unitPrice) || 0,
              spec: item.spec || undefined,
              supplyAmt: item.supplyAmt ? parseFloat(item.supplyAmt) : undefined,
              vatAmt: item.vatAmt ? parseFloat(item.vatAmt) : undefined,
              totalAmt: item.totalAmt ? parseFloat(item.totalAmt) : undefined,
            })),
        };

        const result = await purchaseOrderApi.persistPurchaseOrder(payload);
        showSuccess(`발주정보가 ${isEdit ? "수정" : "등록"}되었습니다.`);
        onRegister(result);
      },
      onError: (error) => {
        console.error("Error saving purchase order:", error);
        showError("발주 저장 중 오류가 발생했습니다.");
      },
    });
  };

  return {
    isEdit,
    loading,
    saving,
    // 헤더 값
    orderNo,
    orderNoPlaceholder,
    customerName,
    customerCode,
    orderDate,
    inReqDate,
    paymentTerms,
    remark,
    reqMaterialCertYn,
    reqTransSpecYn,
    // 목록/품목
    paymentTermsList,
    clientList,
    orderItems,
    customerSq,
    errors,
    isMaterialSelectOpen,
    mixAlertOpen,
    // setters / 핸들러
    setPaymentTerms,
    setRemark,
    setReqMaterialCertYn,
    setReqTransSpecYn,
    setIsMaterialSelectOpen,
    selectCustomer,
    changeOrderDate,
    changeInReqDate,
    appendMaterials,
    toggleRowSelected,
    toggleAllSelected,
    changeQuantity,
    changeUnitPrice,
    acknowledgeMixAlert,
    submitOrder,
  };
}
