/** 거래명세서 API 클라이언트 — BE /api/shipment/trade-statement (TradeStatementController). [출하관리 > 출하지시관리]. */
import { postJson, postVoid } from './request';

export interface TradeStatementItem {
  rowNo: number;
  productName: string;
  spec: string;
  qty: number | null;
  unitPrice: number | null;
  supplyPrice: number | null;
  tax: number | null;
}

export interface TradeStatementData {
  statementSq?: number;
  shipOrderSq: number;
  statementDate: string;
  supplierRegNo: string;
  supplierCompany: string;
  supplierCeo: string;
  supplierAddress: string;
  supplierBizType: string;
  supplierBizItem: string;
  buyerRegNo: string;
  buyerCompany: string;
  buyerCeo: string;
  buyerAddress: string;
  buyerBizType: string;
  buyerBizItem: string;
  prevBalance: string;
  shipAmount: string;
  depositAmount: string;
  currBalance: string;
  receiverName: string;
  remark: string;
  sourceType?: string;
  sourceKey?: string;
  items: TradeStatementItem[];
}

export function fetchTradeStatement(shipOrderSq: number): Promise<TradeStatementData | null> {
  return postJson<TradeStatementData | null>('/shipment/trade-statement/get', { shipOrderSq });
}

export function fetchTradeStatementBySource(sourceType: string, sourceKey: string): Promise<TradeStatementData | null> {
  return postJson<TradeStatementData | null>('/shipment/trade-statement/get', { sourceType, sourceKey });
}

export function saveTradeStatement(data: TradeStatementData): Promise<void> {
  return postVoid('/shipment/trade-statement/save', data);
}

export interface TradeStatementInitItem {
  productName: string;
  spec: string;
  qty: number | null;
  unitPrice: number | null;
  supplyPrice: number | null;
  tax: number | null;
}

export interface TradeStatementInitData {
  statementDate: string;
  buyerRegNo: string;
  buyerCompany: string;
  buyerCeo: string;
  buyerAddress: string;
  items: TradeStatementInitItem[];
}

export function fetchTradeStatementInitData(shipOrderSq: number): Promise<TradeStatementInitData | null> {
  return postJson<TradeStatementInitData | null>('/shipment/trade-statement/init-data', { shipOrderSq });
}
