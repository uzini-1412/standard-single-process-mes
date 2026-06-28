/**
 * 작업지시 API 클라이언트 — BE `/api/production/work-order` (WorkOrderController).
 * [생산관리 > 작업지시등록] 및 원소재사용현황에서 공용으로 호출한다.
 *
 * 요청/응답 타입은 백엔드 계약과 1:1 이라 필드명을 유지하고, 공통 식별 블록은
 * `_shared` 의 wire base 로 조립한다.
 */
import { postJson, postVoid, emptyPage, type PageEnvelope } from "./request";
import type { ItemRefWire, LineRefWire } from "@/types/production/_shared";
import { WorkOrderData, WorkOrderSubItem } from "@/types/production/workOrder.interface";

/** 목록/페이징 공통 검색 조건. */
export interface WorkOrderSearchParams {
  dateFrom?: string; // 지시일 시작
  dateTo?: string; // 지시일 종료
  lineSq?: number; // 라인 PK
  lineName?: string; // 라인명(정확일치)
  itemCode?: string; // 품번(부분일치)
  itemName?: string; // 품명(부분일치)
}

/** 작업지시 저장(신규/수정) 본문. */
export interface WorkOrderSaveReq {
  workOrderSq?: number; // 신규는 미지정
  workOrderDate: string;
  lineSq?: number;
  lineName: string;
  priority: string;
  itemSq?: number;
  itemCode?: string;
  recipeSq?: number;
  targetQty: number;
  prodSpeed: number;
  basisWeight: number;
  manageWeight: number;
  plcWeight: number;
  totalWidth: number;
  totalWeight: number;
  effectiveWidth?: number;
  estimatedProductionTime?: number;
  lotNo?: string;
  recipe?: string;
  remark?: string;
  writerId?: string;
  details?: WorkOrderDetailSaveReq[];
}

/** 저장 본문에 실리는 상세 한 줄. */
export interface WorkOrderDetailSaveReq {
  woDtlSq?: number;
  itemSq?: number;
  itemCode?: string;
  lotNo?: string;
  orderQty: number;
  width: number;
  length: number;
  effectiveWidth?: number;
  remark?: string;
}

/** 작업지시 헤더 응답 1건 + 상세 목록. */
export interface WorkOrderRes extends ItemRefWire, LineRefWire {
  workOrderSq: number; // 지시 PK
  workOrderDate: string; // 지시일
  basisWeight: number; // 기준 평량
  manageWeight: number; // 관리 평량
  plcWeight: number; // PLC 중량
  width: number; // 폭
  length: number; // 길이
  targetQty: number; // 지시량
  prodSpeed: number; // 생산 속도
  totalWidth: number; // 전폭
  totalWeight: number; // 전중량
  effectiveWidth: number; // 유효폭
  estimatedProductionTime: number; // 예상 소요(분)
  priority: string; // 우선순위
  workStatus: string; // 진행 상태
  remark: string; // 비고
  lotNo: string; // 지시 LOT
  recipe: string; // 레시피
  regDt: string; // 등록일시
  workStartTime: string | null; // 가동 시작
  workEndTime: string | null; // 가동 종료
  details: WorkOrderDetailRes[]; // 상세
}

/** 응답에 포함되는 상세 한 줄. */
export interface WorkOrderDetailRes extends ItemRefWire {
  woDtlSq: number;
  lotNo: string;
  width: number;
  length: number;
  effectiveWidth?: number;
  orderQty: number;
}

/** 라인+날짜로 지시·시작·종료일 라이프사이클을 매칭하는 조회(원소재투입분석상세용). */
export interface WorkOrderLineDateSearchParams {
  lineName: string;
  date: string; // YYYY-MM-DD
}

/** 서버 페이징 응답 봉투. */
export type PageData<T> = PageEnvelope<T>;

const BASE = "/production/work-order";

/** 작업지시 목록 조회 (전체 반환). */
export async function fetchWorkOrderList(params: WorkOrderSearchParams = {}): Promise<WorkOrderRes[]> {
  return (await postJson<WorkOrderRes[] | null>(`${BASE}/list`, params)) || [];
}

/** 라인+날짜 기준 작업지시 조회. */
export async function fetchWorkOrderListByLineAndDate(
  params: WorkOrderLineDateSearchParams
): Promise<WorkOrderRes[]> {
  return (await postJson<WorkOrderRes[] | null>(`${BASE}/list-by-date`, params)) || [];
}

/** 작업지시 목록 페이징 조회 (대용량 대응, 권장). */
export async function fetchWorkOrderListPaged(
  params: WorkOrderSearchParams & { page?: number; size?: number } = {}
): Promise<PageData<WorkOrderRes>> {
  return (await postJson<PageData<WorkOrderRes> | null>(`${BASE}/list-paged`, params)) ?? emptyPage<WorkOrderRes>();
}

/** 작업지시 등록. */
export function createWorkOrder(data: WorkOrderSaveReq): Promise<void> {
  return postVoid(`${BASE}/save`, data);
}

/** 작업지시 수정 (PK 를 본문에 합쳐 동일 save 엔드포인트로 전송). */
export function updateWorkOrder(workOrderSq: string | number, data: WorkOrderSaveReq): Promise<void> {
  return postVoid(`${BASE}/save`, { ...data, workOrderSq: Number(workOrderSq) });
}

/** 작업지시 삭제 (단건 키를 배열로 감싸 전송). */
export function deleteWorkOrder(workOrderSq: string | number): Promise<void> {
  return postVoid(`${BASE}/delete`, { workOrderIds: [Number(workOrderSq)] });
}
