/** 출하보고서 API 클라이언트 — BE /api/shipment/report (ShipmentReportController). [출하관리 > 출하지시관리] 출하증 출력. */
import { postJson, postVoid } from './request';

export interface ShipmentReportItem {
  itemSq?: number;
  rowNo: number;
  rollNo: string;
  width: number | null;
  length: number | null;
  rollWeight: number | null;
  rollBasis: number | null;
  weightLeft: number | null;
  weightCenter: number | null;
  weightRight: number | null;
}

export interface ShipmentReportData {
  shipReportSq?: number;
  shipOrderSq: number;
  reportDateFrom: string;
  reportDateTo: string;
  title: string;
  workType: string;
  color: string;
  headerLabel1: string;
  headerLabel2: string;
  headerLabel3: string;
  itemCode: string;
  itemName: string;
  sourceType?: string;
  sourceKey?: string;
  items: ShipmentReportItem[];
}

export interface ShipmentReportInitItem {
  rowNo: number;
  rollNo: string;
  width: number | null;
  length: number | null;
  rollWeight: number | null;
  rollBasis: number | null;
}

export interface ShipmentReportInitData {
  reportDateFrom: string;
  reportDateTo: string;
  title: string;
  itemCode: string;
  itemName: string;
  items: ShipmentReportInitItem[];
}

export function loadShipmentReportByOrder(shipOrderSq: number): Promise<ShipmentReportData | null> {
  return postJson<ShipmentReportData | null>('/shipment/report/get', { shipOrderSq });
}

export function loadShipmentReportByResult(shipResultSq: number): Promise<ShipmentReportData | null> {
  return postJson<ShipmentReportData | null>('/shipment/report/get', { shipResultSq });
}

export function saveShipmentReport(data: ShipmentReportData): Promise<void> {
  return postVoid('/shipment/report/save', data);
}

export function loadShipmentReportInitByOrder(shipOrderSq: number): Promise<ShipmentReportInitData | null> {
  return postJson<ShipmentReportInitData | null>('/shipment/report/init-data', { shipOrderSq });
}

export function loadShipmentReportInitByResult(shipResultSq: number): Promise<ShipmentReportInitData | null> {
  return postJson<ShipmentReportInitData | null>('/shipment/report/init-data', { shipResultSq });
}
