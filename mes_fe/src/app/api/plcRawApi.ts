/** 원소재 투입(PLC) 호출 모듈 — BE /api/material/input (MaterialInputController). [자재관리 > 원소재사용현황]에서 사용. */
import { postJson } from "./request";

export interface PlcRawSearchReq {
  lineCode: string;
  dateFrom: string;
  dateTo: string;
}

export interface PlcRawRes {
  collectedDt: string;
  deviceCode: string;
  lineCode: string;
  feederNo: string;
  value: number;
}

export async function loadPlcRawSamples(req: PlcRawSearchReq): Promise<PlcRawRes[]> {
  try {
    return (await postJson<PlcRawRes[] | null>("/material/input/plc/raw-list", req)) || [];
  } catch (error) {
    console.error("Error fetching PLC raw list:", error);
    throw error;
  }
}

// === 원소재투입현황 (PLC·작업지시·레시피를 매칭해 품목 × 12개월 매트릭스로 집계) ===
export interface UsageStatusReq {
  year: number;
  itemCode?: string;
}

export interface UsageStatusRes {
  itemSq: number;
  itemCode: string;
  itemName: string;
  mon1: number;
  mon2: number;
  mon3: number;
  mon4: number;
  mon5: number;
  mon6: number;
  mon7: number;
  mon8: number;
  mon9: number;
  mon10: number;
  mon11: number;
  mon12: number;
  totalYear: number;
}

export async function loadUsageMatrix(req: UsageStatusReq): Promise<UsageStatusRes[]> {
  try {
    return (await postJson<UsageStatusRes[] | null>("/material/input/status", req)) || [];
  } catch (error) {
    console.error("Error fetching usage status:", error);
    throw error;
  }
}
