import { postJson, getJson, postVoid } from './request';

// 재고실사 차이 발생 목록 (재고조정 등록 화면 상단)
export interface InventoryAuditDiffRes {
  auditSq: number;
  itemCode: string;
  itemName: string;
  lotNo: string;
  accountLabel: string;
  currentQty: number;
  measuredQty: number;
  diffQty: number;
  warehouseLoc: string; // 창고위치
  storageLoc: string;   // 보관위치
  regDt: string;
}

export function fetchInventoryAuditWithDiff(): Promise<InventoryAuditDiffRes[]> {
  return getJson<InventoryAuditDiffRes[]>('/product-stock/audit/diff-list');
}

export interface InventoryAuditApplyReq {
  auditSq: number;
  measuredQty: string | number;
  warehouseLoc?: string;
  storageLoc?: string;
  lastInDate?: string;
  remark?: string;
  writerId?: string;
}

export function applyInventoryAudit(req: InventoryAuditApplyReq): Promise<void> {
  return postVoid('/product-stock/audit/apply', req);
}

// 재고조정관리 목록: applied_yn='Y' 인 재고실사 이력만 반환
export interface AppliedAuditRes {
  auditSq: number;
  itemCode: string;
  itemName: string;
  accountLabel: string;
  lotNo: string;
  currentQty: number;
  measuredQty: number;
  diffQty: number;
  warehouseLoc: string;
  storageLoc: string;
  appliedDt: string;
  appliedWriterId: string;
  appliedRemark: string;
  regDt: string;
}

export function fetchInventoryAdjustmentList(
  params: { itemCode?: string; itemName?: string } = {}
): Promise<AppliedAuditRes[]> {
  return postJson<AppliedAuditRes[]>('/product-stock/audit/applied-list', params);
}

export function fetchInventoryAdjustmentById(auditSq: number): Promise<AppliedAuditRes> {
  return postJson<AppliedAuditRes>('/product-stock/audit/applied-detail', { auditSq });
}

export function deleteInventoryAdjustment(auditSqs: number[]): Promise<void> {
  return postVoid('/product-stock/audit/applied-delete', { auditSqs });
}
