/** [원소재투입분석] 라인·측정일 기준 PLC raw 조회 + 호기 컬럼/회차 행 가공 훅. */
import { useEffect, useMemo, useState } from "react";
import * as plcRawApi from "../../../api/plcRawApi";
import { ConsumptionTab, resolveTodayKst } from "./consumptionTypes";
import { LineOption } from "./useLineMachineOptions";

export function useConsumptionAnalysis(
  activeTab: ConsumptionTab,
  lineList: LineOption[],
  machineNameList: string[],
) {
  const [lineCode, setLineCode] = useState("");
  const [measureDate, setMeasureDate] = useState(resolveTodayKst());
  const [rawList, setRawList] = useState<plcRawApi.PlcRawRes[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisPage, setAnalysisPage] = useState(0);
  const [analysisSize, setAnalysisSize] = useState(50);

  // 라인 옵션이 준비되면 비어있던 선택값을 첫 항목으로 채움
  useEffect(() => {
    if (lineList.length > 0) setLineCode((prev) => prev || lineList[0].name);
  }, [lineList]);

  // 선택된 라인·측정일로 PLC raw 조회
  const reloadAnalysis = async () => {
    if (!lineCode) return;
    try {
      setAnalysisLoading(true);
      setAnalysisPage(0);
      const data = await plcRawApi.loadPlcRawSamples({
        lineCode,
        dateFrom: measureDate,
        dateTo: measureDate,
      });
      setRawList(data);
    } catch (error) {
      console.error("PLC raw 조회 실패:", error);
      setRawList([]);
    } finally {
      setAnalysisLoading(false);
    }
  };

  // 분석 탭 진입 또는 라인 변경 시 자동 1회 조회
  useEffect(() => {
    if (activeTab === "input-analysis" && lineCode) reloadAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, lineCode]);

  // 호기 컬럼: 공통정보 호기명을 "F{n}"으로 변환 + 응답에 등장한 미등록 호기도 합쳐 정렬
  const feederKeys = useMemo(() => {
    const acc = new Set<string>();
    machineNameList.forEach((name) => {
      const digits = name.replace(/\D/g, "");
      if (digits) acc.add(`F${digits}`);
    });
    rawList.forEach((r) => {
      if (r.feederNo) acc.add(r.feederNo);
    });
    return Array.from(acc).sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, ""), 10) || 0;
      const nb = parseInt(b.replace(/\D/g, ""), 10) || 0;
      return na - nb;
    });
  }, [rawList, machineNameList]);

  // 같은 측정시각(collectedDt)의 여러 호기 값을 한 행으로 묶음
  const analysisRows = useMemo<Record<string, any>[]>(() => {
    const grouped = new Map<string, Record<string, any>>();
    rawList.forEach((r) => {
      if (!grouped.has(r.collectedDt)) {
        grouped.set(r.collectedDt, { collectedDt: r.collectedDt });
      }
      grouped.get(r.collectedDt)![r.feederNo] = r.value;
    });
    return Array.from(grouped.values()).map((row, i) => ({ ...row, no: i + 1 }));
  }, [rawList]);

  // No. / 측정시간 + 호기 동적 컬럼
  const analysisColumns = useMemo(() => {
    const head = [
      { key: "no", label: "No.", width: "60px" },
      { key: "collectedDt", label: "측정시간", width: "180px" },
    ];
    const feeders = feederKeys.map((f) => ({
      key: f,
      label: `${f.replace(/\D/g, "")}호기`,
      width: "100px",
    }));
    return [...head, ...feeders];
  }, [feederKeys]);

  return {
    lineCode,
    setLineCode,
    measureDate,
    setMeasureDate,
    analysisLoading,
    analysisPage,
    setAnalysisPage,
    analysisSize,
    setAnalysisSize,
    feederKeys,
    analysisRows,
    analysisColumns,
    reloadAnalysis,
  };
}
