/** 부적합 목록 화면의 상태/조회/필터/페이징을 한데 묶은 전용 훅. */
import { useState, useEffect } from "react";
import { useSessionState } from "../../../hooks/useSessionState";
import { useClientPagedList } from "../../../hooks/useClientPagedList";
import * as ncrApi from "../../../api/nonConformanceApi";
import * as commonInfoApi from "../../../api/commonInfoApi";
import { NonConformanceData } from "@/types/quality/nonConformance.interface";
import { applyBoardFilter, mapToBoardRows } from "./ncrBoardSupport";

export function useNcrBoard() {
  // 검색 패널 입력값(세션 유지)
  const [dateFrom, setDateFrom] = useSessionState("non-conformance:dateFrom", "");
  const [dateTo, setDateTo] = useSessionState("non-conformance:dateTo", "");
  const [itemCode, setItemCode] = useSessionState("non-conformance:itemCode", "");
  const [itemName, setItemName] = useSessionState("non-conformance:itemName", "");
  const [category, setCategory] = useSessionState("non-conformance:category", "");
  const [defectType, setDefectType] = useSessionState("non-conformance:defectType", "");

  // 부적합유형 셀렉트 항목
  const [defectTypeOptions, setDefectTypeOptions] = useState<string[]>([]);
  // 조회 진행 여부
  const [isFetching, setIsFetching] = useState(false);
  // 서버에서 받아온 전체 행
  const [rows, setRows] = useState<NonConformanceData[]>([]);

  // 부적합 전체 목록을 가져와 화면용으로 정규화
  const reloadRows = async () => {
    try {
      setIsFetching(true);
      const list = await ncrApi.fetchNonConformanceRecords({});
      setRows(mapToBoardRows(list));
    } catch (err) {
      console.error("부적합 목록을 불러오지 못했습니다:", err);
    } finally {
      setIsFetching(false);
    }
  };

  // 최초 진입 시 목록 + 부적합유형 코드 동시 로딩
  useEffect(() => {
    reloadRows();
    commonInfoApi
      .fetchDetailContentsByItemName("부적합유형")
      .then(setDefectTypeOptions)
      .catch(() => setDefectTypeOptions([]));
  }, []);

  // 검색 조건을 반영한 결과 집합
  const matchedRows = applyBoardFilter(rows, {
    dateFrom,
    dateTo,
    itemCode,
    itemName,
    category,
    defectType,
  });

  const { pagedRows, baseNo, pagination } = useClientPagedList(matchedRows);
  // 현재 페이지 행에 연속 번호 부여
  const numberedRows = pagedRows.map((row, idx) => ({ ...row, no: String(baseNo + idx + 1) }));

  return {
    filters: {
      dateFrom,
      setDateFrom,
      dateTo,
      setDateTo,
      itemCode,
      setItemCode,
      itemName,
      setItemName,
      category,
      setCategory,
      defectType,
      setDefectType,
    },
    defectTypeOptions,
    isFetching,
    matchedRows,
    numberedRows,
    pagination,
  };
}
