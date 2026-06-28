import { postJson, getJson, postVoid } from './request';

export interface UnitPriceSaveReq {
  unitPriceSq?: number;
  itemSq?: number;
  customerSq?: number;
  width?: number | null;
  length?: number | null;
  priceType: string;
  price: number;
  priceUnit?: string; // m2/ea/kg
  startDate: string;
  remark?: string;
  useYn?: boolean;
}

export function fetchUnitPriceList(params: { itemSq?: number; customerSq?: number; priceType?: string; baseDate?: string } = {}) {
  return postJson<any[]>('/unit-price/list', params);
}

// 활성 단가 목록 - (품목+거래처+구분+폭) 조합별 적용일자 ≤ 오늘 중 최신 1건
export function fetchUnitPriceActiveList(params: { itemSq?: number; customerSq?: number; priceType?: string } = {}) {
  return postJson<any[]>('/unit-price/active-list', params);
}

export interface SalableItemRes {
  unitPriceSq: number;
  itemSq: number;
  itemCode: string;
  itemName: string;
  customerSq: number;
  customerName: string;
  width: number | null;
  basisWeight: number | null;
  length: number | null;
  weight: number | null;
  price: string;
  priceUnit: string; // m2/ea/kg
}

// 거래처별 판매가능 품목 조회 (단가 등록되고 유효한 품목만)
// priceUnits 미지정 시 백엔드 기본: SALE→[m2], BUY→[ea,kg]
export function fetchSalableItemsByCustomer(customerSq: number, priceType: string = 'SALE', priceUnits?: string[]) {
  return getJson<SalableItemRes[]>('/unit-price/salable-items', {
    params: { customerSq, priceType, priceUnits },
    paramsSerializer: { indexes: null },
  });
}

export function saveUnitPriceList(data: UnitPriceSaveReq[]) {
  return postVoid('/unit-price/save', data);
}

export function deleteUnitPriceList(unitPriceIds: number[]) {
  return postVoid('/unit-price/delete', { unitPriceIds });
}

// 하위 호환 — 주문/자재 모듈에서 사용 중
// (품목+거래처+구분+폭) 조합별 적용일자 ≤ 오늘 중 최신 단가만 조회
export async function fetchUnitPriceStandardList() {
  return await fetchUnitPriceActiveList();
}
export async function fetchUnitPriceStandardById(_id: string): Promise<any> { return null; }
export async function createUnitPriceStandard(_data: any): Promise<any> { return null; }
export async function updateUnitPriceStandard(_id: string, _data: any): Promise<any> { return null; }
export async function deleteUnitPriceStandard(_id: string): Promise<any> { return null; }
