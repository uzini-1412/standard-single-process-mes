import { postJson, emptyPage, type PageEnvelope } from './request';
import type {
  SalesStatusItem,
  SalesStatusGroupRes,
  SalesStatusCustomerOption,
  SalesStatusTrendRes,
} from '@/types/management/sales.interface';

export interface SalesQueryParams {
  dateFrom?: string;
  dateTo?: string;
  customerSq?: number;
  customerCode?: string;
  page?: number;
  size?: number;
  sortField?: string;
  sortDirection?: 'ASC' | 'DESC';
  groupCustomerCode?: string;
  groupShipDate?: string;
  groupLotNo?: string;
}

export type PagedResult<T> = PageEnvelope<T>;

// 평탄화된 전체 행 (엑셀·거래명세서에서 활용)
export async function fetchSalesRecordsFlat(params: SalesQueryParams = {}): Promise<SalesStatusItem[]> {
  return (await postJson<SalesStatusItem[] | null>('/sales/status/list', params)) ?? [];
}

// 상단 표에 뿌릴 그룹 단위 페이지 응답
export async function fetchSalesGroupsPage(params: SalesQueryParams = {}): Promise<PagedResult<SalesStatusGroupRes>> {
  return (await postJson<PagedResult<SalesStatusGroupRes> | null>('/sales/status/list-paged', params)) ?? emptyPage<SalesStatusGroupRes>();
}

// 한 그룹에 속한 세부 품목 (팝업 및 거래명세서)
export async function fetchSalesGroupDetails(params: SalesQueryParams): Promise<SalesStatusItem[]> {
  return (await postJson<SalesStatusItem[] | null>('/sales/status/items', params)) ?? [];
}

// 거래처 선택용 옵션 목록
export async function fetchSalesCustomerOptions(params: SalesQueryParams = {}): Promise<SalesStatusCustomerOption[]> {
  return (await postJson<SalesStatusCustomerOption[] | null>('/sales/status/customers', params)) ?? [];
}

// 월 단위로 집계된 매출 추이
export async function fetchMonthlySalesTrend(params: SalesQueryParams = {}): Promise<SalesStatusTrendRes[]> {
  return (await postJson<SalesStatusTrendRes[] | null>('/sales/status/trend', params)) ?? [];
}
