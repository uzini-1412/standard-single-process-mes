/* 부적합(NCR) 관리 */
export interface NonConformanceData {
  ncrSq: number;
  no: string;
  occurType: string;          // 발생분류 (MATERIAL/PROCESS/SHIPMENT/CUSTOMER)
  occurTypeName: string;      // 발생분류 한글 (입고/공정/출하/고객)
  occurDate: string;          // 발생일자
  occurPlace: string;         // 발생처
  itemCode: string;           // 품번
  itemName: string;           // 품명
  lotNo: string;              // Lot.No.
  defectType: string;         // 부적합유형
  badQty: number;             // 불량수량 (정수)
  finderNm: string;           // 발견자/등록자
  actionStatus: string;       // 조치상태 (WAIT/DONE)
  actionStatusName: string;   // 조치상태 한글 (미조치/조치완료)
  actionDate: string;         // 조치일자
  actionContent: string;      // 조치내용
  managerNm: string;          // 조치책임자
}

/* ----- 페이지 컴포넌트 props ----- */
export interface NonConformancePageProps {
  onNavigateToRegister: () => void;
  onNavigateToDetail: (item: NonConformanceData) => void;
}

export interface NonConformanceRegisterPageProps {
  onBack: () => void;
  onRegister: () => void;
}

export interface NonConformanceDetailPageProps {
  selectedItem: NonConformanceData;
  onBack: () => void;
  onEdit: (item: NonConformanceData) => void;
  onDelete: (ncrSq: number) => void;
}

export interface NonConformanceEditPageProps {
  selectedItem: NonConformanceData;
  onBack: () => void;
  onSave: () => void;
}
