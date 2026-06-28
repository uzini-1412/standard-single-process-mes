/** 부적합(NCR) API 클라이언트 — BE /api/quality/ncr (QualityController). [품질관리 > 부적합관리]. */
import { postJson, postVoid } from './request';

// 부적합(NCR) 발생 내역 목록을 조건으로 조회
export function fetchNonConformanceRecords(params: {
  dateFrom?: string;
  dateTo?: string;
  occurType?: string;
  keyword?: string;
} = {}): Promise<any[]> {
  return postJson<any[]>('/quality/ncr/list', params);
}

// 부적합 발생/조치 단건 등록 또는 갱신
export function saveNonConformanceRecord(data: {
  ncrSq?: number;
  occurType?: string;
  occurDate?: string;
  occurPlace?: string;
  itemSq?: number;
  itemCode?: string;
  itemName?: string;
  lotNo?: string;
  badQty?: number;
  defectType?: string;
  finderNm?: string;
  actionDate?: string;
  actionContent?: string;
  managerNm?: string;
}): Promise<void> {
  return postVoid('/quality/ncr/save', data);
}

// 선택한 부적합 내역들을 일괄 삭제
export function removeNonConformanceRecords(ncrIds: number[]): Promise<void> {
  return postVoid('/quality/ncr/delete', { ncrIds });
}
