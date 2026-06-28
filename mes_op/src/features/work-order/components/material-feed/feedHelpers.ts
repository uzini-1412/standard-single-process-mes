import type {
  MaterialChildRow,
  RecipeParentRow,
  StockLotOption,
  SavedInputRecord,
} from "@/types/recipe.interface";

// 숫자를 천단위 구분 + 소수 3자리까지 표기하고 단위를 붙여 반환
export const toDisplayQty = (value: number, suffix = "") =>
  `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 3 })}${suffix}`;

export type FeedStatus = "NONE" | "RESERVED" | "CONFIRMED" | "PLC_AUTO";

// 상태값별 배지 라벨 및 색상 클래스 정의
export const FEED_STATUS_STYLES: Record<FeedStatus, { label: string; cls: string }> = {
  NONE: { label: "미투입", cls: "bg-slate-100 text-slate-500" },
  RESERVED: { label: "투입예약", cls: "bg-amber-100 text-amber-700" },
  CONFIRMED: { label: "투입확정", cls: "bg-emerald-100 text-emerald-700" },
  PLC_AUTO: { label: "PLC 자동", cls: "bg-violet-100 text-violet-700" },
};

// 여러 투입 기록을 하나의 대표 상태로 압축한다 (우선순위: PLC > 확정 > 예약 > 미투입)
export function summarizeFeedStatus(records: SavedInputRecord[]): FeedStatus {
  if (records.some((rec) => rec.inputStatus === "PLC_AUTO")) return "PLC_AUTO";
  if (records.length > 0 && records.every((rec) => rec.inputStatus === "CONFIRMED")) return "CONFIRMED";
  if (records.some((rec) => rec.inputStatus === "RESERVED")) return "RESERVED";
  return "NONE";
}

// 공통정보 응답에서 '라인구분'에 해당하는 사용중 값들을 중복 없이 뽑아낸다
export function extractLineNames(items: any[]): string[] {
  return Array.from(
    new Set(
      (items || [])
        .filter((entry) => entry.useYn === true)
        .flatMap((entry) => entry.contentValues || [])
        .filter((value) => typeof value === "string" && value.length > 0)
    )
  );
}

// 재고 응답 리스트를 품번을 키로 하는 LOT 선택지 Map으로 변환
export function buildStockIndex(list: any[]): Map<string, StockLotOption[]> {
  const index = new Map<string, StockLotOption[]>();
  for (const stock of list || []) {
    const code = stock.itemCode;
    if (!code) continue;
    const option: StockLotOption = {
      stockSq: stock.stockSq,
      lotNo: stock.lotNo || "",
      availableQty: Number(stock.availableQty ?? stock.currentQty ?? 0),
      currentQty: Number(stock.currentQty ?? 0),
    };
    const bucket = index.get(code) || [];
    bucket.push(option);
    index.set(code, bucket);
  }
  return index;
}

// 저장된 투입 기록 응답을 materialItemSq 키 Map으로 정규화
export function indexSavedRecords(list: any[]): Map<number, SavedInputRecord> {
  const index = new Map<number, SavedInputRecord>();
  for (const rec of list || []) {
    index.set(Number(rec.materialItemSq), {
      materialItemSq: Number(rec.materialItemSq),
      inputQty: Number(rec.inputQty || 0),
      calculatedQty: Number(rec.calculatedQty || 0),
      inputStatus: rec.inputStatus || "RESERVED",
      plcRawG: rec.plcRawG != null ? Number(rec.plcRawG) : null,
      purchaseLotNo: rec.purchaseLotNo || "",
    });
  }
  return index;
}

// 단일 작업지시와 그에 매칭된 레시피 목록으로 부모/자식 행 한 건을 구성. 레시피가 없으면 null.
export function composeRecipeRow(order: any, recipes: any[]): RecipeParentRow | null {
  if (!recipes || recipes.length === 0) return null;

  // 면적(m²) = Σ(width(mm) × length(m)) / 1000
  const totalArea = (order.details ?? []).reduce(
    (acc: number, detail: any) => acc + ((detail.width ?? 0) * (detail.length ?? 0)) / 1000,
    0
  );
  const totalReq = recipes.reduce((acc: number, recipe: any) => acc + (Number(recipe.quantity) || 0), 0);
  const recipeNo = recipes.find((recipe: any) => recipe.bomNo)?.bomNo || "";
  const parentId = `${order.workOrderSq}-${recipeNo || order.itemSq}`;

  const children: MaterialChildRow[] = recipes.map((recipe: any) => {
    const requiredQty = Number(recipe.quantity) || 0;
    return {
      id: `${parentId}-${recipe.bomLineSq}`,
      materialItemSq: Number(recipe.componentItemSq) || 0,
      materialType: recipe.materialType || "",
      materialCode: recipe.materialCode || "",
      materialName: recipe.materialName || "",
      materialSpec: recipe.materialSpec || "",
      reqQty: Math.round(requiredQty * totalArea),
      ratio: totalReq > 0 ? (requiredQty / totalReq) * 100 : Number(recipe.ratio) || 0,
    };
  });

  return {
    id: parentId,
    workOrderSq: Number(order.workOrderSq),
    productionLotNo: order.productionLotNo || "",
    lineName: order.lineName || "",
    prodCode: order.itemCode || recipes[0]?.productCode || "",
    prodName: order.itemName || recipes[0]?.productName || "",
    planQty: order.targetQty || 0,
    recipeNo,
    children,
  };
}

// 오늘자이거나 진행중인 작업지시인지 판별 (품목이 지정된 건만 대상)
export function isFeedableOrder(order: any, workDate: string): boolean {
  if (!order.itemSq) return false;
  const orderDate = order.workOrderDate ? String(order.workOrderDate) : "";
  return orderDate === workDate || order.workStatus === "IN_PROGRESS";
}
