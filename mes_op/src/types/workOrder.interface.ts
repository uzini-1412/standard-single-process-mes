// 작업 목록/시작 화면에서 쓰는 타입 정의

// 작업지시 단건 응답 (백엔드 WorkOrderDto.Res 와 매핑)
export interface WorkOrderResponse {
  workOrderSq: number;
  workOrderDate: string;
  lineSq: number;
  lineName: string;

  itemSq: number;
  itemCode: string;
  itemName: string;
  itemSpec: string;
  itemType: string;

  plcWeight: number;
  width: number;
  length: number;
  targetQty: number;
  prodSpeed: number;
  totalWidth: number;
  totalWeight: number;
  effectiveWidth: number;
  estimatedProductionTime: number;

  priority: string;
  workStatus: string;
  lotNo: string;
  productionLotNo: string;
  recipe: string;
  remark: string;

  workStartTime: string | null;
  workEndTime: string | null;

  regDt: string;

  details: WorkOrderDetailResponse[];
}

// 작업지시 품목 상세 행
export interface WorkOrderDetailResponse {
  woDtlSq: number;
  lotNo: string;
  itemSq: number;
  itemCode: string;
  itemName: string;
  width: number;
  length: number;
  orderQty: number;
}

// 상단 라인/제품 선택 바 props
export interface LineProductPickerProps {
  productCategory?: string;
  lineCategory?: string;
  workOrderDate?: string;
  onProductCategoryChange?: (value: string) => void;
  onLineCategoryChange?: (value: string) => void;
  editable?: boolean;
}

// 작업 할당 목록의 한 행(화면 표시용)
export interface WorkAssignmentRow {
  selected: boolean;
  no: number;

  productType?: string;
  lineType?: string;
  orderNumber?: string;

  parentItemCode?: string;
  parentItemName?: string;
  length?: string;

  childItemCode?: string;
  childItemName?: string;
  width?: string;

  workOrderQty?: string;
  currentStatus?: string;
  expectedProductionTime?: string;
  productionLotNo?: string;
  remarks?: string;

  _originalId?: number;
  _originalData?: WorkOrderResponse;
}
