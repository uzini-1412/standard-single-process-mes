/** 출하실적 API 클라이언트 — BE /api/shipment/result (ShipmentResultController). [출하관리 > 출하관리(출하실적)]. */
import { postJson, emptyPage, type PageEnvelope } from './request';
import type { ShipmentResultRes } from '@/types/shipping/performance.interface';

export type { ShipmentResultRes };

export interface ShipmentResultSearchParams {
  dateFrom?: string;
  dateTo?: string;
  itemCode?: string;
  itemName?: string;
  customerName?: string;
  page?: number;
  size?: number;
  sortField?: string;
  sortDirection?: 'ASC' | 'DESC';
}

export type PageData<T> = PageEnvelope<T>;

export async function loadShipmentResultList(params: ShipmentResultSearchParams = {}): Promise<ShipmentResultRes[]> {
  return (await postJson<ShipmentResultRes[] | null>('/shipment/result/list', params)) ?? [];
}

// 출하관리 화면용 — 서버 페이징과 정렬을 적용해 출하실적을 조회한다.
export async function loadShipmentResultListPaged(
  params: ShipmentResultSearchParams = {},
): Promise<PageData<ShipmentResultRes>> {
  return (await postJson<PageData<ShipmentResultRes> | null>('/shipment/result/list-paged', params)) ?? emptyPage<ShipmentResultRes>();
}
