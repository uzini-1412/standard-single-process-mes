/**
 * 생산소요량 산출 화면 모델.
 *
 * 상단(고객수주 합산) → 하단(품목별 소요량 산출)으로 이어지는 2단 구조.
 * 품목 식별·시트치수 공통부는 `_shared` 에서 조립한다.
 */
import type { OrderDetailRes } from "@/app/api/orderApi";
import type { ItemRefView, SheetMetricsText } from "./_shared";

/**
 * 상단 고객수주 테이블 행 (수주번호 단위 합산).
 * 주의: orderQty 는 매출 SalesOrder 합산값(m²/m)이라 문자열로 유지한다.
 */
export interface ProductionCustomerOrder extends ItemRefView {
  selected?: boolean;
  orderSq?: number;
  orderDate: string;
  orderNo: string;
  customerCode: string;
  customerName: string;
  orderQty: string;
  orderQtyEa: string;
  /** 하단 소요량 산출에 쓰는 원본 상세 묶음. */
  details?: OrderDetailRes[];
}

/** 하단 산출 단위가 되는 고객수주 상세 한 건 (품목·치수 + 수주량). */
export interface ProductionCustomerOrderDetail extends ItemRefView, SheetMetricsText {
  orderDtlSq?: number;
  orderDate: string;
  orderNo: string;
  customerCode: string;
  customerName: string;
  orderQty: number;
}

/**
 * 소요량 산출 결과 행.
 * 수주 상세 위에 재고 대비 과부족과 생산 소요/생산성 계산값을 더한다.
 */
export interface ProductionRequirement extends ProductionCustomerOrderDetail {
  reqSq?: number;
  currentStock: number;
  safetyStock: number;
  shortageQty: number;
  deliveryPlannedQty: number;
  productionReqQty: number;
  productionSpeed: string;
  productionPerHourM2: string;
  estimatedProductionTime: string;
  regDt?: string;
  planQty?: number;
}
