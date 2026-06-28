// Equipment history management types

// Internal: identity columns shared by the equipment-info lookup and the
// history base type (not exported — derivation helper only).
interface EquipmentIdentity {
  manageNo: string;
  facilityName: string;
  facilityType: string;
  lineNm: string;
  processNm: string;
}

// Top "equipment info" lookup row on the history registration screen.
export interface HistoryEquipmentInfo extends EquipmentIdentity {
  facilitySq: number;
  regDt?: string;
}

// Shared field set across the history views.
export interface BaseEquipmentHistory extends EquipmentIdentity {
  historyNo: string;
  actionType: string;
  occurDate: string;
  occurContent: string;
  actionDate: string;
  actionManager: string;
  actionContent: string;
  actionTime: string;
  actionCost: string;
  remark: string;
}

// Main screen row (list / detail / edit).
export interface EquipmentHistoryData extends BaseEquipmentHistory {
  historySq?: number;
  facilitySq?: number;
  regDt?: string;
}

// Bottom grid row on the registration screen.
export interface EquipmentHistoryRecord extends BaseEquipmentHistory {
  selected: boolean;
  No: number;
  facilitySq: number;
}

// ---- Page props ----
export interface EquipmentHistoryRegisterPageProps {
  onBack: () => void;
  onSave: (data: any) => void;
}

export interface EquipmentHistoryEditPageProps {
  data: EquipmentHistoryData;
  onBack: () => void;
  onSave: (data: any) => void;
}

export interface EquipmentHistoryDetailPageProps {
  data: EquipmentHistoryData;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

// ---- Equipment history card ----
export interface HistoryCardEquipmentInfo {
  facilitySq: number;
  manageNo: string;
  facilityName: string;
  processNm: string;
  purchaseDate: string;
  imgPaths: string;
}

export interface HistoryCardRecord {
  occurDate: string;
  occurContent: string;
  actionContent: string;
  actionCost: string;
  actionManager: string;
  remark: string;
}
