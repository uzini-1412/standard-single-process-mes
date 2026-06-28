/* 검사표준(입고/자주/출하) 화면에서 공유하는 컬럼 정의 모음 */

/* ---- 공통 블록 ---- */

// 개정이력 테이블 컬럼
export const REVISION_HISTORY_COLUMNS = [
  { label: "개정번호", key: "revNo" },
  { label: "개정일자", key: "revDate" },
  { label: "개정내용", key: "revContent" },
  { label: "등록자", key: "writerName" },
  { label: "비고", key: "remark" },
];

// 선택 컬럼이 붙은 개정이력 폼용 변형
export const REVISION_HISTORY_FORM_COLUMNS = [
  { label: "선택", key: "selected" },
  ...REVISION_HISTORY_COLUMNS,
];

// 검사항목 테이블 컬럼 (세 검사유형이 공유)
export const INSPECTION_ITEM_COLUMNS = [
  { label: "No.", key: "no" },
  { label: "검사항목", key: "inspectItemName" },
  { label: "검사기준", key: "inspectCriteria" },
  { label: "측정구분", key: "measureType" },
  { label: "검사방법", key: "inspectMethod" },
  { label: "검사주기", key: "inspectCycle" },
  { label: "시료수", key: "sampleCnt" },
  { label: "기준치", key: "baseVal" },
  { label: "상한치", key: "maxVal" },
  { label: "하한치", key: "minVal" },
  { label: "비고", key: "remark" },
];

// 선택 컬럼이 붙은 검사항목 폼용 변형
export const INSPECTION_ITEM_FORM_COLUMNS = [
  { label: "선택", key: "selected" },
  ...INSPECTION_ITEM_COLUMNS,
];

/* ---- 검사유형별 표준 목록 (표준번호 라벨만 다름) ---- */

// 표준번호 헤더만 바꿔 세 유형의 목록 컬럼을 생성
const standardListColumns = (stdLabel: string) => [
  { label: stdLabel, key: "stdNo" },
  { label: "품번", key: "itemCode" },
  { label: "품명", key: "itemName" },
  { label: "개정번호", key: "revNo" },
];

// 입고검사
export const INCOMING_LIST_COLUMNS = standardListColumns("입고검사표준번호");
export const INCOMING_STANDARD_COLUMNS = INSPECTION_ITEM_COLUMNS;
export const INCOMING_STANDARD_FORM_COLUMNS = INSPECTION_ITEM_FORM_COLUMNS;

// 자주검사
export const FREQUENT_LIST_COLUMNS = standardListColumns("자주검사표준번호");
export const INSPECTION_STANDARD_COLUMNS = INSPECTION_ITEM_COLUMNS;
export const INSPECTION_STANDARD_FORM_COLUMNS = INSPECTION_ITEM_FORM_COLUMNS;

// 출하검사
export const SHIPPING_LIST_COLUMNS = standardListColumns("출하검사표준번호");
export const SHIPPING_STANDARD_COLUMNS = INSPECTION_ITEM_COLUMNS;
export const SHIPPING_STANDARD_FORM_COLUMNS = INSPECTION_ITEM_FORM_COLUMNS;
