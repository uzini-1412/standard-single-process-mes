import { ItemFormData } from "@/types/standard-info/item.interface";
import { UNITS, withUnit } from "@/app/utils/unitConvert";

// 품목정보 목록 그리드 컬럼 (라벨 우선 표기)
export const ITEM_LIST_COLUMNS = [
  { label: "No.", key: "NO", width: "5%" },
  { label: "계정구분", key: "accountType", width: "9%" },
  { label: "품번", key: "itemCode", width: "12%" },
  { label: "품명", key: "itemName", width: "15%" },
  { label: "규격", key: "spec", width: "12%" },
  { label: withUnit("평량", UNITS.basisWeight), key: "basisWeight", width: "10%" },
  { label: withUnit("폭", UNITS.width), key: "width", width: "9%" },
  { label: withUnit("길이", UNITS.length), key: "length", width: "9%" },
  { label: withUnit("중량", UNITS.weight), key: "weight", width: "9%" },
  { label: "적정재고량", key: "safetyStock", width: "10%" },
] as const;

// 품목 등록 폼 초기값 (모든 문자열 필드는 빈 값으로 시작)
export const ITEM_FORM_INITIAL_DATA = (): ItemFormData => ({
  itemCode: "",
  itemName: "",
  itemType: "",
  customerName: "",
  accountType: "",
  spec: "",
  color: "",
  basisWeight: "",
  width: "",
  length: "",
  weight: "",
  widthUnit: "",
  productionSpeed: "",
  importInspGb: "",
  packingUnit: "",
  safetyStock: "",
  remark: "",
  specs: [],
});

// 품목구분(itemType) 옵션은 공통정보 "공정분류" 그룹의 detailName 목록에서
// 동적으로 가져옵니다 (mes_fe/src/app/pages/standard-info/item-info/useItemRegisterForm.ts 참조).
// 분류 추가/변경 시 코드 수정 없이 공통정보관리 화면에서 처리하면 됩니다.

// 수입검사 대상 여부 옵션
export const ITEM_IMPORT_INSPECTION_OPTIONS = [
  { label: "유", value: "유" },
  { label: "무", value: "무" },
] as const;
