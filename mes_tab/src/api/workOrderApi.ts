import { postData } from './http';
import type { WorkOrderRes } from '../types';

/** 기간·라인 조건으로 작업지시 목록을 조회한다. (조건은 모두 선택적) */
export const fetchWorkOrderList = (query: {
  dateFrom?: string;
  dateTo?: string;
  lineSq?: number;
}): Promise<WorkOrderRes[]> => postData<WorkOrderRes[]>('/production/work-order/list', query);
