/* 설비/점검 관련 화면 컬럼 정의 모음 */

/* ===== 설비정보관리 ===== */
export const EQUIPMENT_COLUMNS = [
  { label: "제품구분", key: "facilityType" },
  { label: "라인구분", key: "lineNm" },
  { label: "등록일자", key: "regDt" },
  { label: "설비번호", key: "manageNo" },
  { label: "설비명", key: "facilityName" },
  { label: "사용공정", key: "processNm" },
  { label: "제작사", key: "makerNm" },
  { label: "제원", key: "spec" },
  { label: "구입일자", key: "purchaseDate" },
  { label: "구입금액", key: "purchasePrice" },
  { label: "용도", key: "purpose" },
  { label: "AS업체명", key: "asCompany" },
  { label: "폐기일자", key: "disposeDate" },
  { label: "첨부", key: "attachFileNm" },
];

/* ===== 일상점검 정의서 ===== */
// 조회 화면(DailyInspectionPage)용 설비 목록
export const DAILY_EQUIPMENT_COLUMNS = [
  { label: "선택", key: "selected" },
  { label: "No.", key: "No" },
  { label: "설비번호", key: "manageNo" },
  { label: "설비명", key: "facilityName" },
  { label: "사용공정", key: "processNm" },
  { label: "제작사", key: "makerNm" },
  { label: "구입일자", key: "purchaseDate" },
  { label: "구입금액", key: "purchasePrice" },
  { label: "용도", key: "purpose" },
  { label: "폐기일자", key: "disposeDate" },
];

export const DAILY_INSPECTION_COLUMNS = [
  { label: "선택", key: "selected" },
  { label: "No.", key: "No" },
  { label: "설비 번호", key: "manageNo" },
  { label: "설비명", key: "facilityName" },
  { label: "점검항목", key: "checkItemNm" },
  { label: "점검방법", key: "checkMethod" },
  { label: "단위", key: "unit" },
  { label: "기준치", key: "checkCriteria" },
  { label: "상한치", key: "maxVal" },
  { label: "하한치", key: "minVal" },
  { label: "비고", key: "remark" },
];

// 등록 화면(DailyInspectionRegisterPage)용 설비 컬럼
export const REGISTER_EQUIPMENT_COLUMNS = [
  { label: "선택", key: "선택" },
  { label: "No.", key: "No" },
  { label: "설비번호", key: "설비번호" },
  { label: "설비명", key: "설비명" },
  { label: "사용공정", key: "사용공정" },
  { label: "제작사", key: "제작사" },
  { label: "구입일자", key: "구입일자" },
  { label: "구입금액", key: "구입금액" },
  { label: "용도", key: "용도" },
  { label: "현재상태", key: "현재상태" },
  { label: "폐기일자", key: "폐기일자" },
  { label: "비고", key: "비고" },
];

export const REGISTER_INSPECTION_COLUMNS = [
  { label: "선택", key: "선택" },
  { label: "No.", key: "No" },
  { label: "설비번호", key: "설비번호" },
  { label: "설비명", key: "설비명" },
  { label: "점검항목", key: "점검항목" },
  { label: "점검방법", key: "점검방법" },
  { label: "점검방법분류", key: "점검방법분류" },
  { label: "단위", key: "단위" },
  { label: "기준치", key: "기준치" },
  { label: "상한치", key: "상한치" },
  { label: "하한치", key: "하한치" },
  { label: "비고", key: "비고" },
];

/* ===== 일상점검 결과 ===== */
export const RESULT_INSPECTION_COLUMNS = [
  { label: "선택", key: "선택" },
  { label: "No.", key: "No" },
  { label: "설비번호", key: "설비번호" },
  { label: "설비명", key: "설비명" },
  { label: "일상점검항목", key: "점검항목" },
  { label: "점검방법", key: "점검방법" },
  { label: "기준치", key: "기준치" },
  { label: "상한치", key: "상한치" },
  { label: "하한치", key: "하한치" },
  { label: "점검결과", key: "점검결과" },
  { label: "이상유무", key: "이상유무" },
];

/* ===== 정기점검 ===== */
// 등록 화면 상단: 설비정보 대상 선택
export const PERIODIC_EQUIPMENT_COLUMNS = [
  { label: "선택", key: "selected" },
  { label: "제품구분", key: "facilityType" },
  { label: "라인구분", key: "lineNm" },
  { label: "등록일자", key: "regDt" },
  { label: "설비번호", key: "manageNo" },
  { label: "설비명", key: "facilityName" },
  { label: "사용공정", key: "processNm" },
  { label: "제작사", key: "makerNm" },
  { label: "제원", key: "spec" },
];

