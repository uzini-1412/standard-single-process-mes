/** 계측기 도메인 API 클라이언트 — 백엔드 /api/instrument(+/history) 엔드포인트 연동. 계측기관리 관련 3개 화면에서 함께 사용. */
import { postJson, postVoid } from './request';
import { InstrumentData } from '@/types/measuring-instrument/instrumentManager.interface';

export interface InstrumentSearchParams {
  instrumentType?: string;
  manageNo?: string;
  instrumentNm?: string;
  instrumentNo?: string;
}

export interface InstrumentSaveData {
  instrumentSq?: number;
  manageNo: string;
  instrumentType?: string;
  instrumentNm: string;
  modelNm?: string;
  instrumentNo?: string;
  spec?: string;
  makerNm?: string;
  purchaseDate?: string;
  purchasePrice?: string;
  calibCycle?: string;
  calibAgency?: string;
  lastCalibDate?: string;
  nextCalibDate?: string;
  remark?: string;
  imgPaths?: string;
  writerId?: string;
}

export function fetchMeasuringInstruments(params: InstrumentSearchParams = {}): Promise<InstrumentData[]> {
  return postJson<InstrumentData[]>('/instrument/list', params);
}

export function saveMeasuringInstruments(items: InstrumentSaveData[]): Promise<void> {
  return postVoid('/instrument/save', items);
}

export function deleteMeasuringInstruments(instrumentIds: number[]): Promise<void> {
  return postVoid('/instrument/delete', { instrumentIds });
}

// === 계측기 이력 관련 API ===
import { InstrumentHistoryData } from '@/types/measuring-instrument/history.interface';

export interface HistorySearchParams {
  instrumentSq?: number;
  keyword?: string;
  manageNo?: string;
  instrumentNm?: string;
  instrumentNo?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface HistorySaveData {
  historySq?: number;
  instrumentSq: number;
  historyType?: string;
  occurDate?: string;
  agencyNm?: string;
  actionContent?: string;
  actionCost?: string;
  workerNm?: string;
  reportFilePath?: string;
  reportFileNm?: string;
  remark?: string;
  writerId?: string;
}

export function fetchInstrumentHistories(params: HistorySearchParams = {}): Promise<InstrumentHistoryData[]> {
  return postJson<InstrumentHistoryData[]>('/instrument/history/list', params);
}

export function saveInstrumentHistories(items: HistorySaveData[]): Promise<void> {
  return postVoid('/instrument/history/save', items);
}

export function deleteInstrumentHistories(historyIds: number[]): Promise<void> {
  return postVoid('/instrument/history/delete', { historyIds });
}

// === 계측기 이력카드 조회 API ===
export interface InstrumentCardRes {
  instrumentSq: number;
  manageNo: string;
  instrumentNm: string;
  instrumentNo: string;
  spec: string;
  purchaseDate: string;
  imgPaths: string | null;
  historyList: InstrumentHistoryData[];
}

export function fetchInstrumentHistoryCards(params: HistorySearchParams = {}): Promise<InstrumentCardRes[]> {
  return postJson<InstrumentCardRes[]>('/instrument/history/card', params);
}
