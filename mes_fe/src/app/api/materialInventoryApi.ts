/**
 * 자재재고 API 클라이언트 — BE /api/material/stock (StockController).
 * ※ 이 mes_fe 래퍼는 현재 mes_fe 내 importer 없음(자재재고현황 화면은 preReceivingApi 사용).
 *    단, BE /material/stock(StockController)는 mes_op(현장 작업자)이 사용 중 → 컨트롤러는 살아있음. 삭제 금지.
 */
import { postJson, postVoid } from './request';

// 재고 조회 응답
export interface MaterialStockRes {
  stockSq: number;
  accountType: string;
  customerName: string;
  itemCode: string;
  itemName: string;
  itemColor: string;
  itemWeight: number;
  optimalStock: number;
  currentQty: number;
  stockStatus: string;
  warehouseLoc: string;
  lastInDate: string;
  lotNo: string;
  remark: string;
  writerId: string;
}

// 재고 저장 요청
export interface MaterialStockSaveReq {
  stockSq?: number | null;
  itemSq: number;
  customerSq?: number;
  lotNo?: string;
  itemWeight?: number;
  currentQty: number;
  warehouseLoc?: string;
  lastInDate?: string;
  remark?: string;
  changeType: string; // ADJUST, INBOUND
  reason?: string;
  writerId: string;
}

// 재고 이력 응답
export interface MaterialStockHistoryRes {
  historySq: number;
  stockSq: number;
  warehouseLoc: string;
  changeType: string;
  changeQty: number;
  currQty: number;
  regDt: string;
  reason: string;
  workerId: string;
}

// 재고 목록 조회
export function fetchStockList(params: {
  itemCode?: string;
  itemName?: string;
} = {}): Promise<MaterialStockRes[]> {
  return postJson<MaterialStockRes[]>('/material/stock/list', params);
}

// 재고 상세 조회
export function fetchStockDetail(stockSq: number): Promise<MaterialStockRes> {
  return postJson<MaterialStockRes>('/material/stock/detail', { stockSq });
}

// 재고 이력 조회
export function fetchStockHistory(stockSq: number): Promise<MaterialStockHistoryRes[]> {
  return postJson<MaterialStockHistoryRes[]>('/material/stock/history/list', { stockSq });
}

// 재고 저장 (등록/수정)
export function saveStockList(data: MaterialStockSaveReq[]): Promise<void> {
  return postVoid('/material/stock/save', data);
}

// 재고 삭제
export function deleteStockList(stockIds: number[]): Promise<void> {
  return postVoid('/material/stock/delete', { stockIds });
}
