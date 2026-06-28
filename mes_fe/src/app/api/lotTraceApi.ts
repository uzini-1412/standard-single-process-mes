/** LOT추적 API 클라이언트 — BE /api/item/lot-trace (ItemController) 외 여러 엔드포인트 집계. [제품이력관리 > LOT추적조회]. */
import { emptyPage, postJson, type PageEnvelope } from './request';
import type {
  LotTraceSearchReq,
  LotTraceSearchItem,
  SalesOrderRefItem,
  PurchaseLotDetailRes,
  MfgLotDetailRes,
} from '@/types/lot/lot-trace.interface';

// 페이징 응답 구조 (서버 PageResponse<T>) — 공용 PageEnvelope 별칭
export type PageData<T> = PageEnvelope<T>;

// 페이징 조회 (권장)
export async function fetchLotTraceSearchPaged(params: LotTraceSearchReq & {
  page?: number; size?: number;
}): Promise<PageData<LotTraceSearchItem>> {
  const page = await postJson<PageData<LotTraceSearchItem> | null>('/item/lot-trace/search', params);
  return page ?? emptyPage<LotTraceSearchItem>();
}

// 기존 호환 - 배열만 필요한 경우 큰 size로 받음 (주의: 초과시 잘림)
export async function fetchLotTraceSearch(params: LotTraceSearchReq): Promise<LotTraceSearchItem[]> {
  const page = await postJson<PageData<LotTraceSearchItem> | null>(
    '/item/lot-trace/search',
    { ...params, page: 0, size: 2000 },
  );
  return page?.content ?? [];
}

export async function fetchSalesOrderRefs(params: LotTraceSearchReq): Promise<SalesOrderRefItem[]> {
  return (await postJson<SalesOrderRefItem[] | null>('/item/lot-trace/sales-order-ref', params)) ?? [];
}

export function fetchPurchaseLotDetail(lotNo: string): Promise<PurchaseLotDetailRes> {
  return postJson<PurchaseLotDetailRes>('/item/lot-trace/purchase-detail', { lotNo });
}

export function fetchMfgLotDetail(lotNo: string): Promise<MfgLotDetailRes> {
  return postJson<MfgLotDetailRes>('/item/lot-trace/mfg-detail', { lotNo });
}

// 엑셀 출력용 연계 LOT 일괄 조회
export interface LinkedLotsItem {
  lotNo: string;
  linkedLots: string[];
}

export async function fetchLinkedLotsBulk(
  items: { lotNo: string; typeBg: string }[],
): Promise<LinkedLotsItem[]> {
  return (await postJson<LinkedLotsItem[] | null>('/item/lot-trace/linked-lots', { items })) ?? [];
}
