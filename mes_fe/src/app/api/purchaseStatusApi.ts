import { postJson, emptyPage, type PageEnvelope } from './request';
import type {
  PurchaseStatusItem,
  PurchaseStatusGroupRes,
  PurchaseStatusCustomerOption,
  PurchaseStatusTrendRes,
} from '@/types/management/purchase.interface';

export interface PurchaseLedgerQuery {
  dateFrom?: string;
  dateTo?: string;
  customerSq?: number;
  customerCode?: string;
  page?: number;
  size?: number;
  sortField?: string;
  sortDirection?: 'ASC' | 'DESC';
  groupAccountType?: string;
  groupCustomerCode?: string;
  groupInboundDate?: string;
}

export type PagedResult<T> = PageEnvelope<T>;

// 그룹핑 없이 매입 라인 전체를 평면 배열로 받아온다
export async function requestPurchaseLines(query: PurchaseLedgerQuery = {}): Promise<PurchaseStatusItem[]> {
  return (await postJson<PurchaseStatusItem[] | null>('/purchase/status/list', query)) ?? [];
}

// 거래처·일자 단위로 묶인 매입 그룹을 페이지 단위로 조회
export async function requestPurchaseGroupPage(query: PurchaseLedgerQuery = {}): Promise<PagedResult<PurchaseStatusGroupRes>> {
  return (await postJson<PagedResult<PurchaseStatusGroupRes> | null>('/purchase/status/list-paged', query)) ?? emptyPage<PurchaseStatusGroupRes>();
}

// 선택한 그룹에 속한 세부 매입 항목 목록
export async function requestPurchaseGroupItems(query: PurchaseLedgerQuery): Promise<PurchaseStatusItem[]> {
  return (await postJson<PurchaseStatusItem[] | null>('/purchase/status/items', query)) ?? [];
}

// 검색 조건에 맞는 거래처 후보(필터 콤보용)
export async function requestPurchaseCustomerList(query: PurchaseLedgerQuery = {}): Promise<PurchaseStatusCustomerOption[]> {
  return (await postJson<PurchaseStatusCustomerOption[] | null>('/purchase/status/customers', query)) ?? [];
}

// 월 단위로 집계된 매입 추이 데이터
export async function requestPurchaseMonthlyTrend(query: PurchaseLedgerQuery = {}): Promise<PurchaseStatusTrendRes[]> {
  return (await postJson<PurchaseStatusTrendRes[] | null>('/purchase/status/trend', query)) ?? [];
}
