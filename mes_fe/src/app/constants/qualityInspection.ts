import { UNITS, withUnit } from "@/app/utils/unitConvert";

/* ===== 입고검사 ===== */

// 입고검사 대상 선택 (상단)
export const INCOMING_INSPECTION_TARGET_COLUMNS = [
  { label: "No.", key: "no" },
  { label: "발주번호", key: "orderNo" },
  { label: "거래처명", key: "customerName" },
  { label: "품번", key: "itemCode" },
  { label: "품명", key: "itemName" },
  { label: "계정구분", key: "accountType" },
  { label: "발주수량", key: "orderQty" },
  { label: "입고요청일", key: "inReqDate" },
  { label: "가입고수량", key: "inboundQty" },
  { label: "가입고일자", key: "inboundDate" },
] as const;

// 입고검사 결과 (하단)
export const INCOMING_INSPECTION_RESULT_COLUMNS = [
  { label: "No.", key: "no" },
  { label: "발주번호", key: "orderNo" },
  { label: "계정구분", key: "accountType" },
  { label: "품번", key: "itemCode" },
  { label: "품명", key: "itemName" },
  { label: "입고검사 Lot-No", key: "lotNo" },
  { label: "검사수량", key: "inboundQty" },
  { label: "검사결과", key: "inspectResult" },
  { label: "성적서", key: "certificate" },
  { label: "검사일자", key: "inspectDate" },
] as const;

export const INCOMING_INSPECTION_ITEM_COLUMNS = [
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
  // ... (동적 측정값 컬럼 삽입 위치)
  { label: "합부", key: "resultYn" },
] as const;

/* ===== 공정검사현황(자주검사) ===== */

// 진척현황 상단 테이블
export const selfInspectionHeaderColumns = [
  { label: "선택", key: "selected", width: "70px" },
  { label: "No", key: "no", width: "80px" },
  { label: "검사일", key: "inspectDate", width: "120px" },
  { label: "라인", key: "lineName", width: "100px" },
  { label: "품번", key: "itemCode", width: "120px" },
  { label: "품명", key: "itemName", width: "150px" },
  { label: "진행상황", key: "progressStatus", width: "120px" },
  { label: "합부", key: "passFail", width: "100px" },
  { label: "비고", key: "remark", width: "200px" },
];

// 결과 하단 테이블 (검사항목 + 초품/종품)
// rowSpan=true: 검사항목 단위로 묶이는 컬럼 (시료수만큼 rowspan)
// rowSpan 없음: 시료별로 행마다 다른 값
export const selfInspectionResultColumns = [
  { label: "순번", key: "no", width: "70px", rowSpan: true },
  { label: "검사항목", key: "inspectItemName", width: "120px", rowSpan: true },
  { label: "검사기준", key: "inspectCriteria", width: "100px", rowSpan: true },
  { label: "검사방법", key: "inspectMethod", width: "100px", rowSpan: true },
  { label: "주기", key: "inspectCycle", width: "80px", rowSpan: true },
  { label: "기준치", key: "baseVal", width: "80px", rowSpan: true },
  { label: "상한치", key: "maxVal", width: "80px", rowSpan: true },
  { label: "하한치", key: "minVal", width: "80px", rowSpan: true },
  { label: "시료수", key: "sampleNo", width: "70px" },
  { label: "초품", key: "firstVal", width: "80px" },
  { label: "종품", key: "lastVal", width: "80px" },
  { label: "합부판정", key: "passFail", width: "100px" },
  { label: "자주검사 Lot-No", key: "lotNo", width: "140px", rowSpan: true },
];

/* ===== 출하검사 ===== */

// 출하검사 결과 목록 컬럼 (x1~xN은 UI 노출 X — DB 호환 위해 데이터는 유지)
// "중량" = 생산 롤중량(kg) — 해당 LOT의 생산일보 측정 롤중량
// "생산평량" = 해당 LOT의 생산일보 측정 평량(g/m²)
export const SHIPPING_INSPECTION_BASE_COLUMNS = [
  { label: "No.", key: "no", width: "70px" },
  { label: "검사일자", key: "inspectDate", width: "120px" },
  { label: "품번", key: "itemCode", width: "120px" },
  { label: "품명", key: "itemName", width: "150px" },
  { label: withUnit("평량", UNITS.basisWeight), key: "basisWeight", width: "100px" },
  { label: withUnit("폭", UNITS.width), key: "width", width: "100px" },
  { label: withUnit("길이", UNITS.length), key: "length", width: "100px" },
  { label: withUnit("생산 롤중량", UNITS.weight), key: "weight", width: "120px" },
  { label: withUnit("생산평량", UNITS.basisWeight), key: "rollBasis", width: "110px" },
  { label: "상한치", key: "maxVal", width: "100px" },
  { label: "하한치", key: "minVal", width: "100px" },
];
export const SHIPPING_INSPECTION_END_COLUMNS = [
  { label: "합부판정", key: "judgeCode", width: "100px" },
  { label: "제품LOT", key: "productLotNo", width: "140px" },
  { label: "출하검사 Lot-No", key: "lotNo", width: "140px" },
  { label: "첨부", key: "attachment", width: "80px" },
];
// 하위 호환 (기존 참조하던 곳용)
export const SHIPPING_INSPECTION_COLUMNS = [
  ...SHIPPING_INSPECTION_BASE_COLUMNS,
  ...SHIPPING_INSPECTION_END_COLUMNS,
];

// 출하검사 대상선택 컬럼
export const SHIPPING_TARGET_COLUMNS = [
  { label: "선택", key: "checkbox", width: "50px" },
  { label: "No.", key: "no", width: "60px" },
  { label: "출고일", key: "expectedShipDate", width: "110px" },
  { label: "거래처", key: "customerName", width: "120px" },
  { label: "품번", key: "itemCode", width: "120px" },
  { label: "품명", key: "itemName", width: "150px" },
  { label: "출하 Lot-No", key: "lotNo", width: "130px" },
  { label: withUnit("평량", UNITS.basisWeight), key: "basisWeight", width: "100px" },
  { label: withUnit("폭", UNITS.width), key: "width", width: "90px" },
  { label: withUnit("길이", UNITS.length), key: "length", width: "90px" },
  { label: withUnit("출하지시량", UNITS.length), key: "orderQty", width: "110px" },
  { label: "출하롤수", key: "orderQtyEa", width: "90px" },
  { label: "도착지", key: "destination", width: "120px" },
  { label: "출하예정시간", key: "expectedShipTime", width: "110px" },
  { label: "거래처요청사항", key: "customerReq", width: "150px" },
];
