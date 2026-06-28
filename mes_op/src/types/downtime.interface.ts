/**
 * 비가동(작업중지) 화면 타입 모음.
 * - 유형 등록 폼(DowntimeEntryForm)
 * - 비가동 현황 행/목록(DowntimeStatus / DowntimeLogList)
 */
import { WorkOrderResponse } from "./workOrder.interface";

/** 비가동 유형 등록 폼 props. */
export interface DowntimeEntryFormProps {
  onBack: () => void;
  onHome: () => void;
  workOrderData?: WorkOrderResponse | null;
  onWorkOrderUpdate?: (
    updatedData: Partial<WorkOrderResponse> & { workOrderSq: number },
  ) => void;
  /**
   * 사유 입력칸 중 하나라도 채워졌는지(hasReason)를 등록/수정 직후 부모로 즉시 전달.
   * 부모는 백엔드 재조회를 기다리지 않고 이 값으로 reasonEntered를 선반영한다.
   */
  onDowntimeChanged?: (hasReason: boolean) => void;
}

/** 비가동 현황 테이블 한 행. */
export interface DowntimeStatusRow {
  type: string;
  startTime: string;
  endTime: string;
  downtimeDuration: string;
  actionContent: string;
  actionResponsible: string;
}

/** 비가동 이력 목록 props. */
export interface DowntimeLogListProps {
  onBack: () => void;
  onHome: () => void;
  workOrderSq?: number;
}
