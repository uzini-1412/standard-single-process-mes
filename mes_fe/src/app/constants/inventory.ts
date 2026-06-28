import { InventoryAdjustmentFormData } from "@/types/standard-info/inventory.interface";

// 재고조정 목록 컬럼 (조정 전/후 비교)
export const INVENTORY_ADJUSTMENT_LIST_COLUMNS = [
  { label: "No.", key: "no" },
  { label: "품번", key: "itemCode" },
  { label: "품명", key: "itemName" },
  { label: "계정구분", key: "accountLabel" },
  { label: "자재 Lot-No", key: "lotNo" },
  { label: "창고위치", key: "warehouseLoc" },
  { label: "조정 전", key: "prevQty" },
  { label: "조정 후", key: "newQty" },
  { label: "차이", key: "diffQty" },
  { label: "조정일자", key: "appliedDt" },
  { label: "조정책임자", key: "writerId" },
] as const;

// 재고조정 등록 폼 초기값
export const INVENTORY_ADJUSTMENT_FORM_INITIAL_DATA = (
  lastInDate: string = ""
): InventoryAdjustmentFormData => ({
  auditSq: undefined,
  itemCode: "",
  itemName: "",
  accountType: "",
  basisWeight: "",
  currentQty: "",
  warehouseLoc: "",
  storageLoc: "",
  lotNo: "",
  lastInDate,
  remark: "",
});

// 재고실사(감사) 입력 컬럼
export const INVENTORY_ADJUSTMENT_AUDIT_COLUMNS = [
  { label: "No.", key: "no" },
  { label: "품번", key: "itemCode" },
  { label: "품명", key: "itemName" },
  { label: "자재 Lot-No", key: "lotNo" },
  { label: "보관위치", key: "storageLoc" },
  { label: "창고위치", key: "warehouseLoc" },
  { label: "재고", key: "currentQty" },
  { label: "측정재고", key: "measuredQty" },
] as const;
