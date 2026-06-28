/**
 * Production result API client — BE /api/production/result (WorkResultController).
 * Shared by 6 production menus: daily production report, product weight status, period defect status,
 * period downtime status, equipment operation, and production trend (distinguished by route).
 */
import { postJson, emptyPage, type PageEnvelope } from './request';
import type {
  WorkResultSearchParams,
  WorkResultRes,
  WorkResultDetailRes,
  DowntimeSearchParams,
  DowntimeRes,
} from '@/types/production/workResult.interface';

export type { WorkResultSearchParams, WorkResultRes, WorkResultDetailRes, DowntimeSearchParams, DowntimeRes };

// Fetch production result list (daily report use, returns full set)
export async function fetchDailyProductionReport(params: WorkResultSearchParams = {}): Promise<WorkResultRes[]> {
  return (await postJson<WorkResultRes[] | null>('/production/result/list', params)) || [];
}

// 페이징 응답 구조
export type PageData<T> = PageEnvelope<T>;

// Fetch production result with paging (recommended for large datasets)
export async function fetchDailyProductionReportPaged(
  params: WorkResultSearchParams & { page?: number; size?: number } = {}
): Promise<PageData<WorkResultRes>> {
  return (await postJson<PageData<WorkResultRes> | null>('/production/result/list-paged', params)) ?? emptyPage<WorkResultRes>();
}

// Fetch defect status detail
export async function fetchProductDefectDetails(params: WorkResultSearchParams = {}): Promise<WorkResultDetailRes[]> {
  return (await postJson<WorkResultDetailRes[] | null>('/production/result/defect/list', params)) || [];
}

// Period defect status (lightweight) — DB filters only rows with defect > 0
export async function fetchPeriodDefectSummary(params: WorkResultSearchParams = {}): Promise<WorkResultRes[]> {
  return (await postJson<WorkResultRes[] | null>('/production/result/defect-summary', params)) || [];
}

// Fetch downtime status records
export async function fetchEquipmentDowntimeRecords(params: DowntimeSearchParams = {}): Promise<DowntimeRes[]> {
  return (await postJson<DowntimeRes[] | null>('/production/result/downtime/list', params)) || [];
}

// Line x monthly production length sum (production trend) — GROUP BY response instead of a full year of work_result
export interface LineMonthlySum {
  lineName: string;
  month: number;
  qty: number;
}
export async function fetchLineMonthlyProductionTrend(dateFrom: string, dateTo: string): Promise<LineMonthlySum[]> {
  return (await postJson<LineMonthlySum[] | null>('/production/result/trend/line-monthly', { dateFrom, dateTo })) || [];
}

