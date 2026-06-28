/**
 * 기간별 불량현황 화면 모델.
 *
 * 일·라인·품목 단위로 생산량 대비 불량을 집계한 한 줄.
 * 불량 유형별 수치는 동적 키(Record)로 보관한다.
 */
import type { ItemRefView, LineRefView } from "./_shared";

export interface ProductDefectData extends ItemRefView, LineRefView {
  id: string;
  no: string;
  workDate: string;

  basisWeight: string;
  length: string;

  prodQty: string;
  badQty: string;
  /** 불량 유형명 → 수치(문자열) 동적 매핑. */
  defectTypes: Record<string, string>;

  remark: string;
  selected?: boolean;
}
