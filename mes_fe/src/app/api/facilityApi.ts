/** 설비 마스터 API 클라이언트 — BE /api/facility (FacilityController). [설비관리 > 설비정보관리] 외 설비 전 화면 공용. */
import { postJson, postVoid } from './request';
import { EquipmentData } from '@/types/equipment/info.interface';

export interface FacilitySearchParams {
  facilityType?: string;
  lineSq?: number;
  keyword?: string;
}

export interface FacilitySaveData {
  facilitySq?: number;
  manageNo: string;
  facilityName: string;
  facilityType?: string;
  spec?: string;
  makerNm?: string;
  purchaseDate?: string;
  purchasePrice?: string;
  asCompany?: string;
  lineSq?: number;
  processSq?: number;
  imgPaths?: string;
  purpose?: string;
  disposeDate?: string;
  attachFileNm?: string;
  attachFileContent?: string;
  lineNm?: string;
  processNm?: string;
  writerId?: string;
}

export function fetchFacilityList(params: FacilitySearchParams = {}): Promise<EquipmentData[]> {
  return postJson<EquipmentData[]>('/facility/list', params);
}

export function fetchFacilityDetail(facilitySq: string | number): Promise<EquipmentData> {
  return postJson<EquipmentData>('/facility/detail', { facilitySq: Number(facilitySq) });
}

export function saveFacilities(items: FacilitySaveData[]): Promise<void> {
  return postVoid('/facility/save', items);
}

export function deleteFacilities(facilityIds: number[], writerId?: string): Promise<void> {
  return postVoid('/facility/delete', { facilityIds, writerId });
}
