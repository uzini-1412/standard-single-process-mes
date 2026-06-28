import type {
  MaterialChildRow,
  MaterialInputDraft,
  StockLotOption,
  SavedInputRecord,
} from "@/types/recipe.interface";
import { FeedStatusBadge } from "./FeedStatusBadge";
import { toDisplayQty, type FeedStatus } from "./feedHelpers";

interface MaterialFeedCardProps {
  material: MaterialChildRow;
  draft: MaterialInputDraft;
  record?: SavedInputRecord;
  lotOptions: StockLotOption[];
  locked: boolean;
  onDraftChange: (childId: string, patch: Partial<MaterialInputDraft>) => void;
}

// 자재 한 종에 대한 소요량/실투입량/LOT 선택/편차·투입률을 보여주고 입력받는 카드
export function MaterialFeedCard({
  material,
  draft,
  record,
  lotOptions,
  locked,
  onDraftChange,
}: MaterialFeedCardProps) {
  const status: FeedStatus = (record?.inputStatus as FeedStatus) || "NONE";
  const feedRate = material.reqQty > 0 ? (draft.inputQty / material.reqQty) * 100 : 0;
  const deviation = draft.inputQty - material.reqQty;
  const deviationCls =
    Math.abs(deviation) < 0.0005 ? "text-emerald-600" : deviation > 0 ? "text-rose-600" : "text-amber-600";

  const onLotSelect = (raw: string) => {
    const stockSq = raw ? Number(raw) : null;
    const matched = lotOptions.find((opt) => opt.stockSq === stockSq);
    onDraftChange(material.id, {
      stockSq,
      purchaseLotNo: matched?.lotNo || "",
      stockLotNo: matched?.lotNo || "",
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      {/* 자재 식별 정보 + 상태 */}
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-slate-800">{material.materialName || "-"}</span>
            <span className="font-mono text-sm text-slate-500">{material.materialCode}</span>
          </div>
          <div className="text-sm text-slate-400">
            {material.materialType || "-"} · {material.materialSpec || "-"} · 비중 {material.ratio.toFixed(2)}%
          </div>
        </div>
        <div className="flex items-center gap-3">
          {record?.plcRawG != null && (
            <span className="text-sm text-violet-600 font-semibold">PLC {toDisplayQty(record.plcRawG, "g")}</span>
          )}
          <FeedStatusBadge status={status} />
        </div>
      </div>

      {/* 소요량 · 실투입 · 편차/투입률 3열 */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr_1fr] gap-3 items-end">
        {/* 소요량(기준) */}
        <div>
          <div className="text-xs font-semibold text-slate-400 mb-1">소요량(기준)</div>
          <div className="text-2xl font-bold text-slate-700 tabular-nums">{toDisplayQty(material.reqQty, "g")}</div>
        </div>

        {/* 실투입량 + LOT 선택 */}
        <div>
          <div className="text-xs font-semibold text-slate-400 mb-1">실투입량</div>
          <div className="flex gap-2">
            <input
              className="w-32 border border-slate-300 rounded-xl px-3 py-2 text-2xl font-bold text-right tabular-nums bg-white disabled:bg-slate-100 disabled:text-slate-500"
              type="number"
              inputMode="decimal"
              disabled={locked}
              value={Number.isFinite(draft.inputQty) ? draft.inputQty : 0}
              onChange={(e) => onDraftChange(material.id, { inputQty: parseFloat(e.target.value) || 0 })}
            />
            <select
              className="flex-1 min-w-[150px] border border-slate-300 rounded-xl px-3 py-2 bg-white text-base disabled:bg-slate-100 disabled:text-slate-500"
              disabled={locked}
              value={draft.stockSq ?? ""}
              onChange={(e) => onLotSelect(e.target.value)}
            >
              {lotOptions.length === 0 && <option value="">투입 가능 LOT 없음</option>}
              {lotOptions.map((opt) => (
                <option key={opt.stockSq} value={opt.stockSq}>
                  {opt.lotNo || `재고#${opt.stockSq}`} (가용 {toDisplayQty(opt.availableQty)})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 편차 + 투입률 진행바 */}
        <div>
          <div className="text-xs font-semibold text-slate-400 mb-1">
            편차 <span className={`font-bold ${deviationCls}`}>{deviation > 0 ? "+" : ""}{toDisplayQty(deviation, "g")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${feedRate > 105 ? "bg-rose-500" : feedRate < 95 ? "bg-amber-500" : "bg-emerald-500"}`}
                style={{ width: `${Math.min(feedRate, 100)}%` }}
              />
            </div>
            <span className="text-sm font-bold text-slate-600 tabular-nums w-16 text-right">
              {feedRate.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
