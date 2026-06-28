/** 설비 예비품 API 클라이언트 — BE /api/facility/spare-part (FacilitySparePartController). [설비관리 > 설비예비품관리]. */
import { postJson, postVoid } from './request';
import { SparePartsData } from '@/types/equipment/spare.interface';

export interface SparePartSearchParams {
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface SparePartSaveData {
  sparePartSq?: number;
  partNo: string;
  partNm: string;
  spec?: string;
  supplierNm?: string;
  purchaseDate?: string;
  purchasePrice?: string;
  safetyStock?: string;
  currentStock?: string;
  storageLoc?: string;
  useFacility?: string;
  imgPaths?: string;
  remark?: string;
  writerId?: string;
}

export function fetchSparePartList(params: SparePartSearchParams = {}): Promise<SparePartsData[]> {
  return postJson<SparePartsData[]>('/facility/spare-part/list', params);
}

export function saveSpareParts(items: SparePartSaveData[]): Promise<void> {
  return postVoid('/facility/spare-part/save', items);
}

export function deleteSpareParts(sparePartIds: number[]): Promise<void> {
  return postVoid('/facility/spare-part/delete', { sparePartIds });
}
