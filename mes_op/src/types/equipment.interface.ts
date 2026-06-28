//작업자 설비점검

export interface InspectionItemData {
  facilitySq: number;
  facilityName: string;
  checkItemSq: number;
  no: number;
  checkItemNm: string;       // 점검항목명
  checkMethod: string;       // 점검방법 (육안확인 / 측정기록)
  checkCriteria: string;     // 점검기준
  minVal: string;            // 관리 하한
  maxVal: string;            // 관리 상한
  unit: string;              // 단위
  checkVal: string;          // 점검결과 (측정값 입력)
  checkResult: string;       // 판정 (OK / NG)
  remark: string;
  resultSq?: number;         // 기존 저장된 결과 PK (수정 시)
  rowspan: number;
  isFirstInGroup: boolean;
}

export interface DailyFacilityCheckProps {
  onBack: () => void;
  onHome: () => void;
  workOrderLineName?: string; // 저장 버튼 노출 판단에 쓰이는 현재 작업지시 라인명
}
