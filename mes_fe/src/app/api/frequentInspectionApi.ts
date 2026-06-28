import { postJson, postVoid } from './request';
import type { InspectSaveReq } from './incomingInspectionApi';

export type { InspectSaveReq };

export function fetchFrequentInspectionList(params: { keyword?: string } = {}) {
  return postJson<any[]>('/inspect/list', { inspectType: 'PROCESS', ...params });
}

export function fetchFrequentInspectionById(inspectStdSq: number) {
  return postJson<any>('/inspect/detail', { inspectStdSq });
}

export function saveFrequentInspection(data: InspectSaveReq) {
  return postVoid('/inspect/save', data);
}

export function deleteFrequentInspection(inspectStdIds: number[]) {
  return postVoid('/inspect/delete', { inspectStdIds });
}
