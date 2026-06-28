import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { Header } from "./Header";
import { saveMaterialInputRecords, confirmMaterialInput } from "../../../utils/api/api";
import { MaterialInputDraft, MaterialFeedSheetProps } from "@/types/recipe.interface";
import { useMaterialFeedData } from "./material-feed/useMaterialFeedData";
import { summarizeFeedStatus } from "./material-feed/feedHelpers";
import { FeedStatusBadge } from "./material-feed/FeedStatusBadge";
import { OrderPickerStrip } from "./material-feed/OrderPickerStrip";
import { MaterialFeedCard } from "./material-feed/MaterialFeedCard";

export function MaterialFeedSheet({ onBack, workOrderData: incomingOrder }: MaterialFeedSheetProps) {
  const [workDate, setWorkDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [activeLine, setActiveLine] = useState("all");
  const [activeRowId, setActiveRowId] = useState<string | null>(null);

  // 자재별 입력 초안 (childId → draft)
  const [draftMap, setDraftMap] = useState<Record<string, MaterialInputDraft>>({});

  // 알림 배너와 진행중 플래그
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [working, setWorking] = useState(false);

  const {
    lineNameChoices,
    stockIndex,
    feedRows,
    savedRecords,
    setSavedRecords,
    reloadSavedRecords,
  } = useMaterialFeedData(workDate);

  // 상위 화면에서 작업지시가 넘어오면 그 작업일로 동기화
  useEffect(() => {
    if (incomingOrder?.workOrderDate) {
      setWorkDate(String(incomingOrder.workOrderDate));
    }
  }, [incomingOrder?.workOrderSq]);

  // 라인 필터 적용 결과
  const visibleRows = useMemo(
    () => feedRows.filter((row) => activeLine === "all" || row.lineName === activeLine),
    [feedRows, activeLine]
  );

  // 넘겨받은 작업지시가 목록에 있으면 우선 선택, 아니면 첫 행으로 자동 선택
  useEffect(() => {
    if (visibleRows.length === 0) {
      setActiveRowId(null);
      return;
    }
    const matched = incomingOrder?.workOrderSq
      ? visibleRows.find((row) => row.workOrderSq === Number(incomingOrder.workOrderSq))
      : null;
    setActiveRowId((prev) => {
      if (prev && visibleRows.some((row) => row.id === prev)) return prev;
      return (matched || visibleRows[0]).id;
    });
  }, [visibleRows, incomingOrder?.workOrderSq]);

  const activeRow = useMemo(
    () => visibleRows.find((row) => row.id === activeRowId) || null,
    [visibleRows, activeRowId]
  );

  // 선택이 바뀌면 해당 작업지시의 저장 기록을 다시 읽거나 비운다
  useEffect(() => {
    if (!activeRow) {
      setSavedRecords(new Map());
      setDraftMap({});
      return;
    }
    reloadSavedRecords(activeRow.workOrderSq);
  }, [activeRow?.workOrderSq, reloadSavedRecords]);

  // 저장 기록/재고가 준비되면 자재별 입력 초안을 미리 채운다 (저장값 우선, 없으면 소요량)
  useEffect(() => {
    if (!activeRow) return;
    const seeded: Record<string, MaterialInputDraft> = {};
    for (const child of activeRow.children) {
      const record = savedRecords.get(child.materialItemSq);
      const lots = stockIndex.get(child.materialCode) || [];
      const headLot = lots[0];
      seeded[child.id] = {
        stockSq: headLot?.stockSq ?? null,
        purchaseLotNo: record?.purchaseLotNo || headLot?.lotNo || "",
        stockLotNo: record?.purchaseLotNo || headLot?.lotNo || "",
        inputQty: record ? record.inputQty : child.reqQty,
      };
    }
    setDraftMap(seeded);
  }, [activeRow?.id, savedRecords, stockIndex]);

  const overallStatus = useMemo(
    () => summarizeFeedStatus(Array.from(savedRecords.values())),
    [savedRecords]
  );
  // 확정 또는 PLC 자동 상태면 입력을 잠근다
  const inputLocked = overallStatus === "CONFIRMED" || overallStatus === "PLC_AUTO";

  const patchDraft = (childId: string, patch: Partial<MaterialInputDraft>) => {
    setDraftMap((prev) => ({ ...prev, [childId]: { ...prev[childId], ...patch } }));
  };

  const resetFilters = () => {
    setWorkDate(format(new Date(), "yyyy-MM-dd"));
    setActiveLine("all");
    setNotice(null);
  };

  const submitDraft = async () => {
    if (!activeRow || inputLocked || working) return;
    const items = activeRow.children
      .map((child) => {
        const draft = draftMap[child.id];
        if (!draft || !draft.stockSq || !(draft.inputQty > 0)) return null;
        return {
          materialStockSq: draft.stockSq,
          materialItemSq: child.materialItemSq,
          materialItemCode: child.materialCode,
          materialItemName: child.materialName,
          purchaseLotNo: draft.purchaseLotNo,
          stockLotNo: draft.stockLotNo,
          calculatedQty: child.reqQty,
          inputQty: draft.inputQty,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    if (items.length === 0) {
      setNotice({ kind: "err", msg: "투입할 LOT과 실투입량을 입력하세요." });
      return;
    }
    setWorking(true);
    setNotice(null);
    try {
      await saveMaterialInputRecords({
        workOrderSq: activeRow.workOrderSq,
        productionLotNo: activeRow.productionLotNo,
        lineName: activeRow.lineName,
        productItemCode: activeRow.prodCode,
        productItemName: activeRow.prodName,
        items,
      });
      await reloadSavedRecords(activeRow.workOrderSq);
      setNotice({ kind: "ok", msg: "원료투입이 임시저장(예약)되었습니다." });
    } catch {
      setNotice({ kind: "err", msg: "저장에 실패했습니다. 다시 시도하세요." });
    } finally {
      setWorking(false);
    }
  };

  const finalizeFeed = async () => {
    if (!activeRow || inputLocked || working) return;
    if (savedRecords.size === 0) {
      setNotice({ kind: "err", msg: "먼저 임시저장 후 확정하세요." });
      return;
    }
    setWorking(true);
    setNotice(null);
    try {
      await confirmMaterialInput(activeRow.workOrderSq);
      await reloadSavedRecords(activeRow.workOrderSq);
      setNotice({ kind: "ok", msg: "원료투입이 확정되어 재고에서 차감되었습니다." });
    } catch {
      setNotice({ kind: "err", msg: "확정에 실패했습니다. 다시 시도하세요." });
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Header
        helpKey="op-recipe-standard"
        showBackButton={true}
        onBackClick={onBack}
        showResetButton={true}
        onResetClick={resetFilters}
      />

      <div className="p-5 flex flex-col flex-1 gap-5 max-w-[1400px] w-full mx-auto">
        <h1 className="text-3xl font-extrabold text-slate-800 text-center">원료투입</h1>

        {/* 작업일 + 라인 필터 */}
        <div className="flex gap-3 flex-wrap items-center">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold">작업일</span>
            <input
              className="border border-slate-300 px-4 py-3 rounded-xl bg-white text-lg min-w-[170px] shadow-sm"
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-[260px] overflow-x-auto">
            <button
              className={`px-5 py-3 rounded-xl text-lg font-bold whitespace-nowrap transition ${
                activeLine === "all" ? "bg-slate-800 text-white shadow" : "bg-white text-slate-600 border border-slate-300"
              }`}
              onClick={() => setActiveLine("all")}
            >
              전체
            </button>
            {lineNameChoices.map((name) => (
              <button
                key={name}
                className={`px-5 py-3 rounded-xl text-lg font-bold whitespace-nowrap transition ${
                  activeLine === name ? "bg-slate-800 text-white shadow" : "bg-white text-slate-600 border border-slate-300"
                }`}
                onClick={() => setActiveLine(name)}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* 작업지시 선택 영역 */}
        <OrderPickerStrip orders={visibleRows} activeId={activeRowId} onPick={setActiveRowId} />

        {/* 선택된 작업지시의 실투입 패널 */}
        {activeRow && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col flex-1 overflow-hidden">
            {/* 패널 상단 헤더 */}
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center rounded-lg bg-slate-800 text-white px-3 py-1 font-bold">
                  {activeRow.lineName || "-"}
                </span>
                <span className="text-xl font-bold text-slate-800">{activeRow.prodName || "-"}</span>
                <span className="font-mono text-blue-700 font-bold">{activeRow.prodCode}</span>
                {activeRow.productionLotNo && (
                  <span className="text-sm text-slate-500">생산LOT {activeRow.productionLotNo}</span>
                )}
              </div>
              <FeedStatusBadge status={overallStatus} />
            </div>

            {/* 자재별 투입 카드 목록 */}
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {activeRow.children.length === 0 ? (
                <div className="py-10 text-center text-slate-400">등록된 레시피 소재가 없습니다.</div>
              ) : (
                activeRow.children.map((child) => (
                  <MaterialFeedCard
                    key={child.id}
                    material={child}
                    draft={draftMap[child.id] || { stockSq: null, purchaseLotNo: "", stockLotNo: "", inputQty: 0 }}
                    record={savedRecords.get(child.materialItemSq)}
                    lotOptions={stockIndex.get(child.materialCode) || []}
                    locked={inputLocked}
                    onDraftChange={patchDraft}
                  />
                ))
              )}
            </div>

            {/* 하단 액션 바 */}
            <div className="border-t border-slate-100 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="min-h-[24px]">
                {notice ? (
                  <span className={`font-semibold ${notice.kind === "ok" ? "text-emerald-600" : "text-rose-600"}`}>
                    {notice.msg}
                  </span>
                ) : (
                  inputLocked && (
                    <span className="text-slate-400">확정된 작업지시는 수정할 수 없습니다.</span>
                  )
                )}
              </div>
              <div className="flex gap-3">
                <button
                  className="px-7 py-3 rounded-xl text-lg font-bold bg-white border-2 border-slate-300 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                  disabled={inputLocked || working}
                  onClick={submitDraft}
                >
                  임시저장
                </button>
                <button
                  className="px-8 py-3 rounded-xl text-lg font-bold bg-blue-600 text-white shadow disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700"
                  disabled={inputLocked || working}
                  onClick={finalizeFeed}
                >
                  투입확정
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
