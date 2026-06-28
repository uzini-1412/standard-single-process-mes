// 작업 마무리(생산 종료) 화면에서 사용하는 타입 정의
import { WorkOrderResponse } from "./workOrder.interface";

export interface ProductionWrapUpProps {
  onBack: () => void;
  onHome: () => void;
  orderNumber: string;
  workOrderData?: WorkOrderResponse | null;
}
