import { getData, postData } from './http';
import type { ShipmentResultSaveReq } from '../types';

/**
 * 출하 대기 제품 한 줄(태블릿 전용). "출하검사 합격 + 출하LOT 존재 + 미출하 + 활성 품목"
 * 조건을 서버가 한 번에 적용해 가벼운 형태로 내려준다.
 */
export interface TabletShipPendingRes {
  shipDtlSq: number;
  itemSq: number;
  customerSq: number;
  itemCode: string;
  itemName: string;
  basisWeight: number | null;
  width: number | null;
  length: number | null;
  planQty: number | null;
  customerName: string;
  destination: string;
  shipPlanLotNo: string;
  expectedShipDate: string | null;
  remark: string;
}

/** 스캔으로 조회한 완제품 LOT의 재고/품목 정보. */
export interface ScanLotRes {
  stockSq: number;
  itemSq: number;
  itemCode: string;
  itemName: string;
  lotNo: string;
  currentQtyM: number;
  currentQtyEa: number;
  basisWeight: number | null;
  width: number | null;
  length: number | null;
  storageLoc: string;
}

/** 출하 대기 목록을 조회한다. 빈 응답은 빈 배열로 정규화. */
export const fetchTabletShipPending = async (): Promise<TabletShipPendingRes[]> =>
  (await postData<TabletShipPendingRes[]>('/quality/shipment/tablet-pending')) ?? [];

/** 출하실적 저장. 단건이 와도 배열로 감싸 전송한다. */
export const saveShipmentResult = async (data: ShipmentResultSaveReq | ShipmentResultSaveReq[]): Promise<void> => {
  await postData<void>('/shipment/result/save', Array.isArray(data) ? data : [data]);
};

/** 기간 조건으로 출하실적 목록을 조회한다. */
export const fetchShipmentResultList = (filter: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<any[]> => postData<any[]>('/shipment/result/list', filter);

/** 바코드로 스캔한 LOT의 완제품 정보를 조회한다. */
export const scanShipmentLot = (lotNo: string): Promise<ScanLotRes> =>
  getData<ScanLotRes>('/shipment/result/scan', { lotNo });
