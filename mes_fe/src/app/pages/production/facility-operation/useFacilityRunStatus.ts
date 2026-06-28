/** 설비가동현황 데이터 적재·필터·클라이언트 페이징을 묶은 화면 전용 훅. */
import { useEffect, useMemo, useState } from "react";
import * as workResultApi from "../../../api/workResultApi";
import {
  composeSegmentRows,
  makeTypeNameResolver,
  type RunSegmentRow,
} from "./runStatusHelpers";

/** 공통정보의 상세항목 목록을 항목명으로 가져오는 헬퍼(지연 로드). */
const fetchCommonDetailNames = async (itemName: string): Promise<string[]> => {
  const { fetchDetailContentsByItemName } = await import("../../../api/commonInfoApi");
  return fetchDetailContentsByItemName(itemName);
};

export function useFacilityRunStatus() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedLine, setSelectedLine] = useState("");

  const [segmentRows, setSegmentRows] = useState<RunSegmentRow[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [lineChoices, setLineChoices] = useState<string[]>([]);
  const [knownDowntimeTypes, setKnownDowntimeTypes] = useState<string[]>([]);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  // 라인 선택지를 공통정보에서 채운다.
  const refreshLineChoices = async () => {
    try {
      setLineChoices(await fetchCommonDetailNames("라인구분"));
    } catch (error) {
      console.error("라인구분 옵션 로드 실패:", error);
    }
  };

  // 비가동유형 별칭 해석에 쓸 동적 목록을 채운다. 실패해도 표시명 매핑에만 영향이라 무시.
  const refreshDowntimeTypes = async () => {
    try {
      const types = await fetchCommonDetailNames("비가동유형");
      if (types.length > 0) setKnownDowntimeTypes(types);
    } catch {
      // 무시: 별칭표/부분일치로 폴백 가능
    }
  };

  const fetchSegments = async (dynamicTypes: string[]) => {
    try {
      setIsFetching(true);
      const list = await workResultApi.fetchEquipmentDowntimeRecords();
      const resolver = makeTypeNameResolver(dynamicTypes);
      setSegmentRows(composeSegmentRows(list, resolver));
    } catch (error) {
      console.error("데이터 로드 실패:", error);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    (async () => {
      let dynamicTypes: string[] = [];
      // 라인 목록과 비가동유형 목록은 서로 독립적이라 동시에 조회한다.
      // (비가동유형 실패는 별칭표/부분일치로 폴백 가능하므로 빈 배열로 흘려보낸다)
      const [, types] = await Promise.all([
        refreshLineChoices(),
        fetchCommonDetailNames("비가동유형").catch(() => [] as string[]),
      ]);
      if (types.length > 0) {
        dynamicTypes = types;
        setKnownDowntimeTypes(types);
      }
      await fetchSegments(dynamicTypes);
    })();
    // 최초 1회만 초기 적재
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleRows = useMemo(
    () =>
      segmentRows.filter((r) => {
        if (dateFrom && r.workDate < dateFrom) return false;
        if (dateTo && r.workDate > dateTo) return false;
        if (selectedLine && r.lineName !== selectedLine) return false;
        return true;
      }),
    [segmentRows, dateFrom, dateTo, selectedLine],
  );

  const totalElements = visibleRows.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
  const safePage = Math.min(pageIndex, totalPages - 1);
  const offset = safePage * pageSize;
  const pageRows = visibleRows
    .slice(offset, offset + pageSize)
    .map((r, idx) => ({ ...r, no: String(offset + idx + 1) }));

  return {
    // 검색 상태
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    selectedLine, setSelectedLine,
    lineChoices,
    // 데이터
    isFetching,
    visibleRows,
    pageRows,
    // 페이징
    pagination: {
      page: safePage,
      size: pageSize,
      totalElements,
      totalPages,
      onPageChange: (p: number) => setPageIndex(p),
      onSizeChange: (s: number) => { setPageSize(s); setPageIndex(0); },
    },
    resetToFirstPage: () => setPageIndex(0),
    // 미사용이지만 향후 수동 갱신용으로 노출
    refreshDowntimeTypes,
    knownDowntimeTypes,
  };
}
