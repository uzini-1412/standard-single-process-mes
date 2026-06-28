/** 설비 점검항목 API 클라이언트 — BE /api/facility/check-item (FacilityCheckItemController). [설비관리 > 일상점검정의서]. */
import { postJson, postVoid } from './request';

export interface CheckItemSearchParams {
  facilitySq?: number;
  keyword?: string;
}

export interface CheckItemSaveData {
  checkItemSq?: number;
  facilitySq: number;
  checkItemNm: string;
  checkCriteria?: string;
  checkMethod?: string;
  checkCycle?: string;
  minVal?: string;
  maxVal?: string;
  remark?: string;
  unit?: string;
  checkItemImg?: string;
  sortOrder?: number;
  writerId?: string;
}

export interface CheckItemRes {
  checkItemSq: number;
  facilitySq: number;
  facilityName: string;
  manageNo: string;
  checkItemNm: string;
  checkCriteria: string;
  checkMethod: string;
  checkCycle: string;
  minVal: string;
  maxVal: string;
  remark: string;
  unit: string;
  checkItemImg: string;
  sortOrder: number;
}

export function fetchCheckItemList(params: CheckItemSearchParams = {}): Promise<CheckItemRes[]> {
  return postJson<CheckItemRes[]>('/facility/check-item/list', params);
}

export function saveCheckItems(items: CheckItemSaveData[]): Promise<void> {
  return postVoid('/facility/check-item/save', items);
}

export function deleteCheckItems(checkItemIds: number[]): Promise<void> {
  return postVoid('/facility/check-item/delete', { checkItemIds });
}
