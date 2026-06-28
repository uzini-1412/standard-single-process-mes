// 작업 마무리 화면의 상태/효과/제출 흐름을 한곳에 모은 커스텀 훅.
// 화면 컴포넌트는 이 훅이 돌려주는 값과 핸들러만 사용한다.
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { updateWorkOrderStatus } from "../../../../utils/api/workOrderApi";
import { apiRequest } from "../../../../utils/api/config";
import { showSuccess, showWarning, showError } from "@/utils/toast";
import {
  loadStorageLocation,
  loadDowntimeSummary,
  loadInspectSummary,
} from "./computeWrapUpData";

interface UseProductionWrapUpArgs {
  onHome: () => void;
  orderNumber: string;
  workOrderData?: any | null;
}

export function useProductionWrapUp({ onHome, orderNumber, workOrderData }: UseProductionWrapUpArgs) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // 생산현황
  const [productCategory, setProductCategory] = useState("");
  const [lineCategory, setLineCategory] = useState("");
  const [workDate, setWorkDate] = useState("");
  const [itemCode, setItemCode] = useState("");
  const [itemName, setItemName] = useState("");
  const [orderQty, setOrderQty] = useState("0");
  const [productionQty, setProductionQty] = useState("0");
  const [lotNo, setLotNo] = useState("");
  const [storageLocation, setStorageLocation] = useState("");

  // 가동현황
  const [operationTime, setOperationTime] = useState("");
  const [nonOperationTime, setNonOperationTime] = useState("");
  const [downtimeTypes, setDowntimeTypes] = useState<{ label: string; value: string }[]>([]);

  // 품질현황
  const [inspectionQty, setInspectionQty] = useState("0");
  const [goodQty, setGoodQty] = useState("0");
  const [defectQty, setDefectQty] = useState("0");
  const [defectRate, setDefectRate] = useState("0");
  const [appearanceDefect, setAppearanceDefect] = useState("0");
  const [dimensionDefect, setDimensionDefect] = useState("0");

  // 요약
  const [productionAchievementRate, setProductionAchievementRate] = useState("0");
  const [operationRate, setOperationRate] = useState("0");
  const [goodRate, setGoodRate] = useState("0");

  // 1초마다 헤더 시계 갱신
  useEffect(() => {
    const ticker = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(ticker);
  }, []);

  // 같은 작업이면(workOrderSq 동일) 부모가 새 객체를 줘도 다시 불러오지 않음
  useEffect(() => {
    if (workOrderData) void hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrderData?.workOrderSq]);

  // 생산량은 양품 + 불량의 합
  useEffect(() => {
    const good = parseFloat(goodQty) || 0;
    const defect = parseFloat(defectQty) || 0;
    setProductionQty(String(good + defect));
  }, [goodQty, defectQty]);

  // 생산달성율 = 생산량 / 지시량
  useEffect(() => {
    const oq = parseFloat(orderQty) || 0;
    const pq = parseFloat(productionQty) || 0;
    setProductionAchievementRate(oq > 0 ? ((pq / oq) * 100).toFixed(2) : "0");
  }, [productionQty, orderQty]);

  // 불량률 / 양품율 = (불량 or 양품) / 생산량
  useEffect(() => {
    const pq = parseFloat(productionQty) || 0;
    const dq = parseFloat(defectQty) || 0;
    const gq = parseFloat(goodQty) || 0;
    setDefectRate(pq > 0 ? ((dq / pq) * 100).toFixed(2) : "0");
    setGoodRate(pq > 0 ? ((gq / pq) * 100).toFixed(2) : "0");
  }, [defectQty, goodQty, productionQty]);

  // 작업 데이터를 화면 상태로 채워 넣는다 (초기 로딩)
  const hydrate = async () => {
    if (!workOrderData) return;

    const currentItemCode = workOrderData.itemCode || "";
    const currentOrderQty = workOrderData.targetQty?.toString() || "0";

    setLineCategory(workOrderData.lineName || "");
    // 작업일은 완료 시점인 오늘로 둔다. 작업지시일(workOrderDate)은 전날일 수 있어 쓰지 않음.
    setWorkDate(format(new Date(), "yyyy-MM-dd"));
    setItemCode(currentItemCode);
    setItemName(workOrderData.itemName || "");
    setOrderQty(currentOrderQty);
    setGoodQty(currentOrderQty); // 양품 기본값 = 지시량
    setDefectQty("0"); // 불량 기본값 = 0
    setLotNo(workOrderData.productionLotNo || orderNumber || "");
    // 제품구분은 workOrder에 이미 들어 있으니 품목 조회 없이 바로 표시
    setProductCategory(workOrderData.itemType || "");

    // 보관위치 단건조회 결과를 상태에 반영
    const applyStorage = async () => {
      const { storageLocation: sl } = await loadStorageLocation(workOrderData.itemSq);
      if (sl) setStorageLocation(sl);
    };

    // 비가동 집계 결과를 상태에 반영
    const applyDowntime = async () => {
      const r = await loadDowntimeSummary(workOrderData);
      setNonOperationTime(r.nonOperationTime);
      setDowntimeTypes(r.downtimeTypes);
      if (r.operationTime !== undefined) setOperationTime(r.operationTime);
      if (r.operationRate !== undefined) setOperationRate(r.operationRate);
    };

    // 검사/불량 집계 결과를 상태에 반영
    const applyInspect = async () => {
      const r = await loadInspectSummary(workOrderData, currentOrderQty);
      if (r.inspectionQty !== undefined) setInspectionQty(r.inspectionQty);
      if (r.appearanceDefect !== undefined) setAppearanceDefect(r.appearanceDefect);
      if (r.dimensionDefect !== undefined) setDimensionDefect(r.dimensionDefect);
      if (r.defectQty !== undefined) setDefectQty(r.defectQty);
      if (r.goodQty !== undefined) setGoodQty(r.goodQty);
    };

    // 세 조회는 서로 독립적이라 병렬로 돌려 첫 렌더 지연을 줄인다
    await Promise.all([applyStorage(), applyDowntime(), applyInspect()]);
  };

  // 불량수량 입력 시: 값 저장 후 양품수량을 (지시량 - 불량)으로 다시 계산
  const onDefectQtyChange = (v: string) => {
    setDefectQty(v);
    const d = parseFloat(v) || 0;
    const oq = parseFloat(orderQty) || 0;
    setGoodQty(String(Math.max(0, oq - d)));
  };

  // 외관/치수 중 하나가 바뀌면 둘의 합을 불량으로, 양품을 (지시량 - 불량)으로 갱신
  const recomputeFromDefectParts = (appear: number, dimens: number) => {
    const newDefect = appear + dimens;
    setDefectQty(String(newDefect));
    const oq = parseFloat(orderQty) || 0;
    setGoodQty(String(Math.max(0, oq - newDefect)));
  };

  const onAppearanceDefectChange = (v: string) => {
    setAppearanceDefect(v);
    recomputeFromDefectParts(parseFloat(v) || 0, parseFloat(dimensionDefect) || 0);
  };

  const onDimensionDefectChange = (v: string) => {
    setDimensionDefect(v);
    recomputeFromDefectParts(parseFloat(appearanceDefect) || 0, parseFloat(v) || 0);
  };

  // 작업완료 확인: 입력 검증 → 실적 저장 → 상태 COMPLETED 전환
  const submitWrapUp = async () => {
    if (!workOrderData?.workOrderSq) {
      showError("작업 데이터를 찾을 수 없습니다.");
      return;
    }

    if (goodQty === "" || goodQty === null || goodQty === undefined) {
      showWarning("양품수량은 필수 입력값입니다.");
      return;
    }
    if (defectQty === "" || defectQty === null || defectQty === undefined) {
      showWarning("불량수량은 필수 입력값입니다.");
      return;
    }

    const goodNum = parseInt(goodQty, 10) || 0;
    const defectNum = parseInt(defectQty, 10) || 0;
    const appearNum = parseInt(appearanceDefect, 10) || 0;
    const dimensNum = parseInt(dimensionDefect, 10) || 0;
    const orderNum = parseInt(orderQty, 10) || 0;

    if (appearNum + dimensNum !== defectNum) {
      showWarning(`외관불량(${appearNum}) + 치수불량(${dimensNum}) = ${appearNum + dimensNum}이 불량수량(${defectNum})과 일치하지 않습니다.`);
      return;
    }

    if (goodNum + defectNum > orderNum) {
      showWarning(`양품수량(${goodNum}) + 불량수량(${defectNum}) = ${goodNum + defectNum}이 작업지시량(${orderNum})을 초과할 수 없습니다.`);
      return;
    }

    try {
      // 작업실적(품질 포함) 저장. totalProdQty/goodQty/badQty는 백엔드 Integer라 정수화한다.
      const badQtyVal = parseInt(defectQty, 10) || 0;
      const goodQtyVal = parseInt(goodQty, 10) || 0;
      const prodQtyVal = parseInt(productionQty, 10) || 0;

      await apiRequest("/production/result/save", {
        method: "POST",
        body: JSON.stringify({
          workOrderSq: workOrderData.workOrderSq,
          workDate: workDate || format(new Date(), "yyyy-MM-dd"),
          lineSq: workOrderData.lineSq || null,
          lineName: workOrderData.lineName || lineCategory,
          itemSq: workOrderData.itemSq,
          endTime: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
          totalProdQty: prodQtyVal,
          goodQty: goodQtyVal,
          badQty: badQtyVal,
          appearanceDefect: appearanceDefect,
          dimensionDefect: dimensionDefect,
          details: (workOrderData.details || []).map((d: any, i: number) => {
            const w = Number(d.width || workOrderData.width || 0); // mm
            const l = Number(d.length || workOrderData.length || 0); // m
            // 평량(관리평량) 기반 중량 산출은 폐지됨. 중량은 더 이상 화면에서 계산하지 않는다.
            return {
              lotNo: d.lotNo || lotNo,
              rollNo: i + 1,
              prodWidth: w,
              prodLength: l,
              netWeight: 0,
              judgeCode: badQtyVal > 0 && i === 0 ? "NG" : "OK",
              defectType: badQtyVal > 0 && i === 0 ? (parseFloat(appearanceDefect) > 0 ? "외관불량" : "치수불량") : null,
            };
          }),
        }),
      });

      // 작업상태를 COMPLETED로 변경
      await updateWorkOrderStatus(workOrderData.workOrderSq, "COMPLETED");

      showSuccess("작업이 완료되었습니다.");
      onHome(); // 작업시작 화면으로 복귀
    } catch (error) {
      console.error("작업완료 등록 실패:", error);
      showError("작업완료 등록에 실패했습니다.");
    }
  };

  return {
    currentTime,
    productCategory,
    lineCategory,
    workDate,
    itemCode,
    itemName,
    orderQty,
    productionQty,
    lotNo,
    storageLocation,
    operationTime,
    nonOperationTime,
    downtimeTypes,
    inspectionQty,
    goodQty,
    defectQty,
    defectRate,
    appearanceDefect,
    dimensionDefect,
    productionAchievementRate,
    operationRate,
    goodRate,
    setGoodQty,
    onDefectQtyChange,
    onAppearanceDefectChange,
    onDimensionDefectChange,
    submitWrapUp,
  };
}