// 등록 화면 하단: 정기점검 등록 내역
export const PERIODIC_REGISTER_HISTORY_COLUMNS = [
  { label: "선택", key: "selected" },
  { label: "No.", key: "No" },
  { label: "설비번호", key: "manageNo" },
  { label: "설비명", key: "facilityName" },
  { label: "구분", key: "checkType" },
  { label: "점검자", key: "checkerNm" },
  { label: "계획일자", key: "planDate" },
  { label: "계획내용", key: "planContent" },
  { label: "실시일자", key: "execDate" },
  { label: "실시내용", key: "execContent" },
  { label: "현재상태", key: "currentStatus" },
  { label: "비고", key: "remark" },
];

// 메인 화면: 조회현황
export const PERIODIC_LIST_COLUMNS = [
  { label: "No.", key: "No" },
  { label: "설비번호", key: "manageNo" },
  { label: "설비명", key: "facilityName" },
  { label: "구분", key: "checkType" },
  { label: "점검자", key: "checkerNm" },
  { label: "계획일자", key: "planDate" },
  { label: "계획내용", key: "planContent" },
  { label: "실시일자", key: "execDate" },
  { label: "실시내용", key: "execContent" },
  { label: "현재상태", key: "currentStatus" },
  { label: "비고", key: "remark" },
];

/* ===== 설비이력관리 ===== */
// 메인 화면: 조회현황
export const HISTORY_LIST_COLUMNS = [
  { label: "No.", key: "No" },
  { label: "설비번호", key: "manageNo" },
  { label: "설비명", key: "facilityName" },
  { label: "제품구분", key: "facilityType" },
  { label: "라인구분", key: "lineNm" },
  { label: "사용공정", key: "processNm" },
  { label: "관리번호", key: "historyNo" },
  { label: "조치구분", key: "actionType" },
  { label: "발생일자", key: "occurDate" },
  { label: "발생내용", key: "occurContent" },
  { label: "조치일자", key: "actionDate" },
  { label: "조치책임자", key: "actionManager" },
  { label: "조치내용", key: "actionContent" },
  { label: "조치시간", key: "actionTime" },
  { label: "조치비용", key: "actionCost" },
  { label: "비고", key: "remark" },
];

// 등록 화면 상단: 설비정보
export const HISTORY_EQUIPMENT_COLUMNS = [
  { label: "선택", key: "selected" },
  { label: "설비번호", key: "manageNo" },
  { label: "설비명", key: "facilityName" },
  { label: "제품구분", key: "facilityType" },
  { label: "라인구분", key: "lineNm" },
  { label: "사용공정", key: "processNm" },
];

// 등록 화면 하단: 저장/조회 현황
export const HISTORY_REGISTER_COLUMNS = [
  { label: "선택", key: "selected" },
  { label: "No.", key: "No" },
  { label: "설비번호", key: "manageNo" },
  { label: "설비명", key: "facilityName" },
  { label: "제품구분", key: "facilityType" },
  { label: "라인구분", key: "lineNm" },
  { label: "사용공정", key: "processNm" },
  { label: "관리번호", key: "historyNo" },
  { label: "조치구분", key: "actionType" },
  { label: "발생일자", key: "occurDate" },
  { label: "발생내용", key: "occurContent" },
  { label: "조치일자", key: "actionDate" },
  { label: "조치책임자", key: "actionManager" },
  { label: "조치내용", key: "actionContent" },
  { label: "조치시간", key: "actionTime" },
  { label: "조치비용", key: "actionCost" },
  { label: "비고", key: "remark" },
];

/* ===== 설비이력카드 ===== */
export const HISTORY_CARD_COLUMNS = [
  { label: "발생일자", key: "occurDate" },
  { label: "조치내용 & 특기사항", key: "actionContent" },
  { label: "발생비용", key: "actionCost" },
  { label: "조치자", key: "actionManager" },
  { label: "비고", key: "remark" },
];

/* ===== 설비예비품관리 ===== */
export const SPARE_PARTS_COLUMNS = [
  { label: "No", key: "No" },
  { label: "예비품번호", key: "partNo" },
  { label: "예비품명", key: "partNm" },
  { label: "규격", key: "spec" },
  { label: "구입처", key: "supplierNm" },
  { label: "구입일자", key: "purchaseDate" },
  { label: "구입금액", key: "purchasePrice" },
  { label: "안전재고량", key: "safetyStock" },
  { label: "현재고량", key: "currentStock" },
  { label: "보관위치", key: "storageLoc" },
  { label: "사용설비", key: "useFacility" },
  { label: "비고", key: "remark" },
];
