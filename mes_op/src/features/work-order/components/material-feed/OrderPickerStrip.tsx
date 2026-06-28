import type { RecipeParentRow } from "@/types/recipe.interface";
import { toDisplayQty } from "./feedHelpers";

interface OrderPickerStripProps {
  orders: RecipeParentRow[];
  activeId: string | null;
  onPick: (id: string) => void;
}

// 가로 스크롤되는 작업지시 선택 카드 영역. 비어있으면 안내 문구를 노출한다.
export function OrderPickerStrip({ orders, activeId, onPick }: OrderPickerStripProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1" data-help="op-recipe-standard-main">
      {orders.length === 0 ? (
        <div className="w-full py-12 text-center text-slate-400 text-lg bg-white rounded-2xl border border-slate-200">
          해당 작업일에 조회된 작업지시가 없습니다.
        </div>
      ) : (
        orders.map((order) => {
          const isActive = order.id === activeId;
          return (
            <button
              key={order.id}
              className={`flex-shrink-0 w-64 text-left rounded-2xl p-4 border-2 transition shadow-sm ${
                isActive ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"
              }`}
              onClick={() => onPick(order.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center rounded-lg bg-slate-800 text-white px-3 py-1 text-sm font-bold">
                  {order.lineName || "-"}
                </span>
                <span className="text-sm font-mono text-blue-700 font-bold">{order.prodCode || "-"}</span>
              </div>
              <div className="text-lg font-bold text-slate-800 truncate">{order.prodName || "-"}</div>
              <div className="mt-1 text-sm text-slate-500">
                계획 {toDisplayQty(order.planQty, "m")} · 레시피 {order.recipeNo || "-"}
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}
