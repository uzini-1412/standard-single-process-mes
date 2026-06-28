import { WorkOrderResponse } from "./workOrder.interface";

// 작업 진행 화면(생산 실행 뷰)의 props
export interface OperationRunViewProps {
  onBack: () => void;
  orderNumber?: string;
  onProgressStatusClick?: () => void;
  workOrderData?: WorkOrderResponse | null;
  onWorkOrderUpdate?: (updatedData: Partial<WorkOrderResponse> & { workOrderSq: number }) => void;
  allWorkOrders?: WorkOrderResponse[];
}

// 진행 현황 보드 화면의 props
export interface ProductionProgressBoardProps {
  orderNumber: string;
  onBack: () => void;
}

// 진행 현황 보드의 행 데이터
export interface WorkProgressRow {
  no: number;
  productType?: string;
  lineType?: string;
  productionNumber?: string;
  productionLotNo?: string;
  partNumber: string;
  partName: string;
  spec?: string;
  orderQty: string;
  workStatus: string;
  remarks?: string;
}
