/** 작업지시 등록/수정 폼에서 쓰는 순수 계산·검증·페이로드 빌더 모음. */
import type { WorkOrderData, WorkOrderSubItem } from "@/types/production/workOrder.interface";
import type { WorkOrderSaveReq, WorkOrderDetailSaveReq } from "../../../api/workOrderApi";

// 작업상태 기본값(작업대기) — 신규/그리드 초기화 시 공통 사용
export const DEFAULT_WORK_STATUS = "작업대기";

// Lot-No 접두부 생성: "{라인}-YYYYMM-" 형태. 라인 미지정 시 P1 기본.
export function buildLotPrefix(line?: string): string {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  return `${line || "P1"}-${yearMonth}-`;
}

// prefix로 시작하는 lotNo 문자열들에서 가장 큰 일련번호를 추출
export function maxSerialOf(lotNos: string[], prefix: string): number {
  let maxSerial = 0;
  for (const lotNo of lotNos) {
    const serial = parseInt(lotNo.substring(prefix.length)) || 0;
    if (serial > maxSerial) maxSerial = serial;
  }
  return maxSerial;
}

// 작업지시 응답 배열에서 마스터/상세 lotNo 중 prefix에 해당하는 것만 모두 수집
export function collectLotNos(orders: any[], prefix: string): string[] {
  const collected: string[] = [];
  orders.forEach((order: any) => {
    if (order.lotNo && order.lotNo.startsWith(prefix)) {
      collected.push(order.lotNo);
    }
    order.details?.forEach((detail: any) => {
      if (detail.lotNo && detail.lotNo.startsWith(prefix)) {
        collected.push(detail.lotNo);
      }
    });
  });
  return collected;
}

// 일련번호(serial)를 prefix와 합쳐 2자리 zero-pad lotNo 문자열로 조립
export function composeLotNo(prefix: string, serial: number): string {
  return `${prefix}${String(serial).padStart(2, "0")}`;
}

// 비어 있는 마스터 폼 객체 생성. seedLotNo가 있으면 lotNo만 미리 채움.
export function makeBlankForm(seedLotNo = ""): WorkOrderData {
  return {
    workOrderDate: "",
    priority: "",
    itemCode: "",
    itemName: "",
    basisWeight: "",
    width: "",
    length: "",
    totalWidth: "",
    effectiveWidth: "",
    targetQty: 0,
    manageWeight: "",
    plcWeight: "",
    totalWeight: "",
    recipe: "",
    lineName: "",
    productionSpeed: "",
    estimatedProductionTime: "",
    lotNo: seedLotNo,
    remark: "",
    workStatus: DEFAULT_WORK_STATUS,
  };
}

// initialData(Partial) → 폼 초기 상태(WorkOrderData)로 정규화 (undefined는 빈 문자열/0으로 보정)
export function normalizeInitialForm(initial?: Partial<WorkOrderData>): WorkOrderData {
  return {
    workOrderDate: initial?.workOrderDate || "",
    priority: initial?.priority || "",
    itemCode: initial?.itemCode || "",
    itemName: initial?.itemName || "",
    basisWeight: initial?.basisWeight || "",
    totalWidth: initial?.totalWidth || "",
    effectiveWidth: initial?.effectiveWidth || "",
    targetQty: initial?.targetQty ?? 0,
    manageWeight: initial?.manageWeight || "",
    plcWeight: initial?.plcWeight || "",
    totalWeight: initial?.totalWeight || "",
    recipe: initial?.recipe || "",
    lineSq: initial?.lineSq,
    lineName: initial?.lineName || "",
    productionSpeed: initial?.productionSpeed || "",
    estimatedProductionTime: initial?.estimatedProductionTime || "",
    width: initial?.width || "",
    length: initial?.length || "",
    lotNo: initial?.lotNo || "",
    remark: initial?.remark || "",
    workStatus: DEFAULT_WORK_STATUS,
  };
}

