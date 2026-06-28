/** 공정검사 API 클라이언트 — BE /api/inspect/result (ProcessInspectResultController). [품질관리 > 공정검사현황]. */
import { postJson } from './request';

// 공정검사 진행 현황 목록 (상단 테이블)
export function fetchProcessInspectionProgress(): Promise<any[]> {
  return postJson<any[]>('/inspect/result/progress-list', {});
}

// 작업지시별 공정검사 결과 상세 (하단 테이블 - 검사항목 + 초품/종품)
export function fetchProcessInspectionResultDetail(workOrderSq: number): Promise<any[]> {
  return postJson<any[]>('/inspect/result/detail', { workOrderSq });
}
