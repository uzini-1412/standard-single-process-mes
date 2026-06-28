// standard-info/common — 공통코드 관련 타입
import type { CreatePageMode } from "../common/pageMode";

// 등록/수정 시 세부내용 한 건을 표현
export interface CommonInfoValue {
  valueSq?: number;
  valueContent: string;
}

// 공통코드 마스터 한 건
export interface CommonInfo {
  groupCode: string;        // 그룹(항목) 코드
  groupName: string;        // 그룹(항목) 명
  detailCode: string;       // 세부 코드
  detailName: string;       // 세부 명
  contentValues: string[];  // 세부 내용 목록(백엔드 Res.contentValues)
  useYn: boolean;           // true: 사용 / false: 미사용
  detailSq?: number;        // 백엔드 PK(Long)
  regDt?: string;           // 등록 일시
  modDt?: string;           // 수정 일시
}

// 폼에서는 contentValues 대신 values 배열로 세부내용을 관리한다.
export interface CommonInfoForm extends Omit<CommonInfo, "contentValues"> {
  useYn: boolean;
  values: CommonInfoValue[];
}

// 등록 화면 하단 이력 그리드 한 줄
export interface CommonInfoHistoryItem extends CommonInfoForm {
  rowNum: number;
  isSelected: boolean;
}

// 화면 모드 (구 ViewMode 대체)
export type CommonInfoPageMode = CreatePageMode;
