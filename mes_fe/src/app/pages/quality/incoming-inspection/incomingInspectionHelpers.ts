/** [품질관리 > 입고검사] 화면 전반에서 재사용하는 순수 계산 헬퍼 모음. 외부 도메인에서는 import 하지 않는 내부 전용. */
import {
  IncomingInspectionTargetData,
  IncomingInspectionResultData,
  IncomingInspectionItemDetail,
} from "@/types/quality/inspection.interface";

// 천단위 콤마 우측정렬이 필요한 수량 계열 컬럼 키 집합
export const TARGET_NUMERIC_FIELDS = new Set<string>(["orderQty", "inboundQty"]);
export const RESULT_NUMERIC_FIELDS = new Set<string>(["inboundQty"]);

// 상세/등록 측정 표에서 우측정렬 처리할 정량 기준 컬럼 키 집합
export const ITEM_NUMERIC_FIELDS = new Set<string>([
  "sampleCnt",
  "baseVal",
  "maxVal",
  "minVal",
]);

// x1 ~ x15 측정값 필드를 한 객체로 펼쳐 담아주는 보조 함수 (반복 작성 제거)
function spreadMeasureColumns(raw: any): Record<string, string> {
  const out: Record<string, string> = {};
  for (let n = 1; n <= 15; n++) {
    const key = `x${n}`;
    out[key] = raw[key] || "";
  }
  return out;
}

// 백엔드 검사항목 raw 배열을 화면용 IncomingInspectionItemDetail 형태로 정규화
export function mapInspectItemRows(rawItems: any[]): IncomingInspectionItemDetail[] {
  return rawItems.map((raw: any, idx: number) => ({
    no: idx + 1,
    itemDtlSq: raw.itemDtlSq,
    inspectItemName: raw.inspectItemName || "",
    inspectCriteria: raw.inspectCriteria || "",
    measureType: raw.measureType || "",
    inspectMethod: raw.inspectMethod || "",
    inspectCycle: raw.inspectCycle || "",
    sampleCnt: raw.sampleCnt || "",
    baseVal: raw.baseVal || "",
    maxVal: raw.maxVal || "",
    minVal: raw.minVal || "",
    resultYn: raw.resultYn || "",
    ...spreadMeasureColumns(raw),
  })) as IncomingInspectionItemDetail[];
}

// inboundQty(가입고수량)가 양수인 대상만 추려 화면용 대상 행으로 변환
export function mapInspectionTargets(rawList: any[]): IncomingInspectionTargetData[] {
  return rawList
    .filter((raw: any) => (Number(raw.inboundQty) || 0) > 0)
    .map((raw: any, idx: number) => ({
      no: String(idx + 1),
      inboundSq: raw.inboundSq,
      orderNo: raw.orderNo || "",
      customerName: raw.customerName || "",
      customerCode: raw.customerCode || "",
      itemCode: raw.itemCode || "",
      itemName: raw.itemName || "",
      accountType: raw.accountType || "",
      orderQty: raw.orderQty || "",
      inReqDate: raw.inReqDate || "",
      inboundQty: Number(raw.inboundQty) || 0,
      inboundDate: raw.inboundDate || "",
    }));
}

// PASS/REJECT 로 종료된 검사 raw 행을 화면 결과 행으로 변환
export function mapInspectionResults(rawList: any[]): IncomingInspectionResultData[] {
  return rawList.map((raw: any, idx: number) => ({
    no: String(idx + 1),
    selected: false,
    inboundSq: raw.inboundSq,
    orderNo: raw.orderNo || "",
    customerName: raw.customerName || "",
    customerCode: raw.customerCode || "",
    itemCode: raw.itemCode || "",
    itemName: raw.itemName || "",
    accountType: raw.accountType || "",
    orderQty: raw.orderQty || "",
    inReqDate: raw.inReqDate || "",
    inboundQty: Number(raw.inboundQty) || 0,
    inboundDate: raw.inboundDate || "",
    inspectNo: raw.inspectNo || "",
    inspectorName: raw.inspectorName || "",
    inspectDate: raw.inspectDate || "",
    packingQty: Number(raw.packingQty) || 0,
    packingUnit: raw.packingUnit || "",
    lotQty: Number(raw.lotQty) || 0,
    lotNo: raw.inspectLotNo || raw.lotNo || "",
    remark: raw.remark || "",
    inspectStatus: raw.inspectStatus || "",
    inspectResult: raw.inspectResult || "",
    fileName: raw.fileName || "",
    filePath: raw.filePath || "",
    certificate: raw.fileName ? "첨부" : "",
  }));
}

