import { useState, useEffect } from "react";
import * as collectionApi from "../../../api/collectionApi";
import { showSuccess, showError, showWarning } from "@/app/utils/toast";
import { showConfirm } from "@/app/utils/confirm";
import { useUserContext, usePermission } from "../../../context/UserContext";
import { useCrudForm } from "../../../hooks/useCrudForm";
import { applyReceivableTotals, shipResultToDetailRow } from "./receivablesCalc";
import type { CollectionData, CollectionDetail, ShipResultOption } from "@/types/management/collection.interface";
import { todayYmd } from "@/app/utils/dateToday";

export type ViewMode = "create" | "edit" | "detail";

export interface CustomerSelectResult {
  customerSq: number;
  customerCode: string;
  customerName: string;
  paymentTerms?: string;
}

interface Args {
  mode: ViewMode;
  collectionSq?: number;
  onBack: () => void;
  onSave: () => void;
}

// 미수금 등록/수정/상세 폼의 상태와 동작을 통째로 담당하는 훅.
export function useReceivableForm({ mode, collectionSq, onBack, onSave }: Args) {
  const [screen, setScreen] = useState<ViewMode>(mode);
  const readOnly = screen === "detail";
  const { userInfo } = useUserContext();
  const access = usePermission("collection-management");
  const { saving, runSave } = useCrudForm();

  const [form, setForm] = useState<CollectionData>({
    customerSq: 0, customerCode: "", customerName: "",
    collectionDate: todayYmd(),
    paymentTerms: "", supplyAmt: 0, vatAmt: 0, totalAmt: 0,
    totalCollectionAmt: 0, balance: 0,
    registrant: userInfo?.staffName || "",
    remark: "",
    details: [],
  });

  // 출하실적 선택 모달 관련 상태
  const [shipPickerOpen, setShipPickerOpen] = useState(false);
  const [shipOptions, setShipOptions] = useState<ShipResultOption[]>([]);
  const [shipOptionsLoading, setShipOptionsLoading] = useState(false);

  // 상세/수정 모드 진입 시 서버에서 해당 건을 읽어 폼에 채운다.
  useEffect(() => {
    if (collectionSq && (mode === "detail" || mode === "edit")) {
      fetchAndFill(collectionSq);
    }
  }, [collectionSq, mode]);

  const fetchAndFill = async (sq: number) => {
    try {
      const detail = await collectionApi.loadReceivableDetail(sq);
      setForm({ ...detail, collectionSq: sq });
    } catch {
      showError("상세 데이터를 불러오는 중 오류가 발생했습니다.");
    }
  };

  // 단일 필드 갱신용 setter.
  const patchField = (field: keyof CollectionData, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }));

  // 거래처(고객사) 선택 시 거래처 정보로 폼을 초기화하고 내역/금액을 비운다.
  const applyCustomer = (c: CustomerSelectResult) => {
    setForm(prev => ({
      ...prev,
      customerSq: c.customerSq,
      customerCode: c.customerCode,
      customerName: c.customerName,
      paymentTerms: c.paymentTerms || "",
      details: [], supplyAmt: 0, vatAmt: 0, totalAmt: 0, totalCollectionAmt: 0, balance: 0,
    }));
  };

  // 출하실적 모달 열기: 거래처가 정해져 있어야 동작한다.
  const openShipPicker = () => {
    if (!form.customerCode) { showWarning("거래처를 먼저 선택해주세요."); return; }
    setShipPickerOpen(true);
    fetchShipOptions();
  };

  const fetchShipOptions = async () => {
    try {
      setShipOptionsLoading(true);
      const options = await collectionApi.listShipResultsForCustomer(form.customerCode);
      setShipOptions(options);
    } catch { setShipOptions([]); }
    finally { setShipOptionsLoading(false); }
  };

  // 출하실적 한 건을 출하내역에 더한다(중복 방지 후 재계산).
  const addShipResult = (sr: ShipResultOption) => {
    if (form.details.some(d => d.shipResultSq === sr.shipResultSq)) {
      showWarning("이미 추가된 출하실적입니다.");
      return;
    }
    const nextDetails = [...form.details, shipResultToDetailRow(sr)];
    setForm(prev => applyReceivableTotals(prev, nextDetails));
    setShipPickerOpen(false);
  };

  // 출하내역 특정 행의 필드를 바꾸고 합계를 다시 계산한다.
  const editDetailCell = (idx: number, field: keyof CollectionDetail, value: any) => {
    const nextDetails = [...form.details];
    nextDetails[idx] = { ...nextDetails[idx], [field]: value };
    setForm(prev => applyReceivableTotals(prev, nextDetails));
  };

  // 출하내역 특정 행을 제거하고 합계를 다시 계산한다.
  const dropDetail = (idx: number) => {
    const nextDetails = form.details.filter((_, i) => i !== idx);
    setForm(prev => applyReceivableTotals(prev, nextDetails));
  };

  // 저장: 거래처 선택 여부를 검증한 뒤 등록자를 채워 저장한다.
  const submit = () => runSave({
    validate: () => !form.customerSq ? "거래처를 선택해주세요." : null,
    submit: async () => {
      const payload = { ...form, registrant: form.registrant || userInfo?.staffName || "" };
      await collectionApi.persistReceivable(payload);
    },
    successMessage: "저장되었습니다.",
    onSuccess: () => onSave(),
    errorMessage: "저장에 실패했습니다.",
  });

  // 삭제: 확인을 받은 뒤 제거하고 목록으로 돌아간다.
  const remove = async () => {
    if (!form.collectionSq || !(await showConfirm("삭제하시겠습니까?"))) return;
    try {
      await collectionApi.removeReceivable(form.collectionSq);
      showSuccess("삭제되었습니다.");
      onBack();
    } catch { showError("삭제에 실패했습니다."); }
  };

  const heading = screen === "create" ? "자금관리 등록"
    : screen === "edit" ? "자금관리 수정"
    : "자금관리 상세";

  return {
    screen, setScreen, readOnly, access, saving, heading,
    form, patchField,
    applyCustomer,
    shipPickerOpen, setShipPickerOpen, shipOptions, shipOptionsLoading,
    openShipPicker, addShipResult,
    editDetailCell, dropDetail,
    submit, remove,
  };
}
