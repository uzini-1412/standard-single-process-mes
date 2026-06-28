export interface EquipmentInfoPageProps {
  onNavigateToRegister?: () => void;
  onNavigateToDetail?: (id: string) => void;
}

export interface EquipmentInfoRegisterPageProps {
  onBack: () => void;
  onRegister: (data: any) => void;
}

export interface EquipmentInfoEditPageProps {
  id: string;
  onBack: () => void;
  onUpdate: (data: any) => void;
}

export interface EquipmentInfoDetailPageProps {
  id: string;
  onBack: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export interface EquipmentRecord {
  selected: boolean;
  No: number;
  manageNo: string;
  facilityName: string;
  facilityType: string;
  lineNm: string;
  processNm: string;
  makerNm: string;
  spec: string;
  purpose: string;
  purchaseDate: string;
  purchasePrice: string;
  asCompany: string;
  disposeDate: string;
  regDt: string;
  attachFile?: File | null;
  attachFileNm?: string;
  attachFileContent?: string;
  imgPaths?: string | null;
}

// Master row used by the equipment detail/edit screens; derived from the
// grid record but keyed by facilitySq and without grid-only flags.
export interface EquipmentData
  extends Omit<
    EquipmentRecord,
    "selected" | "No" | "attachFile" | "imgPaths"
  > {
  facilitySq: number;
  imgPaths?: string;
}
