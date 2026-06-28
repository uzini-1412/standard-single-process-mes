/** 자재재고 표 컬럼 구성 + 서버 항목→행 변환 헬퍼. 정렬 가능 컬럼/숫자 포맷/재고상태 아이콘 처리. */
import { CheckCircle, AlertCircle } from "lucide-react";
import { type ListColumn } from "../../../components/common/ListTable";
import { MaterialInventoryData } from "@/types/material/inventory.interface";
import { MATERIAL_INVENTORY_COLUMNS } from "@/app/constants/purchase";
import * as preReceivingApi from "../../../api/preReceivingApi";

// 헤더 클릭 정렬을 허용하는 컬럼들
const SORTABLE_KEYS = new Set(["itemCode", "itemName", "currentQty", "optimalStock", "stockStatus"]);
// 천단위 콤마 + 우측정렬이 필요한 수량/중량 컬럼 (금액 컬럼은 없음)
const QTY_KEYS = new Set<string>(["itemWeight", "optimalStock", "currentQty"]);

/** 재고상태 셀: 충분이면 초록 체크, 그 외엔 빨강 경고 아이콘. */
function StockStatusBadge({ status }: { status: string }) {
  if (status === "ENOUGH") {
    return (
      <div className="flex items-center justify-center">
        <div className="bg-green-500 rounded-full p-1">
          <CheckCircle className="w-4 h-4 text-white" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center">
      <div className="bg-red-500 rounded-full p-1">
        <AlertCircle className="w-4 h-4 text-white" />
      </div>
    </div>
  );
}

// 메인 재고표 컬럼 정의. 일부 헤더 정렬 + 수량/중량 숫자 포맷 + 재고상태 아이콘 렌더.
export const STOCK_TABLE_COLUMNS: ListColumn<MaterialInventoryData>[] = MATERIAL_INVENTORY_COLUMNS.map(
  (column) => ({
    key: column.key,
    label: column.label,
    width: column.width,
    sortable: SORTABLE_KEYS.has(column.key),
    ...(QTY_KEYS.has(column.key) ? { format: "number" as const } : {}),
    ...(column.key === "stockStatus"
      ? { render: (row: MaterialInventoryData) => <StockStatusBadge status={row.stockStatus} /> }
      : {}),
  }),
);

/** 서버 재고 집계 항목을 화면 행 모델로 정규화. null 값은 표시용 기본값으로 치환. */
export function toStockRow(
  source: preReceivingApi.InventoryGroupItem,
  rowNo: number,
): MaterialInventoryData {
  return {
    no: rowNo,
    stockSq: source.stockSq ?? 0,
    itemSq: source.itemSq ?? 0,
    accountType: source.accountType || "-",
    itemCode: source.itemCode,
    itemName: source.itemName,
    itemColor: source.itemColor || "-",
    itemWeight: source.itemWeight != null ? String(source.itemWeight) : "-",
    optimalStock: String(source.optimalStock ?? 0),
    currentQty: Number(source.currentQty) || 0,
    stockStatus: source.stockStatus || "SHORT",
    warehouseLocation: source.warehouseLocation || "-",
    warehouseLoc: source.warehouseLoc || "-",
  };
}
