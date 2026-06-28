// 품목구성(BOM)관리 — 레시피정보관리를 일반화 (STANDARDIZATION.md §6)
// bom.mode=ASSEMBLY 면 quantity/unit/seq, RECIPE 면 ratio/basisWeight/plcMachineNo/materialType 를 사용.

export interface BomSearchParams {
  productItemSq?: number;
}

export interface BomSaveReq {
  bomLineSq?: number;
  productItemSq: number;
  componentItemSq: number;
  // 코어
  quantity?: number;
  unit?: string;
  seq?: number;
  // 배합형(RECIPE) 확장
  ratio?: number;
  basisWeight?: number;
  plcMachineNo?: string;
  materialType?: string;
  remark?: string;
  useYn?: boolean;
}

export interface BomRes {
  bomSq: number;
  bomNo?: string;
  productItemSq: number;
  productCode: string;
  productName: string;
  bomLineSq: number;
  componentItemSq: number;
  materialCode: string;   // 구성품 품번
  materialName: string;   // 구성품 품명
  materialSpec?: string;
  // 코어
  quantity?: number;
  unit?: string;
  seq?: number;
  // 배합형 확장
  ratio?: number;
  basisWeight?: number;
  plcMachineNo?: string;
  materialType?: string;
  remark?: string;
  useYn?: boolean;
}

// ── 화면 뷰모델 (BOM관리 페이지 전용) ──────────────────────────────
// API 타입(BomRes/BomSaveReq/BomSearchParams)은 위에 정의. 아래는 등록/상세 화면 전용 모델.

export type { PageMode } from "../common/pageMode";

// 등록 화면 자재 그리드의 한 행 (선택/순번 포함)
export interface MaterialData {
  selected: boolean;
  no: string;
  materialType: string;
  materialCode: string;
  materialName: string;
  materialSpec: string;
  requiredQty: string;   // BOM 코어: 소요량/수량
  unit: string;          // BOM 코어: 단위 (ASSEMBLY)
  ratio: string;         // 배합형: 비중(%)
  plcMachineNo: string;  // 배합형: PLC 호기
  remark: string;
  bomLineSq?: number;      // = BOM 라인 PK
  materialItemSq?: number; // = 구성품 PK(componentItemSq)
}

// 헤더에 묶인 구성품 한 건 (선택/순번 없음)
export interface BomComponent {
  bomLineSq?: number;
  materialItemSq?: number;
  materialType: string;
  materialCode: string;
  materialName: string;
  materialSpec: string;
  requiredQty: string;
  unit: string;
  ratio: string;
  plcMachineNo: string;
  remark: string;
}

// 제품 1건의 BOM (헤더 + 구성품 목록) — 리스트/상세 뷰모델
export interface BomData {
  bomLineSq?: number;
  bomNo?: string;
  productItemSq?: number;
  no: string;
  productCode: string;
  productName: string;
  accountType: string;
  basisWeight: string;   // 배합형 평량(g/m²)
  components: BomComponent[];
  remark: string;
}

export interface BomFormData {
  accountType: string;
  productName: string;
  weight: string;        // 배합형 평량(g/m²) - 입력용
  materialType: string;
  materialCode: string;
  materialName: string;
  materialSpec: string;
  requiredQty: string;
  unit: string;
  ratio: string;
  plcMachineNo: string;
  remark: string;
}

export interface BomDetailPageProps {
  bomData?: BomData;
  onBack?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export interface BomRegisterPageProps {
  mode?: "create" | "edit";
  initialData?: BomData;
  onBack?: () => void;
  onSave?: () => void;
}
