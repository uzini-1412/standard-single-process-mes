/** 발주 호출 모듈 — BE /api/purchase-order (PurchaseOrderController). [자재관리 > 발주관리]와 가입고등록·발주선택모달에서 함께 사용. */
import apiClient from './apiClient';
import { postJson, postVoid } from './request';

// 발주 리스트 조회
export function loadPurchaseOrders(params: {
  dateFrom?: string;
  dateTo?: string;
  customerSq?: number;
  keyword?: string;
} = {}) {
  return postJson<any[]>('/purchase-order/list', params);
}

// 단건 발주 상세 (orderSq 기준)
export function loadPurchaseOrderDetail(orderSq: number) {
  return postJson<any>('/purchase-order/detail', { orderSq });
}

// 발주 등록/수정 저장
export async function persistPurchaseOrder(data: {
  orderSq?: number | null;
  orderNo?: string;
  customerSq: number;
  orderDate: string;
  inReqDate?: string;
  paymentTerms?: string;
  remark?: string;
  submitDoc?: string;
  reqMaterialCertYn?: boolean;
  reqTransSpecYn?: boolean;
  materialCertFilePath?: string | null;
  materialCertFileNm?: string | null;
  transSpecFilePath?: string | null;
  transSpecFileNm?: string | null;
  taxApplyYn?: boolean;
  taxRate?: number;
  writerId?: string;
  details: {
    orderDtlSq?: number;
    itemSq: number;
    orderQty: number;
    orderUnit?: string;
    unitPrice: number;
    spec?: string;
    remark?: string;
    supplyAmt?: number;
    vatAmt?: number;
    totalAmt?: number;
  }[];
}) {
  const res = await apiClient.post<{ data: any }>('/purchase-order/save', data);
  return res.data;
}

// 발주 제거
export function removePurchaseOrder(orderIds: number[]) {
  return postVoid('/purchase-order/delete', { orderIds });
}

// 발주번호 신규 발급
export async function nextPurchaseOrderNo(): Promise<string> {
  const r = await postJson<{ orderNo: string }>('/purchase-order/generate-order-no', {});
  return r.orderNo;
}

// 첨부 파일 전송
export async function uploadPurchaseAttachment(file: File): Promise<{ filePath: string; fileNm: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await apiClient.post<{ data: { filePath: string; fileNm: string } }>(
    '/purchase-order/upload',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return res.data.data;
}

// 다운로드 주소 생성
export function buildPurchaseDownloadUrl(filePath: string, fileNm?: string): string {
  const baseURL = import.meta.env.VITE_API_BASE_URL;
  const params = new URLSearchParams({ filePath });
  if (fileNm) params.append('fileNm', fileNm);
  return `${baseURL}/purchase-order/download?${params.toString()}`;
}
