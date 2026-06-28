// 재고조정 화면에서 쓰이는 타입 모음

// 등록 화면 폼: 재고실사 행을 골라 채운 뒤 applyInventoryAudit 으로 반영
export interface InventoryAdjustmentFormData {
  itemCode: string;
  itemName: string;
  accountType: string;
  basisWeight: string;
  currentQty: string;    // 반영될 측정 재고
  warehouseLoc: string;  // 창고
  storageLoc: string;    // 보관 위치
  lotNo: string;
  lastInDate: string;
  remark: string;
  auditSq?: number;
}

// 조정 이력 상세에 표시되는 한 건
export interface InventoryAdjustmentDetailData {
  auditSq: number;
  itemCode: string;
  itemName: string;
  accountLabel: string;
  lotNo: string;
  warehouseLoc: string;
  storageLoc: string;
  prevQty: string;     // 조정 전 시스템 재고
  newQty: string;      // 조정 후 실재고
  diffQty: string;     // 증감
  appliedDt: string;   // 조정일
  writerId: string;    // 담당자
  remark: string;
}

// 목록 그리드 한 줄 — 상세 데이터에 행 번호만 더한 형태
export interface InventoryAdjustmentListRow extends InventoryAdjustmentDetailData {
  no: number;
}

export interface InventoryAdjustmentListPageProps {
  onView: (id: number) => void;
  onRegister: () => void;
}

export interface InventoryAdjustmentRegisterPageProps {
  onBack?: () => void;
  onSave?: () => void;
}

export interface InventoryAdjustmentDetailPageProps {
  selectedId: number;
  onBack?: () => void;
  onDelete?: () => void;
}

export type InventoryAdjustmentViewMode = "list" | "register" | "detail";
