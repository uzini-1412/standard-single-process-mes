// Spare-parts inventory types

export interface SparePartsRegisterPageProps {
  onBack: () => void;
  onSave: (data: any) => void;
}

export interface SparePartsDetailPageProps {
  data: SparePartsData;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export interface SparePartsEditPageProps {
  data: SparePartsData;
  onBack: () => void;
  onUpdate: (updatedData: any) => void;
}

export interface BaseSparePart {
  partNo: string;
  partNm: string;
  spec: string;
  supplierNm: string;
  purchaseDate: string;
  purchasePrice: string;
  safetyStock: string;
  currentStock: string;
  storageLoc: string;
  useFacility: string;
  remark: string;
  imgPaths?: string | null;
}

// Persisted master row (carries its DB sequence + registration date).
export interface SparePartsData extends BaseSparePart {
  sparePartSq: number;
  regDt?: string;
}

// Editable grid row on the registration screen.
export interface SparePartsHistoryRecord extends BaseSparePart {
  selected: boolean;
  No: number;
}
