/** 설비 이력 API 클라이언트 — BE /api/facility/history (FacilityHistoryController). [설비관리 > 설비이력관리/설비이력카드]. */
import { postJson, postVoid } from './request';
import { EquipmentHistoryData, HistoryCardEquipmentInfo, HistoryCardRecord } from '@/types/equipment/history.interface';

export interface HistorySearchParams {
  facilitySq?: number;
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface HistorySaveData {
  historySq?: number;
  facilitySq: number;
  historyNo?: string;
  occurDate?: string;
  occurContent?: string;
  actionType?: string;
  actionDate?: string;
  actionTime?: string;
  actionContent?: string;
  actionManager?: string;
  actionCost?: string;
  remark?: string;
  writerId?: string;
}

export interface HistoryCardRes {
  facilitySq: number;
  manageNo: string;
  facilityName: string;
  processNm: string;
  purchaseDate: string;
  imgPaths: string;
  historyList: EquipmentHistoryData[];
}

export function fetchHistoryList(params: HistorySearchParams = {}): Promise<EquipmentHistoryData[]> {
  return postJson<EquipmentHistoryData[]>('/facility/history/list', params);
}

export function fetchHistoryCardList(params: HistorySearchParams = {}): Promise<HistoryCardRes[]> {
  return postJson<HistoryCardRes[]>('/facility/history/card', params);
}

export function saveHistories(items: HistorySaveData[]): Promise<void> {
  return postVoid('/facility/history/save', items);
}

export function deleteHistories(historyIds: number[]): Promise<void> {
  return postVoid('/facility/history/delete', { historyIds });
}
