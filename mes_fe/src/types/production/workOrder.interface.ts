/**
 * 작업지시 등록 화면 모델.
 *
 * 헤더(지시 1건)와 하단 상세 품목(여러 LOT)을 분리해 다루며, 공통 식별·치수
 * 필드는 `_shared` 의 조립 블록에서 가져와 중복 선언을 없앤다.
 */
import type { ItemRefView, LineRefView, SheetMetricsText, GridRowMeta } from "./_shared";
import type { CreatePageMode } from "../common/pageMode";

/**
 * 작업지시 헤더 폼 한 건.
 * 품목·라인·시트치수 공통부 위에 지시 고유 속성(상태/LOT/생산 파라미터)을 얹는다.
 */
export interface WorkOrderData extends ItemRefView, LineRefView, SheetMetricsText {
  /** 신규 등록 전에는 비어 있는 클라이언트 식별자. */
  id?: string;
  /** 그리드 표시용 일련번호. */
  No?: string;

  // ── 지시 헤더 ──
  workOrderDate: string;
  workStartDate?: string;
  priority: string;
  workStatus: string;
  lotNo: string;
  recipe: string;
  remark: string;

  // ── 생산 파라미터 (폼 문자열) ──
  targetQty: number;
  manageWeight: string;
  plcWeight: string;
  totalWidth: string;
  totalWeight: string;
  effectiveWidth: string;
  productionSpeed: string;
  estimatedProductionTime: string;

  /** 저장된 지시의 상세 행 개수(목록 표시용). */
  detailCount?: string;
}

/**
 * 작업지시 하단 상세 품목 한 줄.
 * 그리드 선택 메타와 품목 식별 공통부 위에 LOT·치수·지시량을 더한다.
 */
export interface WorkOrderSubItem extends GridRowMeta, ItemRefView {
  width: string;
  length: string;
  effectiveWidth: string;
  lotNo: string;
  targetQty: number;
  /** 품목 검색 모달에서 끌어온 원본 행(매핑 전 보존용). */
  masterData?: any;
}

/** 작업지시 화면이 오가는 표시 모드. */
export type WorkOrderPageMode = CreatePageMode;
