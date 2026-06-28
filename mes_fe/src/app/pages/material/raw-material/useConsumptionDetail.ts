/** [원소재투입분석상세] 라인·날짜·LOT 선택에 따른 레시피 대비 PLC 투입 분석 훅. */
import { useEffect, useMemo, useState } from "react";
import * as plcRawApi from "../../../api/plcRawApi";
import * as workOrderApi from "../../../api/workOrderApi";
import * as bomApi from "../../../api/bomApi";
import { ConsumptionTab, resolveTodayKst } from "./consumptionTypes";
import { LineOption } from "./useLineMachineOptions";

export interface DetailMaterial {
  label: string;
  materialCode: string;
  materialName: string;
  ratio: number;
  basisQty: number;
  requiredQty: number;
  feederKey: string;
}

export function useConsumptionDetail(activeTab: ConsumptionTab, lineList: LineOption[]) {
  const [lineCode, setLineCode] = useState("");
  const [targetDate, setTargetDate] = useState(resolveTodayKst());
  const [lotChoices, setLotChoices] = useState<workOrderApi.WorkOrderRes[]>([]);
  const [chosenLot, setChosenLot] = useState<workOrderApi.WorkOrderRes | null>(null);
  const [recipeList, setRecipeList] = useState<bomApi.BomRes[]>([]);
  const [rawInWindow, setRawInWindow] = useState<plcRawApi.PlcRawRes[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // 상세 탭 첫 진입 시 라인 기본값 채움
  useEffect(() => {
    if (activeTab === "input-analysis-detail" && !lineCode && lineList.length > 0) {
      setLineCode(lineList[0].name);
    }
  }, [activeTab, lineList, lineCode]);

  // 라인·날짜가 정해지면 그 날 그 라인의 작업지시 LOT 목록 로드
  useEffect(() => {
    if (activeTab !== "input-analysis-detail") return;
    if (!lineCode || !targetDate) {
      setLotChoices([]);
      setChosenLot(null);
      return;
    }
    (async () => {
      try {
        // 작업지시·작업시작·작업완료 중 하나라도 그 날짜에 해당하는 LOT
        const list = await workOrderApi.fetchWorkOrderListByLineAndDate({
          lineName: lineCode,
          date: targetDate,
        });
        const withLot = list.filter((w) => w.lotNo);
        setLotChoices(withLot);
        if (withLot.length === 1) {
          setChosenLot(withLot[0]);
        } else if (withLot.length === 0) {
          setChosenLot(null);
        } else if (!withLot.some((w) => w.lotNo === chosenLot?.lotNo)) {
          setChosenLot(null);
        }
      } catch (err) {
        console.error("[원소재투입분석상세] LOT 목록 로드 실패:", err);
        setLotChoices([]);
        setChosenLot(null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, lineCode, targetDate]);

  // LOT 확정 시 레시피 기준과 PLC raw를 동시에 가져오고, 작업 시간 구간으로 PLC 필터
  useEffect(() => {
    if (!chosenLot) {
      setRecipeList([]);
      setRawInWindow([]);
      return;
    }
    (async () => {
      try {
        setDetailLoading(true);
        const [recipe, raw] = await Promise.all([
          bomApi.fetchBomList({ productItemSq: chosenLot.itemSq }),
          plcRawApi.loadPlcRawSamples({
            lineCode,
            dateFrom: targetDate,
            dateTo: targetDate,
          }),
        ]);
        setRecipeList(recipe);
        // 작업시작~작업종료 사이의 PLC만 노출. 대기 LOT은 workStartTime이 null이라 빈 결과.
        // LocalDateTime 직렬화 차이("T" vs 공백)로 문자열 비교가 깨질 수 있어 ms 숫자 비교 사용.
        const startMs = chosenLot.workStartTime ? new Date(chosenLot.workStartTime).getTime() : NaN;
        const endMs = chosenLot.workEndTime ? new Date(chosenLot.workEndTime).getTime() : NaN;
        const within = Number.isFinite(startMs)
          ? raw.filter((r) => {
              if (!r.collectedDt) return false;
              const t = new Date(r.collectedDt).getTime();
              if (!Number.isFinite(t)) return false;
              if (t < startMs) return false;
              if (Number.isFinite(endMs) && t > endMs) return false;
              return true;
            })
          : [];
        setRawInWindow(within);
      } catch (err) {
        console.error("[원소재투입분석상세] 레시피/PLC 로드 실패:", err);
        setRecipeList([]);
        setRawInWindow([]);
      } finally {
        setDetailLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosenLot]);

  // 작업지시 입력 중량(생산관리자 입력값, g)
  const totalWeight = useMemo(() => Number(chosenLot?.plcWeight) || 0, [chosenLot]);

  // 레시피 자재: 코드순 정렬 + A/B/C 라벨 + 호기 매칭 + 표준중량(g) 산출
  // 표준중량(g) = 입력 전체중량(g) × 표준비율(%) / 100
  const materials = useMemo<DetailMaterial[]>(() => {
    const sorted = recipeList
      .filter((r) => r.useYn !== false)
      .sort((a, b) => (a.materialCode || "").localeCompare(b.materialCode || ""));
    return sorted.map((r, i) => {
      const ratio = Number(r.ratio) || 0;
      const basisQty = Number(r.quantity) || 0; // 평량(g/m²) — 참고 표시용
      const digits = r.plcMachineNo ? r.plcMachineNo.replace(/\D/g, "") : "";
      return {
        label: String.fromCharCode(65 + i), // A, B, C...
        materialCode: r.materialCode,
        materialName: r.materialName,
        ratio,
        basisQty,
        requiredQty: Math.round((totalWeight * ratio) / 100),
        feederKey: digits ? `F${digits}` : "",
      };
    });
  }, [recipeList, totalWeight]);

  // 회차별 행: collectedDt 그룹핑 후 과투입량/과투입율 2-pass 산출
  const detailRows = useMemo(() => {
    if (materials.length === 0) return [];
    const grouped = new Map<string, Record<string, number>>();
    rawInWindow.forEach((r) => {
      if (!grouped.has(r.collectedDt)) grouped.set(r.collectedDt, {});
      grouped.get(r.collectedDt)![r.feederNo] = r.value;
    });
    const ordered = Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const rounds = ordered.length || 1;

    return ordered.map(([collectedDt, feeders], idx) => {
      const row: Record<string, any> = { no: idx + 1, collectedDt };
      let actualSum = 0;
      // 1차: 실제 투입량 수집 + 합계
      materials.forEach((m) => {
        const actual = typeof feeders[m.feederKey] === "number" ? feeders[m.feederKey] : 0;
        row[`${m.label}_actual`] = actual;
        actualSum += actual;
      });
      // 2차: 회차당 평균표준 대비 과투입량, 회차 내 비중% 산출
      let stdPerRoundSum = 0;
      materials.forEach((m) => {
        const actual = row[`${m.label}_actual`];
        const stdPerRound = m.requiredQty / rounds;
        row[`${m.label}_over`] = actual - stdPerRound;
        row[`${m.label}_rate`] = actualSum > 0 ? (actual / actualSum) * 100 : 0;
        stdPerRoundSum += stdPerRound;
      });
      row.sumActual = actualSum;
      row.sumOver = actualSum - stdPerRoundSum;
      row.sumRate = stdPerRoundSum > 0 ? (row.sumOver / stdPerRoundSum) * 100 : 0;
      return row;
    });
  }, [rawInWindow, materials]);

  // 하단 통계: 총횟수, 소재별 총중량/평균과투입율, 전체총중량
  const detailTotals = useMemo(() => {
    const totals: Record<string, number> = { count: detailRows.length };
    materials.forEach((m) => {
      const sumActual = detailRows.reduce((s, r) => s + (Number(r[`${m.label}_actual`]) || 0), 0);
      const avgRate =
        detailRows.length > 0
          ? detailRows.reduce((s, r) => s + (Number(r[`${m.label}_rate`]) || 0), 0) / detailRows.length
          : 0;
      totals[`${m.label}_total`] = Math.round(sumActual * 100) / 100;
      totals[`${m.label}_avgRate`] = Math.round(avgRate * 100) / 100;
    });
    const grand = detailRows.reduce((s, r) => s + (Number(r.sumActual) || 0), 0);
    totals.grandTotal = Math.round(grand * 100) / 100;
    return totals;
  }, [detailRows, materials]);

  // 레시피 기준 표 합계행: 표준비율 합, 평량 합, 표준중량(g) 합
  const recipeTotals = useMemo(() => {
    const ratioSum = materials.reduce((s, m) => s + m.ratio, 0);
    const basisSum = materials.reduce((s, m) => s + m.basisQty, 0);
    const weightSum = materials.reduce((s, m) => s + m.requiredQty, 0);
    return {
      ratio: Math.round(ratioSum * 100) / 100,
      basis: Math.round(basisSum * 100) / 100,
      weight: Math.round(weightSum * 100) / 100,
    };
  }, [materials]);

  return {
    lineCode,
    setLineCode,
    targetDate,
    setTargetDate,
    lotChoices,
    chosenLot,
    setChosenLot,
    detailLoading,
    totalWeight,
    materials,
    detailRows,
    detailTotals,
    recipeTotals,
  };
}
