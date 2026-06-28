import { apiRequest } from './config';
import type { WorkOrderResponse } from '@/types/workOrder.interface';

/** 작업지시 목록 조회 시 넘길 수 있는 필터(모두 선택값). */
export interface WorkOrderSearchParams {
  dateFrom?: string;
  dateTo?: string;
  lineSq?: number;
  lineName?: string;
}

/** 공통코드(공통정보) 한 행. contentValues 안에 하위 선택지가 담긴다. */
export interface CommonInfoResponse {
  detailSq: number;
  groupCode: string;
  groupName: string;
  detailCode: string;
  detailName: string;
  useYn: boolean;
  contentValues: string[];
}

const WORK_ORDER_LIST = '/production/work-order/list';
const WORK_ORDER_STATUS = '/production/work-order/update-status';
const COMMON_INFO_LIST = '/common-info/list';

type WorkStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'STOPPED';

/** 작업지시 목록 조회. 필터를 생략하면 전체를 가져온다. */
export function fetchWorkOrderList(params: WorkOrderSearchParams = {}): Promise<WorkOrderResponse[]> {
  return apiRequest<WorkOrderResponse[]>(WORK_ORDER_LIST, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/** 작업지시 상태 전환(대기/진행/완료/중지). */
export function updateWorkOrderStatus(workOrderSq: number, workStatus: WorkStatus): Promise<void> {
  return apiRequest<void>(WORK_ORDER_STATUS, {
    method: 'POST',
    body: JSON.stringify({ workOrderSq, workStatus }),
  });
}

/** 사용중(useYn=Y)인 공통정보 전체 목록. */
export function fetchCommonInfoList(): Promise<CommonInfoResponse[]> {
  return apiRequest<CommonInfoResponse[]>(COMMON_INFO_LIST, {
    method: 'POST',
    body: JSON.stringify({ groupCode: '', useYn: 'Y' }),
  });
}

/**
 * 공통정보를 그룹명/세부명으로 좁혀서 가져온다.
 * 예) groupName='라인구분' + detailName=선택한 제품구분 → 해당 행의 contentValues.
 * detailName을 비우면 그룹명만으로 필터한다.
 */
export async function fetchCommonInfoByFilter(
  groupName: string,
  detailName?: string,
): Promise<CommonInfoResponse[]> {
  const rows = await fetchCommonInfoList();
  return rows.filter(
    (row) => row.groupName === groupName && (!detailName || row.detailName === detailName),
  );
}
