/** [자재불량현황] 목록 조회·정렬·페이징·필터 상태를 묶은 커스텀 훅. */
import { useCallback, useEffect, useMemo, useState } from "react";
import * as incomingInspectionApi from "../../../api/incomingInspectionApi";
import { MaterialDefectData } from "@/types/material/defect.interface";
import { showWarning, showError } from "@/app/utils/toast";
import { exportDefectExcel } from "./defectBoardExcel";
import {
  DefectFilterState,
  DefectSortOrder,
  EMPTY_DEFECT_FILTER,
  composeSearchParams,
  mapDefectRow,
} from "./defectBoardHelpers";

export function useDefectBoard() {
  const [rows, setRows] = useState<MaterialDefectData[]>([]);
  const [busy, setBusy] = useState(false);

  // 입력란에 타이핑 중인 미적용 값
  const [itemCodeInput, setItemCodeInput] = useState("");
  const [itemNameInput, setItemNameInput] = useState("");
  const [lotNoInput, setLotNoInput] = useState("");
  const [judgmentInput, setJudgmentInput] = useState("전체");

  // 검색 버튼으로 확정된 조회 조건
  const [activeFilter, setActiveFilter] = useState<DefectFilterState>(EMPTY_DEFECT_FILTER);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [orderField, setOrderField] = useState<string>("");
  const [orderDir, setOrderDir] = useState<DefectSortOrder>("DESC");

  // 서버에서 한 페이지 분량을 가져와 표시 행으로 변환
  const fetchPage = useCallback(async () => {
    try {
      setBusy(true);
      const query: incomingInspectionApi.DefectListSearchParams = {
        ...composeSearchParams(activeFilter),
        page: pageIndex,
        size: pageSize,
      };
      if (orderField) {
        query.sortField = orderField;
        query.sortDirection = orderDir;
      }
      const res = await incomingInspectionApi.fetchDefectListPaged(query);
      const offset = res.page * res.size;
      setRows(res.content.map((item, i) => mapDefectRow(item, offset + i + 1)));
      setTotalCount(res.totalElements);
      setPageCount(res.totalPages);
    } catch (err) {
      console.error("데이터 로드 실패:", err);
      showError("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }, [pageIndex, pageSize, orderField, orderDir, activeFilter]);

  useEffect(() => {
    void fetchPage();
  }, [fetchPage]);

  // 검색 실행: 입력값을 trim 하여 조회 조건으로 확정하고 첫 페이지로 이동
  const applySearch = useCallback(() => {
    setActiveFilter({
      itemCode: itemCodeInput.trim(),
      itemName: itemNameInput.trim(),
      lotNo: lotNoInput.trim(),
      inspectResult: judgmentInput,
    });
    setPageIndex(0);
  }, [itemCodeInput, itemNameInput, lotNoInput, judgmentInput]);

  // 동일 컬럼 재클릭 시 방향 토글, 다른 컬럼이면 DESC로 시작
  const toggleSort = useCallback(
    (key: string) => {
      if (orderField === key) {
        setOrderDir((prev) => (prev === "ASC" ? "DESC" : "ASC"));
      } else {
        setOrderField(key);
        setOrderDir("DESC");
      }
      setPageIndex(0);
    },
    [orderField],
  );

  // 검사성적서 파일 내려받기 (경로 없으면 경고)
  const downloadAttachment = useCallback(async (filePath: string, fileName: string) => {
    if (!filePath || filePath === "-") {
      showWarning("다운로드할 파일이 없습니다.");
      return;
    }
    try {
      await incomingInspectionApi.downloadInspectFile(filePath, fileName);
    } catch (err) {
      console.error("파일 다운로드 실패:", err);
      showError("파일 다운로드 중 오류가 발생했습니다.");
    }
  }, []);

  // 현재 조건의 전체 데이터를 받아 엑셀로 저장
  const exportToExcel = useCallback(async () => {
    try {
      setBusy(true);
      const all = await incomingInspectionApi.fetchDefectListAll(composeSearchParams(activeFilter));
      if (all.length === 0) {
        showWarning("출력할 데이터가 없습니다.");
        return;
      }
      exportDefectExcel(all.map((item, i) => mapDefectRow(item, i + 1)));
    } catch (err) {
      console.error("엑셀 출력 실패:", err);
      showError("엑셀 출력 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }, [activeFilter]);

  // 페이지 수가 줄어든 경우 범위를 벗어나지 않도록 보정
  const clampedPage = useMemo(
    () => (pageCount > 0 ? Math.min(pageIndex, pageCount - 1) : 0),
    [pageIndex, pageCount],
  );

  const changePageSize = useCallback((next: number) => {
    setPageSize(next);
    setPageIndex(0);
  }, []);

  return {
    rows,
    busy,
    itemCodeInput,
    setItemCodeInput,
    itemNameInput,
    setItemNameInput,
    lotNoInput,
    setLotNoInput,
    judgmentInput,
    setJudgmentInput,
    pageSize,
    totalCount,
    pageCount,
    orderField,
    orderDir,
    clampedPage,
    setPageIndex,
    changePageSize,
    applySearch,
    toggleSort,
    downloadAttachment,
    exportToExcel,
  };
}
