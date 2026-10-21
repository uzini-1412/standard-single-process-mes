// Equipment periodic-inspection types
import { EquipmentRecord } from "./info.interface";

// Shared field set for every periodic-inspection view.
export interface BasePeriodicInspection {
  manageNo: string;
  facilityName: string;
  imgPaths?: string | null;
  checkItemNm: string;
  checkMethod: string;
  checkCriteria: string;
  maxVal: string;
  minVal: string;
  unit: string;
  checkType: string;
  checkerNm: string;
  planDate: string;
  /** @deprecated 점검항목 구조(checkItemNm 등)로 대체됨. 과거 데이터 표시용으로만 타입에 남겨둠. */
  planContent?: string;
  execDate: string;
  /** @deprecated 점검항목 구조(checkItemNm 등)로 대체됨. 과거 데이터 표시용으로만 타입에 남겨둠. */
  execContent?: string;
  execResult: string;
  currentStatus: string;
  remark: string;
}

// Equipment picked from the master list when registering an inspection.
export interface PeriodicInspectionEquipment
  extends Pick<
    EquipmentRecord,
    | "manageNo"
    | "facilityName"
    | "facilityType"
    | "lineNm"
    | "processNm"
    | "makerNm"
    | "spec"
    | "regDt"
    | "imgPaths"
  > {
  facilitySq: number;
}

// Main screen row (list / detail / edit).
export interface PeriodicInspectionData extends BasePeriodicInspection {
  regularCheckSq: number;
  facilitySq: number;
  regDt?: string;
}

// Bottom grid row on the registration screen.
export interface PeriodicInspectionHistoryRecord extends BasePeriodicInspection {
  selected: boolean;
  No: number;
  facilitySq: number;
}

// ---- Page props ----
export interface PeriodicInspectionEditPageProps {
  data: PeriodicInspectionData;
  onBack: () => void;
  onUpdate: (updatedData: any) => void;
}

export interface PeriodicInspectionDetailPageProps {
  data: PeriodicInspectionData;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}
