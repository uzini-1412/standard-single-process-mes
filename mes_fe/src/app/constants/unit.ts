import { UNITS, withUnit } from "@/app/utils/unitConvert";

// 단가표준 목록 (비율 폭 지정)
export const UNIT_PRICE_LIST_COLUMNS = [
  { label: "No.", key: "no", width: "4%" },
  { label: "단가구분", key: "priceType", width: "7%" },
  { label: "거래처번호", key: "customerCode", width: "8%" },
  { label: "거래처명", key: "customerName", width: "11%" },
  { label: "품번", key: "itemCode", width: "8%" },
  { label: "품명", key: "itemName", width: "11%" },
  { label: withUnit("폭", UNITS.width), key: "width", width: "6%" },
  { label: "계정구분", key: "accountType", width: "7%" },
  { label: "단가", key: "price", width: "8%" },
  { label: "단가단위", key: "priceUnit", width: "6%" },
  { label: "변경일자", key: "changeDate", width: "8%" },
  { label: "적용일자", key: "startDate", width: "8%" },
  { label: "비고", key: "remark", width: "6%" },
];

// 단가 등록 (선택 컬럼 포함)
export const UNIT_PRICE_REGISTER_COLUMNS = [
  { label: "선택", key: "selected" },
  { label: "단가구분", key: "priceType" },
  { label: "거래처번호", key: "customerCode" },
  { label: "거래처명", key: "customerName" },
  { label: "품번", key: "itemCode" },
  { label: "품명", key: "itemName" },
  { label: withUnit("폭", UNITS.width), key: "width" },
  { label: "계정구분", key: "accountType" },
  { label: "단가", key: "price" },
  { label: "단가단위", key: "priceUnit" },
  { label: "변경일자", key: "changeDate" },
  { label: "적용일자", key: "startDate" },
  { label: "비고", key: "remark" },
];

// 단가 변경이력
export const UNIT_PRICE_HISTORY_COLUMNS = [
  { label: "단가구분", key: "priceType" },
  { label: "계정구분", key: "accountType" },
  { label: "폭(mm)", key: "width" },
  { label: "길이(m)", key: "length" },
  { label: "단가", key: "price" },
  { label: "단가단위", key: "priceUnit" },
  { label: "변경일자", key: "changeDate" },
  { label: "적용일자", key: "startDate" },
  { label: "비고", key: "remark" },
];
