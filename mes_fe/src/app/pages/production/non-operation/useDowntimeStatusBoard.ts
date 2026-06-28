/** 기간별비가동현황 데이터 집계·필터·클라이언트 페이징을 묶은 화면 전용 훅. */
import { useEffect, useMemo, useState } from "react";
import * as workResultApi from "../../../api/workResultApi";
import type { NonOperationData } from "@/types/production/nonoperation.interface";
import {
  aggregateDowntimeBoard,
  FALLBACK_DOWNTIME_TYPES,
  makeTypeNameResolver,
} from "./downtimeBoardHelpers";

/** 공통정보 상세항목명을 항목명 기준으로 지연 조회한다. */
const fetchCommonDetailNames = async (itemName: string): Promise<string[]> => {
  const { fetchDetailContentsByItemName } = await import("../../../api/commonInfoApi");
  return fetchDetailContentsByItemName(itemName);
};

export function useDowntimeStatusBoard() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedLine, setSelectedLine] = useState("");

  const [boardRows, setBoardRows] = useState<NonOperationData[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [lineChoices, setLineChoices] = useState<string[]>([]);
  // 컬럼 헤더(비가동유형시간 그룹)로 쓰일 동적 유형 목록.
  const [downtimeTypeHeaders, setDowntimeTypeHeaders] = useState<string[]>([]);

  // downtime은 프론트에서 그룹핑하므로 서버 페이징 대신 클라이언트 페이징을 쓴다.
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  const refreshLineChoices = async () => {
    try {
      setLineChoices(await fetchCommonDetailNames("라인구분"));
    } catch (error) {
      console.error("라인구분 옵션 로드 실패:", error);
    }
  };

  // 비가동유형 동적 목록을 채우고 그 값을 반환(집계 시 즉시 사용하기 위함).
  const resolveDowntimeTypeHeaders = async (): Promise<string[]> => {
    try {
      const types = await fetchCommonDetailNames("비가동유형");
      const resolved = types.length > 0 ? types : FALLBACK_DOWNTIME_TYPES;
      setDowntimeTypeHeaders(resolved);
      return resolved;
    } catch {
      setDowntimeTypeHeaders(FALLBACK_DOWNTIME_TYPES);
      return FALLBACK_DOWNTIME_TYPES;
    }
  };

  const fetchBoard = async (typeHeaders: string[]) => {
    try {
      setIsFetching(true);
      // 비가동 목록만 조회(작업 시작/종료 시각은 응답에 포함됨).
      const list = await workResultApi.fetchEquipmentDowntimeRecords();
      const resolver = makeTypeNameResolver(typeHeaders);
      setBoardRows(aggregateDowntimeBoard(list, resolver));
    } catch (error) {
      console.error("데이터 로드 실패:", error);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    (async () => {
      // 라인구분과 비가동유형 목록은 독립적이라 동시에 조회한다(집계는 비가동유형에 의존).
      const [, typeHeaders] = await Promise.all([
        refreshLineChoices(),
        resolveDowntimeTypeHeaders(),
      ]);
      await fetchBoard(typeHeaders);
    })();
    // 최초 1회만 초기 적재
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleRows = useMemo(
    () =>
      boardRows.filter((item) => {
        if (dateFrom && item.workDate < dateFrom) return false;
        if (dateTo && item.workDate > dateTo) return false;
        if (selectedLine && item.lineName !== selectedLine) return false;
        return true;
      }),
    [boardRows, dateFrom, dateTo, selectedLine],
  );

  const totalElements = visibleRows.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
  const safePage = Math.min(pageIndex, totalPages - 1);
  const offset = safePage * pageSize;
  // No. 컬럼은 페이지 기준으로 다시 매긴다.
  const pageRows = visibleRows
    .slice(offset, offset + pageSize)
    .map((item, idx) => ({ ...item, no: String(offset + idx + 1) }));

  return {
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    selectedLine, setSelectedLine,
    lineChoices,
    downtimeTypeHeaders,
    isFetching,
    visibleRows,
    pageRows,
    pagination: {
      page: safePage,
      size: pageSize,
      totalElements,
      totalPages,
      onPageChange: (p: number) => setPageIndex(p),
      onSizeChange: (s: number) => { setPageSize(s); setPageIndex(0); },
    },
    resetToFirstPage: () => setPageIndex(0),
  };
}
