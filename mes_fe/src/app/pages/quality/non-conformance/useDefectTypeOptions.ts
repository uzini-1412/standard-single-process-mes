/** 공통정보에서 '부적합유형' 코드 목록을 받아오는 폼 공용 훅. */
import { useState, useEffect } from "react";
import * as commonInfoApi from "../../../api/commonInfoApi";

export function useDefectTypeOptions(): string[] {
  const [options, setOptions] = useState<string[]>([]);

  // 마운트 시 한 번 부적합유형 코드 조회, 실패하면 빈 배열 유지
  useEffect(() => {
    commonInfoApi
      .fetchDetailContentsByItemName("부적합유형")
      .then(setOptions)
      .catch(() => setOptions([]));
  }, []);

  return options;
}
