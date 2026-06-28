/** 제품위치 API 클라이언트 — BE /api/product-stock/location (ProductStockController). [출하관리 > 제품창고입고현황]. */
import { postJson } from './request';

// 제품창고입고현황: 품목별 재고 합계와 품목 규격 기반 창고구분/보관위치를 함께 조회한다 (경량 endpoint).
export async function loadProductLocationList(itemCode?: string, itemName?: string) {
  return (await postJson<any[] | null>('/product-stock/location-list', {
    itemCode: itemCode || undefined,
    itemName: itemName || undefined,
  })) ?? [];
}
