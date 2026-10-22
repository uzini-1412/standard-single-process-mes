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
  makerNm: string;
  purpose: string;
  purchaseDate: string;
  purchasePrice: string;
  asCompany: string;
  disposeDate: string;
  regDt: string;
  // 설비정보관리 등록/수정/상세/목록에서는 더 이상 입력·표시하지 않지만,
  // 설비이력관리·정기점검 화면이 여전히 참조하므로 타입에는 남겨둔다.
  processNm?: string;
  spec?: string;
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
