// Equipment periodic-inspection types
import { EquipmentRecord } from "./info.interface";

// Shared field set for every periodic-inspection view.
export interface BasePeriodicInspection {
  manageNo: string;
  facilityName: string;
  imgPaths?: string | null;
  checkType: string;
  checkerNm: string;
  planDate: string;
  planContent: string;
  execDate: string;
  execContent: string;
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
export interface PeriodicInspectionRegisterPageProps {
  onBack: () => void;
  onSave: (data: any) => void;
}

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
