/**
 * 생산계획 API 클라이언트 — BE `/api/production/plan` (ProductionController).
 * [생산관리 > 생산계획].
 *
 * 서버 응답(PlanRes)과 화면 모델(ProductionPlanData) 사이는 mapToClient/mapToServer
 * 가 변환한다. wire 타입의 공통 식별 블록은 `_shared` 에서 조립한다.
 */
import { postJson, postVoid } from "./request";
import type { ItemRefWire, LineRefWire } from "@/types/production/_shared";
import { ProductionPlanData } from "@/types/production/plan.interface";

const BASE = "/production/plan";

/** 생산계획 목록 검색 조건. */
export interface PlanSearchParams {
  dateFrom?: string; // 계획일 시작
  dateTo?: string; // 계획일 종료
  lineSq?: number; // 라인 PK
}

/** 생산계획 저장 본문(서버는 배열로 수신). */
export interface PlanSaveReq {
  planSq?: number;
  planDate: string;
  lineName: string;
  itemSq?: number;
  itemCode?: string;
  planQty: number;
  weight?: number;
  productionSpeed?: number;
  estimatedProductionTime?: number;
  currentStock?: number;
  startTime?: string;
  endTime?: string;
  remark?: string;
  writerId?: string;
}

/** 생산계획 응답 1건. */
export interface PlanRes extends ItemRefWire, LineRefWire {
  planSq: number; // 계획 PK
  planDate: string; // 계획일
  basisWeight: number; // 기준 평량
  width: number; // 폭
  length: number; // 길이
  planQty: number; // 계획 수량
  weight: number; // 중량
  productionSpeed: number; // 생산 속도
  estimatedProductionTime: number; // 예상 소요(분)
  currentStock: number; // 현재고
  startTime: string | number[] | null; // 가동 시작(HH:mm:ss 또는 [h,m,s])
  endTime: string | number[] | null; // 가동 종료
  planStatus: string; // 계획 상태
  remark: string; // 비고
  regDt: string; // 등록일시
  orderDate: string; // 연계 수주일
}

/** 생산계획 목록 조회 → 화면 모델로 변환. */
export async function fetchProductionPlans(params: PlanSearchParams = {}): Promise<ProductionPlanData[]> {
  const r = await postJson<PlanRes[] | null>(`${BASE}/list`, params);
  return (r || []).map(mapToClient);
}

/** 생산계획 단건 조회 (목록에서 PK 매칭). */
export async function fetchProductionPlanDetail(planSq: string | number): Promise<ProductionPlanData> {
  const r = await postJson<PlanRes[] | null>(`${BASE}/list`, {});
  const plan = (r || []).find((p) => String(p.planSq) === String(planSq));
  if (!plan) throw new Error("Plan not found");
  return mapToClient(plan);
}

/** 생산계획 등록 (서버는 배열 본문을 받는다). */
export function registerProductionPlan(data: ProductionPlanData): Promise<void> {
  return postVoid(`${BASE}/save`, [mapToServer(data)]);
}

/** 생산계획 수정 (PK 를 합쳐 동일 save 엔드포인트로 전송). */
export function modifyProductionPlan(planSq: string | number, data: ProductionPlanData): Promise<void> {
  return postVoid(`${BASE}/save`, [{ ...mapToServer(data), planSq: Number(planSq) }]);
}

/** 생산계획 삭제 (단건 키를 배열로 감싸 전송). */
export function removeProductionPlan(planSq: string | number): Promise<void> {
  return postVoid(`${BASE}/delete`, { planIds: [Number(planSq)] });
}

/** 서버 응답 → 화면 폼 모델. 숫자/시간은 폼이 다루기 쉬운 문자열로 정규화한다. */
function mapToClient(data: PlanRes): ProductionPlanData {
  return {
    planSq: data.planSq,
    itemSq: data.itemSq,
    lineSq: data.lineSq,
    lineName: data.lineName || "",
    planDate: data.planDate || "",
    itemCode: data.itemCode || "",
    itemName: data.itemName || "",
    basisWeight: String(data.basisWeight ?? ""),
    width: String(data.width ?? ""),
    length: String(data.length ?? ""),
    currentStock: data.currentStock ?? 0,
    planQty: data.planQty ?? 0,
    weight: String(data.weight ?? ""),
    manageWeight: String(data.weight ?? ""),
    productionSpeed: String(data.productionSpeed ?? ""),
    estimatedProductionTime: String(data.estimatedProductionTime ?? ""),
    startTime: toHHmm(data.startTime),
    endTime: toHHmm(data.endTime),
    remark: data.remark || "",
    regDt: data.regDt || "",
    orderDate: data.orderDate || "",
  };
}

/** 화면 폼 모델 → 저장 본문. 문자열 수치를 숫자로 환산하고 시간은 HH:mm:ss 로 맞춘다. */
function mapToServer(data: ProductionPlanData): PlanSaveReq {
  const asTime = (v?: string) => (v ? `${v}:00`.slice(0, 8) : undefined);
  return {
    planSq: data.planSq,
    planDate: data.planDate,
    lineName: data.lineName,
    itemSq: data.itemSq,
    itemCode: data.itemCode,
    planQty: Number(data.planQty) || 0,
    weight: parseFloat(data.weight || data.manageWeight) || 0,
    productionSpeed: parseFloat(data.productionSpeed) || 0,
    estimatedProductionTime: parseFloat(data.estimatedProductionTime) || 0,
    currentStock: Number(data.currentStock) || 0,
    startTime: asTime(data.startTime),
    endTime: asTime(data.endTime),
    remark: data.remark,
  };
}

/**
 * Jackson LocalTime 직렬화를 "HH:mm" 으로 정규화.
 * 서버는 "HH:mm:ss" 문자열 또는 [h, m, s] 배열 형태로 내려줄 수 있다.
 */
function toHHmm(val: string | number[] | null | undefined): string {
  if (val == null) return "";
  if (Array.isArray(val)) {
    const [h = 0, m = 0] = val;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  const str = String(val);
  return /^\d{2}:\d{2}/.test(str) ? str.slice(0, 5) : "";
}