// subItems 폭(mm) 합산 — 전폭길이 자동계산용
export function sumWidthMm(subItems: WorkOrderSubItem[]): number {
  return subItems.reduce((sum, item) => sum + (parseFloat(item.width) || 0), 0);
}

// subItems의 폭×길이 면적 합(m²) — 총중량 산출용. (폭 mm × 길이 m) / 1,000,000
export function sumAreaM2(subItems: Pick<WorkOrderSubItem, "width" | "length">[]): number {
  return subItems.reduce((sum, s) => {
    const w = parseFloat(s.width) || 0;
    const l = parseFloat(s.length) || 0;
    return sum + (w * l) / 1_000_000;
  }, 0);
}

// 상세 페이로드 배열(WorkOrderDetailSaveReq)로 변환. dropLotNo면 lotNo를 비워 백엔드 재부여 유도.
export function buildDetailReqs(subItems: WorkOrderSubItem[], dropLotNo = false): WorkOrderDetailSaveReq[] {
  return subItems.map((sub) => ({
    itemSq: sub.itemSq,
    itemCode: sub.itemCode,
    lotNo: dropLotNo ? undefined : sub.lotNo,
    orderQty: Number(sub.targetQty) || 0,
    width: parseFloat(sub.width) || 0,
    length: parseFloat(sub.length) || 0,
    effectiveWidth: parseFloat(sub.effectiveWidth) || 0,
  }));
}

// 상세 합계 기반 작업지시량
export function sumOrderQty(details: WorkOrderDetailSaveReq[]): number {
  return details.reduce((sum, d) => sum + (d.orderQty || 0), 0);
}

// 상세 폭 합계 (전폭)
export function sumDetailWidth(details: WorkOrderDetailSaveReq[]): number {
  return details.reduce((sum, d) => sum + (d.width || 0), 0);
}

// 총중량(kg) = 관리평량(g/m²) × Σ(폭(m) × 길이(m)). 관리평량 0 이하면 0.
export function computeTotalWeight(details: WorkOrderDetailSaveReq[], manageWeight: number): number {
  const totalArea = details.reduce((sum, d) => sum + ((d.width || 0) * (d.length || 0)) / 1_000_000, 0);
  return manageWeight > 0 ? manageWeight * totalArea : 0;
}

// 부모 계획량을 품목 수로 정수 분할. 나머지는 앞쪽 품목부터 +1씩 배분.
export function splitQtyByItems(parentQty: number, itemCount: number): number[] {
  if (itemCount <= 0) return [];
  const base = parentQty > 0 ? Math.floor(parentQty / itemCount) : 0;
  const remainder = parentQty - base * itemCount;
  return Array.from({ length: itemCount }, (_, idx) => (parentQty > 0 ? base + (idx < remainder ? 1 : 0) : 0));
}

// 평량 검증 결과 타입 (경고/오류 메시지 또는 null)
export type ValidationIssue = { kind: "warning" | "error"; message: string } | null;

// 저장 전 마스터 평량/중량 값 검증. 문제 없으면 null.
export function validateMasterWeights(opts: {
  effectiveLineName: string;
  effectivePriority: string;
  manageWeight: number;
  basisWeight: number;
  plcWeight: number;
}): ValidationIssue {
  if (!opts.effectiveLineName) {
    return { kind: "warning", message: "라인구분을 선택해주세요." };
  }
  if (!opts.effectivePriority || !String(opts.effectivePriority).trim()) {
    return { kind: "warning", message: "우선순위를 입력해주세요." };
  }
  if (opts.manageWeight <= 0) {
    return { kind: "warning", message: "관리평량을 입력해주세요." };
  }
  if (opts.manageWeight > 0 && opts.basisWeight > 0 && opts.manageWeight < opts.basisWeight) {
    return { kind: "error", message: "관리평량은 기준평량보다 작을 수 없습니다." };
  }
  if (opts.plcWeight <= 0) {
    return { kind: "warning", message: "브랜딩 합산 중량(g)을 입력해주세요." };
  }
  return null;
}

