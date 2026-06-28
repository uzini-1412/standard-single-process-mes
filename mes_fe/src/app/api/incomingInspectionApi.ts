/** 입고검사 API 클라이언트 — BE /api/material/inspect(MaterialInspectController) + 기준값 /api/inspect. [품질관리 > 입고검사] / 자재불량현황 공용. */
import apiClient from './apiClient';
import { postJson, postVoid, type PageEnvelope, emptyPage } from './request';
import { IncomingInspectionData, IncomingInspectionItemDetail } from '@/types/quality/inspection.interface';

// ======================== 검사표준 관련 (기존 유지) ========================

export interface InspectSaveReq {
  inspectStdSq?: number;
  inspectType: string;
  stdNo: string;
  itemSq?: number;
  remark?: string;
  imgPaths?: string[] | null;
  useYn?: boolean;
  inspectItems: {
    itemDtlSq?: number;
    sortNo?: number;
    inspectItemName: string;
    inspectCriteria: string;
    measureType: string;
    inspectMethod: string;
    inspectCycle: string;
    sampleCnt: string;
    baseVal: string;
    maxVal: string;
    minVal: string;
    remark: string;
  }[];
  revisions: {
    revSq?: number;
    revNo?: number;
    revDate?: string;
    revContent: string;
    writerName: string;
    remark: string;
  }[];
}

// 전체 검사유형의 stdNo 조회 (번호 생성용)
export function fetchAllInspectionList() {
  return postJson<any[]>('/inspect/list', {});
}

export function fetchIncomingInspectionList(params: { keyword?: string } = {}) {
  return postJson<any[]>('/inspect/list', { inspectType: 'INCOMING', ...params });
}

export function fetchIncomingInspectionById(inspectStdSq: number) {
  return postJson<any>('/inspect/detail', { inspectStdSq });
}

export function saveIncomingInspection(data: InspectSaveReq) {
  return postVoid('/inspect/save', data);
}

export function deleteIncomingInspection(inspectStdIds: number[]) {
  return postVoid('/inspect/delete', { inspectStdIds });
}

// ======================== 입고검사 결과 API (Spring Boot) ========================

// 입고검사 대상 목록 조회 (inspectStatus: WAIT)
export async function fetchInspectTargetList(params: {
  dateFrom?: string;
  dateTo?: string;
  keyword?: string;
} = {}): Promise<any[]> {
  return postJson<any[]>('/material/inspect/list', {
    ...params,
    inspectStatus: 'WAIT',
  });
}

// 입고검사 완료 목록 조회 (inspectStatus: PASS 또는 REJECT)
export async function fetchInspectResultList(params: {
  dateFrom?: string;
  dateTo?: string;
  keyword?: string;
} = {}): Promise<any[]> {
  // PASS와 REJECT 모두 조회하기 위해 inspectStatus 없이 조회 후 프론트에서 필터
  return postJson<any[]>('/material/inspect/list', params);
}

// 입고검사 폼 정보 조회 (기준서 항목 + 기존 결과)
export function fetchInspectForm(inboundSq: number): Promise<any> {
  return postJson<any>('/material/inspect/form', { inboundSq });
}

// 입고검사 결과 저장
export function saveInspectResult(data: {
  inboundSq: number;
  inspectStatus: string;
  passedQty?: number;
  rejectedQty?: number;
  inspectLotNo?: string;
  inspectNo: string;
  inspectorName: string;
  inspectDate: string;
  packingQty?: number;
  packingUnit?: string;
  lotQty?: number;
  fileName?: string;
  filePath?: string;
  remark?: string;
  itemResults: {
    itemDtlSq: number;
    measureVal?: string;
    resultYn?: string;
    sampleCnt?: number;
    x1?: string;
    x2?: string;
    x3?: string;
    x4?: string;
    x5?: string;
    x6?: string;
    x7?: string;
    x8?: string;
    x9?: string;
    x10?: string;
    x11?: string;
    x12?: string;
    x13?: string;
    x14?: string;
    x15?: string;
  }[];
}): Promise<void> {
  return postVoid('/material/inspect/save', data);
}

// 입고검사 결과 삭제
export function deleteInspectResult(inboundIds: number[]): Promise<void> {
  return postVoid('/material/inspect/delete', { inboundIds });
}

/** 입고검사 결과 엑셀 다운로드. 백엔드 SXSSF 스트리밍으로 PASS/REJECT만 .xlsx 직접 생성. */
export async function exportIncomingInspectExcel(params: {
  itemCode?: string;
  itemName?: string;
  customerName?: string;
} = {}): Promise<void> {
  const { downloadExcel, buildExcelFileName } = await import('../utils/excelDownload');
  await downloadExcel('/material/inspect/export', params, buildExcelFileName("입고검사결과"));
}

// ========== 자재불량현황 (단일 응답으로 통합) ==========

export interface DefectListItem {
  inboundSq: number;
  inspectNo: string;
  inspectDate: string;
  inspectorName: string;
  itemCode: string;
  itemName: string;
  lotNo: string;
  inspectLotNo?: string;
  inboundQty: number;
  defectQty: number;
  sampleCnt?: number | null;
  inspectResult: string; // 합격 / 불합격
  fileName?: string;
  filePath?: string;
}

export interface DefectListSearchParams {
  dateFrom?: string;
  dateTo?: string;
  itemCode?: string;
  itemName?: string;
  lotNo?: string;
  inspectResult?: string; // 합격 / 불합격 / 전체
  page?: number;
  size?: number;
  sortField?: string;
  sortDirection?: 'ASC' | 'DESC';
}

export type DefectListPageRes = PageEnvelope<DefectListItem>;

export async function fetchDefectListPaged(params: DefectListSearchParams = {}): Promise<DefectListPageRes> {
  return (await postJson<DefectListPageRes | null>('/material/inspect/defect-list-paged', params)) ?? emptyPage<DefectListItem>();
}

export async function fetchDefectListAll(params: DefectListSearchParams = {}): Promise<DefectListItem[]> {
  return (await postJson<DefectListItem[] | null>('/material/inspect/defect-list-all', params)) ?? [];
}

// 입고검사 LOT번호 자동 채번 (IS-yyyyMMdd-XX)
export async function generateInspectLotNo(inspectDate?: string): Promise<string> {
  const r = await postJson<{ inspectLotNo: string }>('/material/inspect/generate-inspect-lot-no', {
    inspectDate: inspectDate || undefined,
  });
  return r.inspectLotNo;
}

// 파일 업로드 (공급사성적서)
export async function uploadInspectFile(file: File): Promise<{ filePath: string; fileName: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post<{ data: { filePath: string; fileName: string } }>(
    '/material/inspect/upload',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return res.data.data;
}

// 공급사성적서 파일 다운로드 — JWT가 필요한 인증 엔드포인트라 blob fetch로 받아야 함.
// 단순 `<a href>` 로는 Authorization 헤더가 안 붙어 403.
export async function downloadInspectFile(filePath: string, fileName?: string): Promise<void> {
  const { saveAs } = await import('file-saver');
  const res = await apiClient.get('/material/inspect/download', {
    params: { filePath, fileName },
    responseType: 'blob',
  });
  saveAs(res.data, fileName || filePath.split('/').pop() || '성적서');
}

// 하위 호환 — 자재관리 페이지에서 사용 중
export async function fetchIncomingInspectionResults(): Promise<any[]> {
  return [];
}