// 검사가 종료(합격/불량)된 행만 통과시키는 술어
export function isCompletedInspection(raw: any): boolean {
  return raw.inspectStatus === "PASS" || raw.inspectStatus === "REJECT";
}

// 품번/품명/거래처명 키워드로 대소문자 무시 부분일치 필터를 한 번에 적용
export function filterByKeywords<T extends Record<string, any>>(
  rows: T[],
  keywords: { itemCode: string; itemName: string; customerName: string },
): T[] {
  const matchOne = (rawValue: any, kw: string) =>
    (rawValue || "").toLowerCase().includes(kw.toLowerCase());

  return rows.filter((row) => {
    if (keywords.itemCode && !matchOne(row.itemCode, keywords.itemCode)) return false;
    if (keywords.itemName && !matchOne(row.itemName, keywords.itemName)) return false;
    if (keywords.customerName && !matchOne(row.customerName, keywords.customerName)) return false;
    return true;
  });
}

// 클라이언트 페이징에 필요한 파생값을 한 번에 계산
export function derivePaging(totalCount: number, requestedPage: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const clampedPage = Math.min(requestedPage, pageCount - 1);
  const offset = clampedPage * pageSize;
  return { pageCount, clampedPage, offset };
}

// 정성검사(OK/NG) 항목 여부 판단.
// measureType이 지정돼 있으면 그 값을 신뢰하고, 비어 있으면 기준값 형태로 추정한다.
export function rowIsQualitative(item: any): boolean {
  if (item.measureType === "정성") return true;
  if (item.measureType === "정량") return false;
  const refs = [item.baseVal, item.maxVal, item.minVal].filter(
    (v: any) => v != null && v !== "",
  );
  if (refs.length === 0) return true; // 기준이 없으면 보수적으로 정성 처리
  return refs.some((v: any) => v === "OK" || v === "NG");
}

// 한 검사항목의 합부를 자동 산출.
// 정성: 기준치와 모든 시료가 같으면 합격(기준 없으면 NG 한 개라도 있으면 불합격).
// 정량: 모든 측정값이 minVal~maxVal 범위 안이면 합격, 하나라도 벗어나면 불합격.
export function evaluateRowResult(item: any): string {
  const sampleCount = parseInt(item.sampleCnt as string) || 0;
  if (sampleCount === 0) return "";

  const samples = Array.from({ length: sampleCount }, (_, i) => item[`x${i + 1}`]);
  const everyFilled = samples.every(
    (v: any) => v != null && v !== "" && v !== "선택",
  );
  if (!everyFilled) return "";

  if (rowIsQualitative(item)) {
    const expected = item.baseVal;
    if (!expected) {
      return samples.some((v: any) => v === "NG") ? "불합격" : "합격";
    }
    return samples.every((v: any) => v === expected) ? "합격" : "불합격";
  }

  const lower =
    item.minVal !== "" && item.minVal != null ? parseFloat(item.minVal) : null;
  const upper =
    item.maxVal !== "" && item.maxVal != null ? parseFloat(item.maxVal) : null;
  for (const v of samples) {
    const n = parseFloat(v);
    if (isNaN(n)) return "불합격";
    if (lower != null && !isNaN(lower) && n < lower) return "불합격";
    if (upper != null && !isNaN(upper) && n > upper) return "불합격";
  }
  return "합격";
}

// 자식 LOT 미리보기 행 생성.
// 부모 LOT(IS-yyyyMMdd-NN)을 lotQty 만큼 분할: 1건이면 부모 그대로, 여러 건이면 -01..-mm 접미.
export function buildChildLots(form: {
  inspectLotNo?: string;
  inboundQty?: any;
  packingQty?: any;
  lotQty?: any;
}): { lotNo: string; qty: number }[] {
  const parent = form.inspectLotNo as string;
  const inboundQty = parseInt(form.inboundQty, 10) || 0;
  const packingQty = parseInt(form.packingQty, 10) || 0;
  const lotQty = parseInt(form.lotQty, 10) || 0;
  if (!parent || lotQty <= 0 || inboundQty <= 0) return [];

  const rows: { lotNo: string; qty: number }[] = [];
  for (let i = 0; i < lotQty; i++) {
    const lotNo =
      lotQty === 1 ? parent : `${parent}-${String(i + 1).padStart(2, "0")}`;
    let qty: number;
    if (lotQty === 1) {
      qty = inboundQty;
    } else if (packingQty > 0) {
      if (i < lotQty - 1) {
        qty = packingQty;
      } else {
        const remainder = inboundQty - packingQty * (lotQty - 1);
        qty = remainder > 0 ? remainder : packingQty;
      }
    } else {
      qty = Math.round(inboundQty / lotQty);
    }
    rows.push({ lotNo, qty });
  }
  return rows;
}
