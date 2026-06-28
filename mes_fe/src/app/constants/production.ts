/**
 * 생산관리 화면들의 테이블 컬럼 정의.
 *
 * 여러 화면이 같은 (key·label) 컬럼을 반복 사용하므로, 공용 컬럼은 `COL` 원자로
 * 한 번만 선언하고 각 컬럼 배열은 이를 조립해 구성한다. 화면별 고유 컬럼만
 * `col(...)` 로 인라인 선언한다. 산출되는 배열 모양은 기존과 동일하다.
 */
import { UNITS, withUnit } from "@/app/utils/unitConvert";

export interface TableColumn {
  key: string;
  label: string;
}

/** (key, label) 한 쌍을 만드는 헬퍼. */
const col = (key: string, label: string): TableColumn => ({ key, label });

/** 둘 이상의 화면이 공유하는 컬럼 원자. */
const COL = {
  selected: col("selected", "선택"),
  no: col("no", "No."),
  orderDate: col("orderDate", "수주일자"),
  orderNo: col("orderNo", "수주번호"),
  customerCode: col("customerCode", "거래처번호"),
  customerName: col("customerName", "거래처명"),
  itemCode: col("itemCode", "품번"),
  itemName: col("itemName", "품명"),
  width: col("width", withUnit("폭", UNITS.width)),
  basisWeight: col("basisWeight", withUnit("평량", UNITS.basisWeight)),
  length: col("length", withUnit("길이", UNITS.length)),
  orderQty: col("orderQty", withUnit("수주량", UNITS.length)),
  orderQtyEa: col("orderQtyEa", "수주량(EA)"),
  currentStock: col("currentStock", withUnit("재고량", UNITS.length)),
  safetyStock: col("safetyStock", withUnit("적정재고량", UNITS.length)),
  shortageQty: col("shortageQty", withUnit("과부족량", UNITS.length)),
  productionReqQty: col("productionReqQty", withUnit("생산소요량", UNITS.length)),
  targetQtyOrder: col("targetQty", withUnit("작업지시량", UNITS.length)),
  productionSpeedSpd: col("productionSpeed", withUnit("생산속도", UNITS.productionSpeed)),
  lineName: col("lineName", "라인구분"),
} as const;

// ───────────────────────── 생산소요량 산출 ─────────────────────────

export const requirementColumns: TableColumn[] = [
  COL.orderDate,
  COL.orderNo,
  COL.customerCode,
  COL.customerName,
  COL.itemCode,
  COL.itemName,
  COL.width,
  COL.basisWeight,
  COL.length,
  COL.orderQty,
  COL.currentStock,
  COL.safetyStock,
  COL.shortageQty,
  col("deliveryPlannedQty", withUnit("추가출하예정량", UNITS.length)),
  COL.productionReqQty,
  col("productionSpeed", "분당생산량"),
  col("productionPerHourM2", withUnit("분당생산량", UNITS.area)),
  col("estimatedProductionTime", "예상생산소요시간(분)"),
];

/** 상단 고객수주 (수주번호 단위 합산). */
export const customerOrderColumns: TableColumn[] = [
  COL.selected,
  COL.orderDate,
  COL.orderNo,
  COL.customerCode,
  COL.itemCode,
  COL.itemName,
  COL.orderQty,
  COL.orderQtyEa,
];

/** 생산계획 등록 시 상단 소요량 대상 선택 테이블 (폭/평량/길이 제외, 품번 단위). */
export const requirementColumnsForPlan: TableColumn[] = [
  COL.orderDate,
  COL.orderNo,
  COL.customerCode,
  COL.customerName,
  COL.itemCode,
  COL.itemName,
  COL.orderQty,
  COL.currentStock,
  COL.safetyStock,
  COL.shortageQty,
  COL.productionReqQty,
  col("productionSpeed", "분당생산량"),
  col("estimatedProductionTime", "예상생산소요시간(분)"),
];

// ───────────────────────── 생산계획 ─────────────────────────

export const productionPlanColumns: TableColumn[] = [
  col("no", "No."),
  COL.lineName,
  col("planDate", "생산계획일"),
  COL.itemCode,
  COL.itemName,
  COL.currentStock,
  col("planQty", withUnit("계획량", UNITS.length)),
  COL.productionSpeedSpd,
  col("estimatedProductionTime", "예상소요시간(분)"),
  col("remark", "비고"),
];

/** 생산계획 스케줄(라인×시간) 행 헤더. */
export const scheduleRowHeaders: TableColumn[] = [
  COL.lineName,
  COL.itemCode,
  COL.itemName,
  col("planQty", withUnit("생산계획량", UNITS.length)),
  col("planQtyEa", "생산계획량(EA)"),
  COL.productionSpeedSpd,
  col("estimatedProductionTime", "예상소요시간(분)"),
  col("startTime", "시작시간"),
  col("endTime", "종료시간"),
  col("remark", "비고"),
];

// ───────────────────────── 작업지시 ─────────────────────────

export const workOrderColumns: TableColumn[] = [
  col("No", "No."),
  col("lotNo", "작업지시번호"),
  col("workOrderDate", "작업지시일"),
  col("lineName", "라인"),
  COL.itemCode,
  COL.itemName,
  COL.targetQtyOrder,
  col("workStatus", "작업상태"),
];

/** 작업지시 하단 상세 품목 컬럼 (기준평량/관리평량은 master 4-grid로 이동). */
export const workOrderSubItemColumns: TableColumn[] = [
  COL.selected,
  COL.no,
  COL.itemCode,
  COL.itemName,
  COL.width,
  COL.length,
  col("effectiveWidth", withUnit("유효폭", UNITS.width)),
  COL.targetQtyOrder,
];

// ───────────────────────── 생산일보 ─────────────────────────

export const workPerformanceColumns: TableColumn[] = [
  COL.no,
  col("workDate", "생산일"),
  col("lineName", "라인"),
  COL.itemCode,
  COL.itemName,
  COL.basisWeight,
  COL.length,
  COL.width,
  col("targetQty", withUnit("계획량", UNITS.length)),
  col("realBasisWeight", withUnit("생산평량", UNITS.basisWeight)),
  col("manageLength", withUnit("생산길이", UNITS.length)),
  col("grossWeight", withUnit("롤중량", UNITS.weight)),
  col("startTime", "시작시간"),
  col("endTime", "종료시간"),
  col("duration", withUnit("소요시간", UNITS.timeMinutes)),
  col("lotNo", "생산 Lot-No"),
];
