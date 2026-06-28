/** 기간별불량현황 데이터 적재·필터·페이징을 한데 묶은 화면 전용 훅. */
import { useEffect, useMemo, useState } from "react";
import * as workResultApi from "../../../api/workResultApi";
import { ProductDefectData } from "@/types/production/defect.interface";
import {
  applyDefectFilter,
  DefectSearchState,
  EMPTY_DEFECT_SEARCH,
  FALLBACK_DEFECT_KINDS,
  mapSummaryRowToDefectData,
  sliceDefectPage,
} from "./defectBoardHelpers";

/** 공통정보 상세항목을 비동기로 끌어온다(라인구분/불량유형 공용). */
async function fetchCommonDetailList(itemName: string): Promise<string[]> {
  const { fetchDetailContentsByItemName } = await import("../../../api/commonInfoApi");
  return fetchDetailContentsByItemName(itemName);
}

export function useDefectBoard() {
  const [search, setSearch] = useState<DefectSearchState>(EMPTY_DEFECT_SEARCH);
  const [rawRows, setRawRows] = useState<ProductDefectData[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [lineChoices, setLineChoices] = useState<string[]>([]);
  const [defectKinds, setDefectKinds] = useState<string[]>([]);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  const patchSearch = (partial: Partial<DefectSearchState>) =>
    setSearch((prev) => ({ ...prev, ...partial }));

  /** 마스터 불량 집계를 다시 불러와 화면 행으로 환산한다. */
  const reloadRows = async () => {
    try {
      setIsFetching(true);
      const summaries = await workResultApi.fetchPeriodDefectSummary({
        dateFrom: search.dateFrom || undefined,
        dateTo: search.dateTo || undefined,
        itemCode: search.itemCode || undefined,
        itemName: search.itemName || undefined,
      });
      setRawRows(summaries.map(mapSummaryRowToDefectData));
    } catch (error) {
      console.error("불량 집계 조회 중 오류:", error);
    } finally {
      setIsFetching(false);
    }
  };

  // 최초 진입 시 본문/셀렉트 옵션을 함께 채운다.
  useEffect(() => {
    void reloadRows();

    void (async () => {
      try {
        setLineChoices(await fetchCommonDetailList("라인구분"));
      } catch (error) {
        console.error("라인구분 옵션 조회 실패:", error);
      }
    })();

    void (async () => {
      try {
        const kinds = await fetchCommonDetailList("불량유형");
        setDefectKinds(kinds.length > 0 ? kinds : FALLBACK_DEFECT_KINDS);
      } catch {
        setDefectKinds(FALLBACK_DEFECT_KINDS);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRows = useMemo(
    () => applyDefectFilter(rawRows, search),
    [rawRows, search],
  );

  const totalElements = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
  const safePageIndex = Math.min(pageIndex, totalPages - 1);
  const pagedRows = useMemo(
    () => sliceDefectPage(filteredRows, safePageIndex, pageSize),
    [filteredRows, safePageIndex, pageSize],
  );

  /** 검색 버튼: 첫 페이지로 되돌리고 재조회한다. */
  const runSearch = () => {
    setPageIndex(0);
    void reloadRows();
  };

  const pagination = {
    page: safePageIndex,
    size: pageSize,
    totalElements,
    totalPages,
    onPageChange: setPageIndex,
    onSizeChange: (next: number) => {
      setPageSize(next);
      setPageIndex(0);
    },
  };

  return {
    search,
    patchSearch,
    isFetching,
    lineChoices,
    defectKinds,
    filteredRows,
    pagedRows,
    pagination,
    runSearch,
  };
}
