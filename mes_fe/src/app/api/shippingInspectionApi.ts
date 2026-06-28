/** 출하검사 API 클라이언트 — BE /api/quality/shipment(QualityController) + 기준값 /api/inspect. [품질관리 > 출하검사]. */
import apiClient from './apiClient';
import { postJson, postVoid } from './request';
import type { InspectSaveReq } from './incomingInspectionApi';

export type { InspectSaveReq };

export type ShipInspectSampleKey = `x${number}`;
export type ShipInspectSampleValue = string | number | null | undefined;

export interface ShipInspectTargetItem {
  shipDtlSq: number;
  shipOrderSq: number;
  planSq?: number;
  // 출하 Lot-No (ShipmentPlan.lotNo) — 같은 lotNo끼리 그룹핑해서 출하LOT 단위로 검사 등록
  lotNo?: string;
  expectedShipDate?: string;
  expectedShipTime?: string;
  customerName?: string;
  itemCode?: string;
  itemName?: string;
  basisWeight?: number | null;
  width?: number | null;
  length?: number | null;
  planQty?: number | null;
  planQtyEa?: number | null;
  destination?: string;
  customerReq?: string;
  // 출하지시 시점 확정된 제품재고 LOT + 해당 LOT의 생산일보 측정값 (생산 롤중량 kg / 생산평량 g/m²)
  productLotNo?: string;
  rollWeight?: number | null;
  rollBasis?: number | null;
}

// 출하검사 등록 대상(미출하+미검사) 단일 쿼리 조회
export function fetchShipInspectTargets(): Promise<ShipInspectTargetItem[]> {
  return postJson<ShipInspectTargetItem[]>('/quality/shipment/targets');
}

export interface ShipInspectListParams {
  [key: string]: unknown;
  dateFrom?: string;
  dateTo?: string;
  keyword?: string;
  itemCode?: string;
  itemName?: string;
  lotNo?: string;
  page?: number;
  size?: number;
  sortField?: string;
  sortDirection?: 'ASC' | 'DESC';
}

interface ShipInspectListItemBase {
  shipInspectSq?: number;
  inspectDate?: string;
  itemCode?: string;
  itemName?: string;
  basisWeight?: number | null;
  width?: number | null;
  length?: number | null;
  weight?: number | null;
  maxVal?: number | null;
  minVal?: number | null;
  judgeCode?: string;
  lotNo?: string;
  productLotNo?: string;   // 출하지시 시점 확정된 제품 LOT
  shipPlanLotNo?: string;  // 출하계획 LOT
  reportFilePath?: string;
  reportFileName?: string;
  rollWeight?: number | null; // 해당 LOT의 생산 롤중량 kg (= 표시용 "중량")
  rollBasis?: number | null;  // 해당 LOT의 생산평량 g/m²
}

export type ShipInspectListItem =
  ShipInspectListItemBase &
  Partial<Record<ShipInspectSampleKey, ShipInspectSampleValue>>;

export interface ShipInspectListRes {
  list: ShipInspectListItem[];
  total: number;
  maxSamples: number;
}

export interface ShipInspectPagedListRes {
  content: ShipInspectListItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  maxSamples: number;
}

export function fetchShipInspectList(params: ShipInspectListParams = {}): Promise<ShipInspectListRes> {
  return postJson<ShipInspectListRes>('/quality/shipment/list', params);
}

export async function fetchShipInspectListPaged(params: ShipInspectListParams = {}): Promise<ShipInspectPagedListRes> {
  return (await postJson<ShipInspectPagedListRes | null>('/quality/shipment/list-paged', params)) ?? { content: [], page: 0, size: 0, totalElements: 0, totalPages: 0, maxSamples: 0 };
}

/** 출하검사 엑셀 다운로드. 백엔드 SXSSF 스트리밍으로 .xlsx 직접 생성. */
export async function exportShipInspectExcel(params: ShipInspectListParams = {}): Promise<void> {
  const { downloadExcel, buildExcelFileName } = await import('../utils/excelDownload');
  await downloadExcel('/quality/shipment/export', params, buildExcelFileName("출하검사"));
}

export function fetchShipInspectDetail(shipInspectSq: number): Promise<any> {
  return postJson<any>('/quality/shipment/detail', { shipInspectSq });
}

export interface ShipInspectSaveItem {
  shipDtlSq: number;
  lotNo: string;
  inspectQty?: number;
  realWeight?: number;
  judgeCode: string;
  inspectDate: string;
  inspectorNm?: string;
  reportFilePath?: string;
  reportFileName?: string;
  remark?: string;
  itemCode: string;
  itemName: string;
  basisWeight?: number;
  width?: number;
  length?: number;
  weight?: number;
  maxVal?: number;
  minVal?: number;
  // 검사 시점 기준 스냅샷
  inspectItemName?: string;
  inspectCriteria?: string;
  measureType?: string;
  inspectMethod?: string;
  inspectCycle?: string;
  baseVal?: string;
  sampleCnt?: number;
  x1?: number;
  x2?: number;
  x3?: number;
  x4?: number;
  x5?: number;
  x6?: number;
  x7?: number;
  x8?: number;
  x9?: number;
  x10?: number;
  x11?: number;
  x12?: number;
  x13?: number;
  x14?: number;
  x15?: number;
  [key: string]: string | number | undefined;
}

export function saveShipInspect(data: ShipInspectSaveItem[]): Promise<void> {
  return postVoid('/quality/shipment/save', data);
}

export function deleteShipInspect(shipInspectIds: number[]): Promise<void> {
  return postVoid('/quality/shipment/delete', { shipInspectIds });
}

export async function generateShipInspectLotNo(inspectDate?: string): Promise<string> {
  const r = await postJson<{ lotNo: string }>('/quality/shipment/generate-lot-no', {
    inspectDate: inspectDate || undefined,
  });
  return r.lotNo;
}

export async function uploadShipInspectFile(file: File): Promise<{ filePath: string; fileName: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post<{ data: { filePath: string; fileName: string } }>(
    '/quality/shipment/upload',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return res.data.data;
}

export function getShipInspectFileDownloadUrl(filePath: string, fileName?: string): string {
  const baseUrl = apiClient.defaults.baseURL || '';
  const params = new URLSearchParams({ filePath });
  if (fileName) {
    params.append('fileName', fileName);
  }
  return `${baseUrl}/quality/shipment/download?${params.toString()}`;
}

export function fetchShippingInspectionList(params: { keyword?: string } = {}) {
  return postJson<any[]>('/inspect/list', { inspectType: 'SHIPPING', ...params });
}

export function fetchShippingInspectionById(inspectStdSq: number) {
  return postJson<any>('/inspect/detail', { inspectStdSq });
}

export function saveShippingInspection(data: InspectSaveReq) {
  return postVoid('/inspect/save', data);
}

export function deleteShippingInspection(inspectStdIds: number[]) {
  return postVoid('/inspect/delete', { inspectStdIds });
}

export async function fetchShippingInspectionResults(): Promise<any[]> {
  return [];
}

export async function createShippingInspectionResult(_data: any): Promise<void> {}
export async function fetchShippingInspectionResultById(_id: string): Promise<any> { return null; }
export async function updateShippingInspectionResult(_id: string, _data: any): Promise<void> {}
