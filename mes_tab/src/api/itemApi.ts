import { postData } from './http';

/**
 * 한 LOT을 끝까지 따라간 추적 결과. 입고 → 생산 → 출하검사 → 출하로 이어지는
 * 단계별 LOT 번호와, 그 LOT의 현재 품목/재고 스냅샷을 한 덩어리로 담는다.
 */
export interface LotTraceRes {
  // 대상 LOT과 품목 식별
  lotNo: string;
  itemCode: string;
  itemName: string;
  accountType: string;

  // 재고/규격 스냅샷
  storageLoc: string;
  currentQty: number;
  qtyUnit: string;
  basisWeight: number;
  width: number;
  length: number;
  weight?: number;
  netWeight?: number;
  grossWeight?: number;
  productionDate?: string;

  // 단계별 상태
  inspectStatus: string;
  shipInspectStatus: string;
  progressStatus: string;
  inboundDate: string;

  // 추적 체인을 구성하는 단계별 LOT 번호
  purchaseOrderNo: string;
  purchaseLotNo: string;
  shipmentPlanLotNo: string;
  shipInspectLotNo: string;
  productionLotNo: string;

  // 거래/배송 정보 및 이력 타임라인
  customerName: string;
  destination: string;
  histories: { date: string; type: string; description: string }[];
}

/** LOT 번호 하나로 전체 추적 정보를 조회한다. */
export const fetchLotTrace = (lotNo: string): Promise<LotTraceRes> =>
  postData<LotTraceRes>('/item/lot-trace', { lotNo });
