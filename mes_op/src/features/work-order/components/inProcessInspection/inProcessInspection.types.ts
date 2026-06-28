// 자주검사 화면 내부 전용 타입 모음 (외부 노출 없음)

// 상단 "대상 선택" 그리드의 한 줄
export interface CandidateRow {
  workOrderSq: number;
  itemSq: number;
  no: string;
  lineName: string;
  itemCode: string;
  itemName: string;
  width: string;
  workStatus: string;
  inspectionStatus: string; // 대기 / 초품 / 완료
}

// 검사기준 표의 한 항목 (초품/종품 입력값은 시료 개수만큼 배열로 보관)
export interface CriteriaRow {
  itemDtlSq: number;
  no: string;
  inspectItemName: string;
  inspectCriteria: string;
  inspectMethod: string;
  maxVal: string;
  minVal: string;
  sampleCnt: string;
  firstProducts: string[]; // 시료 수만큼
  lastProducts: string[];  // 시료 수만큼
  passFail: string;
}

// 초품 입력 전 / 초품 저장 후 종품 입력 / 모두 완료
export type InspectionStage = 'none' | 'first_saved' | 'completed';