// 상세 품목 중 유효폭이 폭보다 작은 항목이 있는지 검사
export function hasInvalidEffectiveWidth(subItems: WorkOrderSubItem[]): boolean {
  return subItems.some(
    (s) =>
      s.effectiveWidth !== "" &&
      s.effectiveWidth != null &&
      parseFloat(s.effectiveWidth) < (parseFloat(s.width) || 0),
  );
}

// 마스터 평량/중량 실효값 산출: 수정 모드는 formData, 등록 모드는 첫 subItem 스냅샷 우선
export function resolveMasterWeights(
  formData: WorkOrderData,
  baseMasterSnap: any,
  isEditView: boolean,
) {
  const manageWeight = isEditView
    ? parseFloat(formData.manageWeight) || 0
    : parseFloat(baseMasterSnap?.manageWeight) || parseFloat(formData.manageWeight) || 0;
  const basisWeight = isEditView
    ? parseFloat(formData.basisWeight) || 0
    : parseFloat(baseMasterSnap?.basisWeight) || parseFloat(formData.basisWeight) || 0;
  const plcWeight = isEditView
    ? parseFloat(formData.plcWeight) || 0
    : parseFloat(baseMasterSnap?.plcWeight) || parseFloat(formData.plcWeight) || 0;
  return { manageWeight, basisWeight, plcWeight };
}

// 수정 모드 저장 페이로드 조립
export function buildEditPayload(opts: {
  workOrderId: string;
  formData: WorkOrderData;
  details: WorkOrderDetailSaveReq[];
  basisWeight: number;
  manageWeight: number;
  plcWeight: number;
}): WorkOrderSaveReq {
  const { formData, details } = opts;
  return {
    workOrderSq: Number(opts.workOrderId),
    workOrderDate: formData.workOrderDate,
    lineSq: formData.lineSq,
    lineName: formData.lineName,
    priority: formData.priority,
    itemCode: formData.itemCode,
    targetQty: sumOrderQty(details),
    prodSpeed: parseFloat(formData.productionSpeed) || 0,
    basisWeight: opts.basisWeight,
    manageWeight: opts.manageWeight,
    plcWeight: opts.plcWeight,
    totalWidth: sumDetailWidth(details),
    totalWeight: computeTotalWeight(details, opts.manageWeight),
    effectiveWidth: parseFloat(formData.effectiveWidth) || 0,
    estimatedProductionTime: parseFloat(formData.estimatedProductionTime) || 0,
    lotNo: formData.lotNo,
    recipe: formData.recipe,
    remark: formData.remark,
    details,
  };
}

// 등록 모드 저장 페이로드 조립 (마스터 정보는 첫 subItem 스냅샷 baseMaster에서 읽음)
export function buildCreatePayload(opts: {
  formData: WorkOrderData;
  baseMaster: any;
  details: WorkOrderDetailSaveReq[];
  basisWeight: number;
  manageWeight: number;
  plcWeight: number;
}): WorkOrderSaveReq {
  const { formData, baseMaster, details } = opts;
  return {
    workOrderDate: baseMaster.workOrderDate,
    lineSq: formData.lineSq,
    lineName: baseMaster.lineName,
    priority: baseMaster.priority,
    itemCode: baseMaster.itemCode,
    targetQty: sumOrderQty(details),
    prodSpeed: parseFloat(baseMaster.productionSpeed) || 0,
    basisWeight: opts.basisWeight,
    manageWeight: opts.manageWeight,
    plcWeight: opts.plcWeight,
    totalWidth: sumDetailWidth(details),
    totalWeight: computeTotalWeight(details, opts.manageWeight),
    effectiveWidth: parseFloat(baseMaster.effectiveWidth) || 0,
    estimatedProductionTime: parseFloat(baseMaster.estimatedProductionTime) || 0,
    lotNo: formData.lotNo,
    recipe: formData.recipe || baseMaster.recipe,
    remark: baseMaster.remark,
    details,
  };
}
