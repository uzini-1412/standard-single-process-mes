import { UNITS, withUnit } from "@/app/utils/unitConvert";

// 배합형(RECIPE) 자재 그리드 컬럼
export const RECIPE_MATERIAL_COLUMNS = [
  { key: "selected", label: "선택" },
  { key: "no", label: "No." },
  { key: "materialType", label: "소재구분" },
  { key: "materialCode", label: "소재 품번" },
  { key: "materialName", label: "소재 품명" },
  { key: "materialSpec", label: "규격" },
  { key: "requiredQty", label: withUnit("소요량", UNITS.basisWeight) },
  { key: "ratio", label: "비중(%)" },
  { key: "plcMachineNo", label: "호기" },
  { key: "remark", label: "비고" },
] as const;

// 조립형(ASSEMBLY) 구성품 그리드 컬럼 — 코어(구성품/수량/단위)
export const ASSEMBLY_MATERIAL_COLUMNS = [
  { key: "selected", label: "선택" },
  { key: "no", label: "No." },
  { key: "materialCode", label: "구성품번" },
  { key: "materialName", label: "구성품명" },
  { key: "materialSpec", label: "규격" },
  { key: "requiredQty", label: "수량" },
  { key: "unit", label: "단위" },
  { key: "remark", label: "비고" },
] as const;

// BOM 목록 기본 컬럼 (구성품 동적 컬럼은 화면에서 추가)
export const BOM_LIST_BASE_COLUMNS = [
  { key: "no", label: "No.", isMaterial: false, materialIndex: -1 },
  { key: "bomNo", label: "BOM번호", isMaterial: false, materialIndex: -1 },
  { key: "productCode", label: "품번", isMaterial: false, materialIndex: -1 },
  { key: "productName", label: "품명", isMaterial: false, materialIndex: -1 },
  { key: "basisWeight", label: withUnit("평량", UNITS.basisWeight), isMaterial: false, materialIndex: -1 },
] as const;
