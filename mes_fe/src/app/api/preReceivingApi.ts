/** 자재입고 호출 모듈 — BE /api/material/inbound (MaterialInboundController). [자재관리]의 가입고관리·입고현황·자재재고현황 3개 메뉴에서 공유. */
import { postJson, postVoid, emptyPage, type PageEnvelope } from './request';

export interface InboundRes {
  inboundSq: number;
  orderDtlSq: number;
  orderNo: string;
  customerSq: number;
  customerName: string;
  itemSq: number;
  itemCode: string;
  itemName: string;
  inboundDate: string;
  inboundQty: number;
  lotNo: string;
  purchaseLotNo: string;
  inboundType: string; // REGISTER | ADJUST
  inspectStatus: string;
  passedQty: number;
  rejectedQty: number;
  stockStatus: string;
  remark: string;
  customerCode: string;
  accountType: string;
  spec: string;
  storageLocation: string;
  warehouseLocation?: string;
  inspectLotNo: string;
  inspectNo: string;
  inspectorName: string;
  inspectDate: string;
  packingQty: number;
  packingUnit: string;
  orderUnit: string;
  productionLotNo: string;
  // 자식 검사 LOT 펼침 행 (검사 LOT가 있는 경우 채워짐, 무검사면 null)
  inspectLotSeq?: number | null;
  inspectLotNoChild?: string | null;
  inspectLotQty?: number | null;
}

export interface InboundSaveReq {
  inboundSq: number | null;
  orderDtlSq: number;
  itemSq: number;
  inboundDate: string;
  inboundQty: number;
  remark: string;
  writerId: string;
  inboundType?: string; // REGISTER | ADJUST
  lotNo?: string; // 조정 시 원본 LOT번호
  purchaseLotNo?: string; // 조정 시 원본 구매 LOT-No
}

export async function loadInbounds(params: {
  dateFrom?: string;
  dateTo?: string;
  customerSq?: number;
  keyword?: string;
} = {}): Promise<InboundRes[]> {
  return postJson<InboundRes[]>('/material/inbound/list', params);
}

export function persistInbounds(data: InboundSaveReq[]): Promise<void> {
  return postVoid('/material/inbound/save', data);
}

export function removeInbounds(inboundIds: number[]): Promise<void> {
  return postVoid('/material/inbound/delete', { inboundIds });
}

// 구매 LOT-No 사전 발급
export async function nextPurchaseLotNo(orderDtlSq: number): Promise<string> {
  const r = await postJson<{ purchaseLotNo: string }>('/material/inbound/generate-purchase-lot-no', { orderDtlSq });
  return r.purchaseLotNo;
}

// ==================== 자재재고현황 (품목 단위 그룹 + 페이지네이션) ====================

export interface InventoryGroupItem {
  stockSq: number;
  itemSq: number;
  accountType: string;
  itemCode: string;
  itemName: string;
  itemColor: string;
  itemWeight: number | null;
  optimalStock: number;
  currentQty: number;
  stockStatus: string; // ENOUGH | SHORT
  warehouseLocation: string;
  warehouseLoc: string;
}

export interface InventoryHistoryItem {
  no: number;
  warehouseLoc: string;
  changeType: string;
  lotNo: string;
  changeQty: number;
  currQty: number;
  regDt: string;
}

export interface InventoryHistoryParams {
  itemSq: number;
  page?: number;
  size?: number;
}

export type InventoryHistoryPageRes = PageEnvelope<InventoryHistoryItem>;

export interface InventorySearchParams {
  [key: string]: unknown;
  dateFrom?: string;
  dateTo?: string;
  itemCode?: string;
  itemName?: string;
  page?: number;
  size?: number;
  sortField?: string;
  sortDirection?: 'ASC' | 'DESC';
  excludeAccountTypes?: string[];
}

export type InventoryPageRes = PageEnvelope<InventoryGroupItem>;

export async function loadInventoryPage(params: InventorySearchParams = {}): Promise<InventoryPageRes> {
  return (await postJson<InventoryPageRes | null>('/material/inbound/inventory-list-paged', params)) ?? emptyPage<InventoryGroupItem>();
}

export async function loadAllInventory(params: InventorySearchParams = {}): Promise<InventoryGroupItem[]> {
  return (await postJson<InventoryGroupItem[] | null>('/material/inbound/inventory-list-all', params)) ?? [];
}

/** 자재재고현황을 엑셀로 내려받기. 백엔드가 SXSSF 스트리밍으로 .xlsx를 바로 생성한다. */
export async function downloadInventoryExcel(params: InventorySearchParams = {}): Promise<void> {
  const { downloadExcel, buildExcelFileName } = await import('../utils/excelDownload');
  await downloadExcel('/material/inbound/inventory-export', params, buildExcelFileName("자재재고현황"));
}

export async function loadInventoryHistoryPage(params: InventoryHistoryParams): Promise<InventoryHistoryPageRes> {
  return (await postJson<InventoryHistoryPageRes | null>('/material/inbound/inventory-history-paged', params)) ?? emptyPage<InventoryHistoryItem>();
}

// 재고수정 팝업에서 사용 — 해당 품목의 원본 inbound (REGISTER 라디오 선택용)
export async function loadInboundsByItem(itemSq: number): Promise<InboundRes[]> {
  return (await postJson<InboundRes[] | null>('/material/inbound/inbounds-by-item', { itemSq })) ?? [];
}
