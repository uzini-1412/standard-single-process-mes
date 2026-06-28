/** 설비 정기점검 API 클라이언트 — BE /api/facility/regular-check (FacilityRegularCheckController). [설비관리 > 정기점검]. */
import { postJson, postVoid } from './request';
import { PeriodicInspectionData } from '@/types/equipment/periodic.interface';

export interface RegularCheckSearchParams {
  facilitySq?: number;
  keyword?: string;
}

export interface RegularCheckSaveData {
  regularCheckSq?: number;
  facilitySq: number;
  checkType?: string;
  checkerNm?: string;
  planDate?: string;
  planContent?: string;
  execDate?: string;
  execContent?: string;
  execResult?: string;
  currentStatus?: string;
  remark?: string;
  writerId?: string;
}

export function fetchRegularCheckList(params: RegularCheckSearchParams = {}): Promise<PeriodicInspectionData[]> {
  return postJson<PeriodicInspectionData[]>('/facility/regular-check/list', params);
}

export function saveRegularChecks(items: RegularCheckSaveData[]): Promise<void> {
  return postVoid('/facility/regular-check/save', items);
}

export function deleteRegularChecks(regularCheckIds: number[]): Promise<void> {
  return postVoid('/facility/regular-check/delete', { regularCheckIds });
}
