import { postJson, getJson, deleteJson } from './request';
import type { CollectionListItem, CollectionData, ShipResultOption } from '@/types/management/collection.interface';

// 검색 조건(수금일자 범위)으로 미수금 목록을 조회한다.
export async function searchReceivables(criteria: {
  dateFrom?: string;
  dateTo?: string;
} = {}): Promise<CollectionListItem[]> {
  return (await postJson<CollectionListItem[] | null>('/collection/list', criteria)) ?? [];
}

// 단건 식별자로 미수금 상세를 가져온다.
export function loadReceivableDetail(collectionSq: number): Promise<CollectionData> {
  return getJson<CollectionData>(`/collection/${collectionSq}`);
}

// 미수금 건을 신규 등록하거나 기존 건을 갱신한다.
export function persistReceivable(payload: CollectionData): Promise<number> {
  return postJson<number>('/collection/save', payload);
}

// 지정한 미수금 건을 삭제한다.
export async function removeReceivable(collectionSq: number): Promise<void> {
  await deleteJson<unknown>(`/collection/${collectionSq}`);
}

// 특정 거래처 코드에 묶인 출하실적 후보를 조회한다.
export async function listShipResultsForCustomer(customerCode: string): Promise<ShipResultOption[]> {
  return (await getJson<ShipResultOption[] | null>('/collection/ship-results', { params: { customerCode } })) ?? [];
}
