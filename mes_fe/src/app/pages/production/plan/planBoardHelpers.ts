/** [생산관리 > 생산계획] 보드 화면에서 쓰는 순수 계산/포맷 유틸 모음. 외부 노출 없음. */
import { buildExcelFileName } from "@/app/utils/excelDownload";
import { toYmd } from "@/app/utils/dateToday";

/** 우측 정렬 + 천단위 콤마가 필요한 수량성 컬럼 키 (금액 컬럼은 존재하지 않음). */
export const QUANTITY_COLUMN_KEYS = new Set<string>([
  "currentStock",
  "planQty",
  "productionSpeed",
  "estimatedProductionTime",
]);

/** 전치(생산구분) 표에서 값이 숫자인 행 헤더 키 집합. */
export const QUANTITY_ROW_KEYS = new Set<string>([
  "planQty",
  "planQtyEa",
  "productionSpeed",
  "estimatedProductionTime",
]);

/** 헤더에 노출할 "YYYY. M. D(요일)" 표기를 만든다. */
export function describeDateHeader(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  const weekday = ["일", "월", "화", "수", "목", "금", "토"];
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}(${weekday[date.getDay()]})`;
}

/** 시작~끝 일자(포함)를 하루 간격 YYYY-MM-DD 배열로 펼친다. */
export function enumerateDays(dateFrom: string, dateTo: string): string[] {
  const start = new Date(dateFrom);
  const end = new Date(dateTo);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];
  const out: string[] = [];
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    out.push(toYmd(cursor));
  }
  return out;
}

/** 계획량 ÷ 길이(올림) = 매(EA) 수량. 유효하지 않으면 빈 문자열. */
export function computePlanQtyEa(plan: any): string {
  const qty = Number(plan?.planQty);
  const length = parseFloat(plan?.length);
  if (!isNaN(qty) && !isNaN(length) && length > 0) {
    return String(Math.ceil(qty / length));
  }
  return "";
}

/** 전치 표의 한 셀에 표기할 원시 텍스트(숫자 포맷 적용 전)를 산출한다. */
export function readScheduleCell(plan: any, rowKey: string): string {
  if (!plan) return "";
  if (rowKey === "planQtyEa") return computePlanQtyEa(plan);
  const raw = plan[rowKey as keyof typeof plan];
  return raw == null ? "" : String(raw);
}

/** 검색 일자/라인 조건으로 엑셀 파일명을 조립한다. */
export function buildScheduleFileName(dateFrom: string, dateTo: string, lineLabel: string): string {
  let range: string | undefined;
  const from = dateFrom ? dateFrom.replace(/-/g, "") : "";
  const to = dateTo ? dateTo.replace(/-/g, "") : "";
  if (from && to) {
    range = from === to ? from : `${from}~${to}`;
  } else if (from) {
    range = from;
  } else if (to) {
    range = to;
  }
  return buildExcelFileName("생산계획", [range, lineLabel]);
}

/** API 응답 1건을 보드 테이블 행 형태로 정규화한다. */
export function normalizePlanRow(plan: any, index: number) {
  return {
    planSq: plan.planSq,
    itemSq: plan.itemSq,
    no: String(index + 1),
    lineName: plan.lineName,
    planDate: plan.planDate,
    itemCode: plan.itemCode,
    itemName: plan.itemName,
    basisWeight: plan.basisWeight,
    width: plan.width,
    length: plan.length,
    currentStock: plan.currentStock,
    planQty: plan.planQty,
    weight: plan.weight,
    manageWeight: plan.weight,
    productionSpeed: plan.productionSpeed,
    estimatedProductionTime: plan.estimatedProductionTime,
    startTime: plan.startTime,
    endTime: plan.endTime,
    remark: plan.remark,
    regDt: plan.regDt,
  };
}
