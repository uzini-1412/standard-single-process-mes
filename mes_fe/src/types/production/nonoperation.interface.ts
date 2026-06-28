/**
 * 기간별 비가동현황 화면 모델.
 *
 * 일·라인 단위로 가동시간 대비 비가동을 집계한 한 줄.
 * 비가동 사유별 수치는 동적 키(Record)로 보관한다.
 */
import type { LineRefView } from "./_shared";

export interface NonOperationData extends LineRefView {
  id: string;
  no: string;
  workDate: string;

  startTime: string;
  operationTime: string;

  downtimeTotal: string;
  /** 비가동 사유명 → 수치(문자열) 동적 매핑. */
  downtimeByType: Record<string, string>;

  remark: string;
}
