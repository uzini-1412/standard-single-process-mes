// 계측기 관리 목록 컬럼
export const INSTRUMENT_COLUMNS = [
  { label: "No.", key: "No" },
  { label: "관리번호", key: "manageNo" },
  { label: "구분", key: "instrumentType" },
  { label: "기기명", key: "instrumentNm" },
  { label: "모델명", key: "modelNm" },
  { label: "기기번호", key: "instrumentNo" },
  { label: "규격&형식", key: "spec" },
  { label: "제조사", key: "makerNm" },
  { label: "구입일자", key: "purchaseDate" },
  { label: "구입금액", key: "purchasePrice" },
  { label: "교정주기", key: "calibCycle" },
  { label: "교정기관", key: "calibAgency" },
  { label: "교정일자", key: "lastCalibDate" },
  { label: "차기교정일자", key: "nextCalibDate" },
  { label: "잔여일", key: "remainingDays" },
  { label: "비고", key: "remark" },
];

// 계측기 이력 관리 목록 컬럼
export const INSTRUMENT_HISTORY_COLUMNS = [
  { label: "No.", key: "No" },
  { label: "관리번호", key: "manageNo" },
  { label: "구분", key: "instrumentType" },
  { label: "기기명", key: "instrumentNm" },
  { label: "모델명", key: "modelNm" },
  { label: "기기번호", key: "instrumentNo" },
  { label: "규격&형식", key: "spec" },
  { label: "이력구분", key: "historyType" },
  { label: "조치일자", key: "occurDate" },
  { label: "교정기관", key: "agencyNm" },
  { label: "조치금액", key: "actionCost" },
  { label: "검교정성적서", key: "reportFilePath" },
  { label: "이력내용", key: "actionContent" },
  { label: "비고", key: "remark" },
];

// 이력구분 셀렉트 옵션
export const HISTORY_TYPE_OPTIONS = [
  { label: "교정", value: "교정" },
  { label: "수리", value: "수리" },
  { label: "점검", value: "점검" },
];
export const HISTORY_TYPE_CALIBRATION = "교정";

// 계측기 이력카드 컬럼
export const HISTORY_CARD_COLUMNS = [
  { label: "조치일자", key: "occurDate" },
  { label: "조치내용 & 특기사항", key: "actionContent" },
  { label: "소요비용", key: "actionCost" },
  { label: "교정기관", key: "agencyNm" },
  { label: "비고", key: "remark" },
];
