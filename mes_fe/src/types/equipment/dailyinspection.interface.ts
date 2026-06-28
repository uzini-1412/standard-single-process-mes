// Daily-inspection definition types
import { EquipmentRecord } from "./info.interface";

// Shared columns for an inspection check item.
export interface BaseInspectionItem {
  manageNo: string;
  facilityName: string;
  checkItemNm: string;
  checkMethod: string;
  unit: string;
  checkCriteria: string;
  maxVal: string;
  minVal: string;
  remark: string;
}

// Equipment list row on the daily-inspection (lookup) screen.
export interface DailyInspectionEquipment
  extends Pick<
    EquipmentRecord,
    | "selected"
    | "manageNo"
    | "facilityName"
    | "processNm"
    | "makerNm"
    | "purchaseDate"
    | "purchasePrice"
    | "purpose"
    | "disposeDate"
    | "imgPaths"
  > {
  No: string;
  facilitySq: number;
}

// Equipment list row on the registration screen (adds status fields).
export interface DailyInspectionRegisterEquipment
  extends Pick<
    EquipmentRecord,
    | "selected"
    | "No"
    | "manageNo"
    | "facilityName"
    | "processNm"
    | "makerNm"
    | "purchaseDate"
    | "purchasePrice"
    | "purpose"
    | "disposeDate"
  > {
  facilitySq: number;
  currentStatus: string;
  remark: string;
}

// Lookup / list view row.
export interface InspectionItemData extends BaseInspectionItem {
  selected: boolean;
  No: string;
  isSaved: boolean;
  checkItemImg?: string;
  checkItemSq?: number;
  facilitySq?: number;
}

// Registration view row.
export interface InspectionItemRecord extends BaseInspectionItem {
  No: number;
  checkMethodType: string;
}

// ---- Daily-inspection results ----
export interface ResultInspectionItem
  extends Pick<
    BaseInspectionItem,
    | "manageNo"
    | "facilityName"
    | "checkItemNm"
    | "checkMethod"
    | "checkCriteria"
    | "maxVal"
    | "minVal"
  > {
  selected: boolean;
  No: string;
  facilitySq: number;
  checkItemSq: number;
  checkResult: string;
  abnormality: string;
}

export interface MonthlyInspectionItem {
  No: string;
  checkItemNm: string;
  remark: string;
  [key: string]: string;
}
