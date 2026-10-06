// 품목(item) 도메인 화면 모델 정의
import type { PageMode } from "../common/pageMode";

/**
 * 등록 폼과 상세 화면이 똑같이 들고 다니는 품목 본문 속성.
 * 두 화면이 동일한 필드 묶음을 반복 선언하지 않도록 한곳에 모아
 * `extends` 로 조립한다. (필드 접근 형태는 그대로 → 화면 코드 무변경)
 */
export interface ItemCommonAttributes {
  itemType: string;
  customerName: string;
  spec: string;
  color: string;
  weight: string;
  productionSpeed: string;
  widthUnit: string;
  importInspGb: string;
  packingUnit: string;
  safetyStock: string;
  remark: string;
}

export interface ItemSpecInfo {
  itemSpecSq?: number;
  width: string;
  length: string;
  basisWeight: string;
  weight: string;
  safetyStock: string;
  specOrder?: number;
  warehouseLocation: string;
  storageLocation: string;
}

export interface ItemBaseInfo {
  itemCode: string;
  itemName: string;
  accountType: string;
  basisWeight: string;
  width: string;
  length: string;
}

export interface ItemImageInfo {
  imgPath1?: string;
  imgPath2?: string;
}

export interface ItemDetailData
  extends ItemBaseInfo,
    ItemImageInfo,
    ItemCommonAttributes {
  itemSq?: number;
}

export type ItemSelectValue = Omit<ItemDetailData, "itemSq" | "imgPath1" | "imgPath2">;
export interface ItemSelectRow extends ItemSelectValue {
  selected: boolean;
  no: number;
}

export interface ItemFormData extends ItemBaseInfo, ItemCommonAttributes {
  specs: ItemSpecInfo[];
}

export interface ItemListRow {
  id?: string;
  NO: string;
  accountType: string;
  itemCode: string;
  itemName: string;
  spec: string;
  basisWeight: string;
  width: string;
  length: string;
  weight: string;
  safetyStock: string;
}

export interface ItemDetailPageProps {
  itemId: string | null;
  onBack?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export interface ItemRegisterPageProps {
  mode?: "create" | "edit";
  itemId?: string | null;
  onBack?: () => void;
  onSave?: () => void;
}

export type ItemPageMode = PageMode;

export interface ItemSearchParams {
  keyword?: string;
  accountType?: string;
  itemType?: string;
  spec?: string;
}

export interface ItemSpecData {
  itemSpecSq?: number;
  width?: number | null;
  length?: number | null;
  basisWeight?: number | null;
  weight?: number | null;
  safetyStock?: number | null;
  specOrder?: number;
  warehouseLocation?: string;
  storageLocation?: string;
}

export interface ItemSpecRes {
  itemSpecSq: number;
  width?: number;
  length?: number;
  basisWeight?: number;
  weight?: number;
  safetyStock?: number;
  specOrder?: number;
  warehouseLocation?: string;
  storageLocation?: string;
}

export interface ItemSaveData {
  itemCode: string;
  itemName: string;
  itemType?: string;
  customerName?: string;
  accountType?: string;
  packingUnit?: string;
  spec?: string;
  basisWeight?: number | null;
  width?: number | null;
  widthUnit?: string;
  length?: number | null;
  weight?: number | null;
  color?: string;
  productionSpeed?: number | null;
  safetyStock?: number | null;
  importInspGb?: boolean | null;
  remark?: string;
  imgPaths?: string[];
  useYn?: boolean;
  specs?: ItemSpecData[];
}

export interface ItemUpdateData extends ItemSaveData {
  itemSq: number;
}

export interface ItemRes {
  itemSq: number;
  itemCode: string;
  itemName: string;
  itemType?: string;
  customerName?: string;
  accountType?: string;
  packingUnit?: string;
  spec?: string;
  basisWeight?: number;
  width?: number;
  widthUnit?: string;
  length?: number;
  weight?: number;
  color?: string;
  productionSpeed?: number;
  safetyStock?: number;
  optimalStock?: number;
  importInspGb?: boolean;
  remark?: string;
  imgPaths?: string[];
  useYn?: boolean;
  regDt?: string;
  modDt?: string;
  specs?: ItemSpecRes[];
}

export interface ItemSearchForm {
  accountType: string;
  itemCode: string;
  itemName: string;
  spec: string;
}

export type ItemSearchField = keyof ItemSearchForm;

export interface ItemFormOptions {
  itemTypeOptions: string[];
  accountTypeOptions: string[];
  clientOptions: string[];
  warehouseLocationOptions: string[];
}
