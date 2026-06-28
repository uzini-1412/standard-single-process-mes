import { postJson, postVoid } from './request';
import type { BomSearchParams, BomSaveReq, BomRes } from '@/types/standard-info/bom.interface';

export type { BomSearchParams, BomSaveReq, BomRes };

export function fetchBomList(params: BomSearchParams = {}): Promise<BomRes[]> {
  return postJson<BomRes[]>('/bom/list', params);
}

export function saveBomList(data: BomSaveReq[]): Promise<void> {
  return postVoid('/bom/save', data);
}

export function deleteBomList(bomLineIds: number[]): Promise<void> {
  return postVoid('/bom/delete', { bomLineIds });
}
