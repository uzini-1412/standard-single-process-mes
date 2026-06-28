/** 제품재고 API 클라이언트 — BE /api/product-stock (ProductStockController). [출하관리 > 제품재고현황/제품재고분석]. */
import { postJson, getJson, emptyPage, type PageEnvelope } from './request';

// 제품재고 현황 목록 조회 (ProductStock 기반)
export async function loadProductStockList(params: {
  itemCode?: string;
  itemName?: string;
  itemType?: string;
  baseDate?: string;
  dateFrom?: string;
  dateTo?: string;
} = {}) {
  return (await postJson<any[] | null>('/product-stock/list', params)) ?? [];
}

// 제품재고 현황 페이징 조회
export interface ProductStockSearchParams {
  [key: string]: unknown;
  itemCode?: string;
  itemName?: string;
  itemType?: string;
  baseDate?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  size?: number;
}

export type ProductStockPageRes<T> = PageEnvelope<T>;

export async function loadProductStockListPaged(params: ProductStockSearchParams = {}): Promise<ProductStockPageRes<any>> {
  return (await postJson<ProductStockPageRes<any> | null>('/product-stock/list-paged', params)) ?? emptyPage<any>();
}

/** 제품재고현황(14컬럼)을 엑셀로 내려받는다. 백엔드는 SXSSF 스트리밍으로 응답한다. */
export async function downloadProductStockStatusExcel(params: ProductStockSearchParams = {}): Promise<void> {
  const { downloadExcel, buildExcelFileName } = await import('../utils/excelDownload');
  await downloadExcel('/product-stock/export-status', params, buildExcelFileName("제품재고현황"));
}

/** 제품재고분석(18컬럼)을 엑셀로 내려받는다. 백엔드는 SXSSF 스트리밍으로 응답한다. */
export async function downloadProductStockAnalysisExcel(params: ProductStockSearchParams = {}): Promise<void> {
  const { downloadExcel, buildExcelFileName } = await import('../utils/excelDownload');
  await downloadExcel('/product-stock/export-analysis', params, buildExcelFileName("제품재고분석"));
}

// 품목별 현재고 요약(최경량). DB에서 GROUP BY로 한 번에 받아 프론트에서 Map으로 캐시한다.
export interface CurrentStockRes {
  itemSq: number;
  itemCode: string;
  currentStockM: number | string | null;
  currentStockEa: number | string | null;
}
export async function loadProductCurrentStockMap(): Promise<CurrentStockRes[]> {
  return (await getJson<CurrentStockRes[] | null>('/product-stock/current-map')) ?? [];
}

// 입출고이력 조회 (제품재고현황 하단 테이블)
// ProductStockHistory 기반으로 시간순 누적재고량을 포함하며, 폭이 다른 LOT은 분리해서 집계한다.
export interface ProductStockHistoryRes {
  date: string;          // 입출고일자 (yyyy-MM-dd)
  changeType: string;    // INBOUND | SHIP | ADJUST
  changeQtyM: number | string;
  cumulativeQtyM: number | string;
  lotNo: string | null;
  storageLoc: string | null;
}
export async function loadProductStockHistory(params: {
  itemSq: number;
  width?: number | string | null;
}): Promise<ProductStockHistoryRes[]> {
  return (await postJson<ProductStockHistoryRes[] | null>('/product-stock/history', params)) ?? [];
}

export async function loadProductStockHistoryPaged(params: {
  itemSq: number;
  width?: number | string | null;
  page?: number;
  size?: number;
}): Promise<ProductStockPageRes<ProductStockHistoryRes>> {
  return (await postJson<ProductStockPageRes<ProductStockHistoryRes> | null>('/product-stock/history-paged', params)) ?? emptyPage<ProductStockHistoryRes>();
}

// 품목별 가용 LOT 조회 (출하지시 폼 드롭다운용)
// 잔량이 0보다 큰 ProductStock과 해당 LOT의 생산일보 측정 롤중량(rollWeight)을 함께 반환한다.
export interface AvailableLotRes {
  lotNo: string;
  currentQtyM: number | string | null;
  currentQtyEa: number | string | null;
  storageLoc: string | null;
  lastInDate: string | null;
  rollWeight: number | null;
  // 미출하(WAIT) 상태의 다른 출하지시가 이미 예약해 둔 수량.
  reservedQtyM?: number | string | null;
  // 가용수량 = currentQtyM - reservedQtyM (음수가 되면 0으로 처리)
  availableQtyM?: number | string | null;
}
export async function loadAvailableProductLots(params: {
  itemSq?: number;
  itemCode?: string;
}): Promise<AvailableLotRes[]> {
  return (await getJson<AvailableLotRes[] | null>('/product-stock/available-lots', { params })) ?? [];
}
