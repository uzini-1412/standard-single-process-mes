import { getData, postData } from './http';

/**
 * 재고 실사 대상 한 줄(자재/완제품 공통). "잔량 보유 + 활성 품목" 같은 선별 조건은
 * 서버가 적용해 내려주므로 클라이언트는 표시·입력만 담당한다.
 */
export interface InventoryAuditTargetRes {
  stockType: 'MATERIAL' | 'PRODUCT';
  stockSq: number;
  itemCode: string;
  itemName: string;
  accountType: string;
  itemType: string;
  lotNo: string;
  currentQty: number;
  unit: 'kg' | 'ea';
  width: number | null;
  warehouseLoc: string | null;
  storageLoc: string | null;
  measuredQty: number | null;
  auditedToday: boolean;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** 실사 대상 전체를 한 번에 가져온다. */
export const fetchInventoryAuditTargets = async (): Promise<InventoryAuditTargetRes[]> =>
  (await postData<InventoryAuditTargetRes[]>('/product-stock/audit/targets')) ?? [];

/** 실사 대상을 페이지 단위로 가져온다. 빈 응답이면 size 만 채운 빈 페이지로 정규화한다. */
export const fetchInventoryAuditTargetsPage = async (criteria: {
  page: number;
  size: number;
  accountType?: string;
}): Promise<PageResponse<InventoryAuditTargetRes>> => {
  const data = await postData<PageResponse<InventoryAuditTargetRes>>('/product-stock/audit/targets/page', criteria);
  return data ?? { content: [], page: 0, size: criteria.size, totalElements: 0, totalPages: 0 };
};

/** LOT 번호로 실사 대상을 좁혀 조회한다. */
export const lookupInventoryAuditTargets = async (lotNo: string): Promise<InventoryAuditTargetRes[]> =>
  (await getData<InventoryAuditTargetRes[]>('/product-stock/audit/targets/lookup', { lotNo })) ?? [];

/** 실사 입력 한 줄. 창고위치/보관위치까지 포함한다. */
export interface InventoryAuditRow {
  itemCode: string;
  itemName: string;
  lotNo: string;
  accountLabel: string;
  currentQty: number;
  measuredQty: number;
  diffQty: number;
  warehouseLoc: string; // 창고위치
  storageLoc: string;   // 보관위치
}

/** 실사 입력 묶음을 저장한다. */
export const saveInventoryAudit = async (rows: InventoryAuditRow[]): Promise<void> => {
  await postData<void>('/product-stock/audit/save', { rows });
};

/** 당일 실사 결과(품목별 최신 1건). */
export interface InventoryAuditRes {
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

/** 오늘 저장된 실사 결과 목록을 가져온다. */
export const fetchTodayInventoryAudit = (): Promise<InventoryAuditRes[]> =>
  getData<InventoryAuditRes[]>('/product-stock/audit/today');
