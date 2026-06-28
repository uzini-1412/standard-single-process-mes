/** 설비 일상점검 API 클라이언트 — BE /api/facility/daily-check (FacilityDailyCheckController). [설비관리 > 일상점검현황]. */
import { postJson } from './request';

export interface DailyCheckSearchParams {
  facilitySq?: number;
  dateFrom?: string;
  dateTo?: string;
  checkResult?: string;
}

export interface DailyCheckRes {
  resultSq: number;
  facilitySq: number;
  facilityName: string;
  checkItemSq: number;
  checkItemNm: string;
  checkCriteria: string;
  checkDate: string;
  checkTime: string;
  checkVal: string;
  checkResult: string;
  actionContent: string;
  remark: string;
  checkerId: string;
  regDt: string;
}

export async function fetchDailyCheckList(params: DailyCheckSearchParams = {}): Promise<DailyCheckRes[]> {
  return (await postJson<DailyCheckRes[] | null>('/facility/daily-check/list', params)) ?? [];
}
