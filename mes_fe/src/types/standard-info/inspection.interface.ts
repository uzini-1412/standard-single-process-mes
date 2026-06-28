// 검사기준서 관련 타입
import type { CreatePageMode } from "../common/pageMode";

// 검사 표준 헤더
export interface InspectionHeaderData {
  stdNo: string;
  itemCode: string;
  itemName: string;
  remark: string;
  inspectStdSq?: number;
  inspectType?: string;
  itemSq?: number;
  accountType?: string;
  imgPaths?: string[];
}

// 검사 항목 한 줄
export interface InspectionItemData {
  no: string;
  inspectItemName: string;
  inspectCriteria: string;
  measureType: string;
  inspectMethod: string;
  inspectCycle: string;
  sampleCnt: string;
  baseVal: string;
  maxVal: string;
  minVal: string;
  remark: string;
  itemDtlSq?: number;
  selected?: boolean;
}

// 개정 이력 한 줄
export interface RevisionHistoryData {
  revNo: string;
  revDate: string;
  revContent: string;
  writerName: string;
  remark: string;
  revSq?: number;
  selected?: boolean;
}

// 좌측 목록 그리드 한 줄
export interface InspectionListRow {
  inspectStdSq: number;
  stdNo: string;
  itemCode: string;
  itemName: string;
  revNo: string;
}

export type InspectionPageMode = CreatePageMode;
