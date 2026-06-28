/** [원소재사용현황] 공통정보 기반 라인구분·PLC호기 드롭다운 옵션을 마운트 시 1회 로드. */
import { useEffect, useState } from "react";
import * as commonInfoApi from "../../../api/commonInfoApi";

export interface LineOption {
  id: number;
  name: string;
}

export function useLineMachineOptions() {
  const [lineList, setLineList] = useState<LineOption[]>([]);
  const [machineNameList, setMachineNameList] = useState<string[]>([]);

  // 공통정보 "라인구분" 전체를 라인 드롭다운 옵션으로 사용
  useEffect(() => {
    commonInfoApi
      .fetchDetailContentValuesByItemName("라인구분")
      .then((opts) => setLineList(opts))
      .catch((err) => console.error("[원소재투입분석] 라인구분 로드 실패:", err));
  }, []);

  // 공통정보 "PLC호기"("1호기","2호기"...)를 호기 컬럼 매칭에 사용
  useEffect(() => {
    commonInfoApi
      .fetchDetailContentsByItemName("PLC호기")
      .then((opts) => setMachineNameList(opts))
      .catch((err) => console.error("[원소재투입분석] PLC호기 로드 실패:", err));
  }, []);

  return { lineList, machineNameList };
}
