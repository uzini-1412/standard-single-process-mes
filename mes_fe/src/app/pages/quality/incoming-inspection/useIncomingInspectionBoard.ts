/** [품질관리 > 입고검사] 목록 화면의 조회/필터/페이징/검사 CRUD 상태를 담당하는 커스텀 훅. */
import { useState, useEffect, useCallback } from "react";
import * as incomingInspectionApi from "../../../api/incomingInspectionApi";
import {
  IncomingInspectionTargetData,
  IncomingInspectionResultData,
  IncomingInspectionPageMode,
} from "@/types/quality/inspection.interface";
import { showSuccess, showWarning, showError } from "@/app/utils/toast";
import { showConfirm } from "@/app/utils/confirm";
import {
  mapInspectionTargets,
  mapInspectionResults,
  isCompletedInspection,
  filterByKeywords,
  derivePaging,
} from "./incomingInspectionHelpers";

export function useIncomingInspectionBoard() {
  const [viewMode, setViewMode] = useState<IncomingInspectionPageMode>("list");
  const [activeRecord, setActiveRecord] = useState<any>(null);
  const [rawResultRows, setRawResultRows] = useState<any[]>([]);

  const [keywordItemCode, setKeywordItemCode] = useState("");
  const [keywordItemName, setKeywordItemName] = useState("");
  const [keywordCustomer, setKeywordCustomer] = useState("");
  const [busy, setBusy] = useState(false);

  const [targetRows, setTargetRows] = useState<IncomingInspectionTargetData[]>([]);
  const [resultRows, setResultRows] = useState<IncomingInspectionResultData[]>([]);

  const [resultPageIndex, setResultPageIndex] = useState(0);
  const [resultPageSize, setResultPageSize] = useState(50);
  const [targetPageIndex, setTargetPageIndex] = useState(0);
  const [targetPageSize, setTargetPageSize] = useState(50);

  // 검사 대상(inspectStatus=WAIT) 목록을 받아 화면 행으로 변환
  const reloadTargets = useCallback(async () => {
    try {
      setBusy(true);
      const list = await incomingInspectionApi.fetchInspectTargetList();
      setTargetRows(mapInspectionTargets(list));
    } catch (err) {
      console.error("[IncomingInspection] Failed to load target data:", err);
      setTargetRows([]);
    } finally {
      setBusy(false);
    }
  }, []);

  // 검사 완료(PASS/REJECT) 목록 조회 후 원본/화면행을 함께 보관
  const reloadResults = useCallback(async () => {
    try {
      setBusy(true);
      const list = await incomingInspectionApi.fetchInspectResultList();
      const completed = list.filter(isCompletedInspection);
      setRawResultRows(completed);
      setResultRows(mapInspectionResults(completed));
    } catch (err) {
      console.error("[IncomingInspection] Failed to load result data:", err);
      setResultRows([]);
    } finally {
      setBusy(false);
    }
  }, []);

  const reloadAll = useCallback(async () => {
    await Promise.all([reloadTargets(), reloadResults()]);
  }, [reloadTargets, reloadResults]);

  // 목록 모드로 복귀할 때마다 데이터 재조회
  useEffect(() => {
    if (viewMode === "list") {
      reloadAll();
    }
  }, [viewMode, reloadAll]);

  const keywords = {
    itemCode: keywordItemCode,
    itemName: keywordItemName,
    customerName: keywordCustomer,
  };

  // 인라인 실시간 필터링
  const visibleTargets = filterByKeywords(targetRows, keywords);
  const visibleResults = filterByKeywords(resultRows, keywords);

  // 대상 테이블 페이징 파생값
  const targetTotal = visibleTargets.length;
  const targetPaging = derivePaging(targetTotal, targetPageIndex, targetPageSize);
  const pagedTargets = visibleTargets.slice(
    targetPaging.offset,
    targetPaging.offset + targetPageSize,
  );

  // 결과 테이블 페이징 파생값 (페이지 내 순번 재계산)
  const resultTotal = visibleResults.length;
  const resultPaging = derivePaging(resultTotal, resultPageIndex, resultPageSize);
  const pagedResults = visibleResults
    .slice(resultPaging.offset, resultPaging.offset + resultPageSize)
    .map((row, i) => ({ ...row, no: String(resultPaging.offset + i + 1) }));

  // 검색 버튼: 결과 페이지를 첫 장으로 되돌림
  const runSearch = () => setResultPageIndex(0);

  // 백엔드 SXSSF 스트리밍 엑셀 — PASS/REJECT 만 내보내며 필터 조건은 서버에서 동일 적용
  const exportExcel = async () => {
    try {
      await incomingInspectionApi.exportIncomingInspectExcel({
        itemCode: keywordItemCode || undefined,
        itemName: keywordItemName || undefined,
        customerName: keywordCustomer || undefined,
      });
    } catch (err) {
      console.error("Excel export failed:", err);
      showError("엑셀 출력 중 오류가 발생했습니다.");
    }
  };

  // 대상 행 체크: 단일 선택 토글(다른 행은 해제)
  const toggleTarget = (rowIndex: number) => {
    setTargetRows((prev) =>
      prev.map((row, i) => ({
        ...row,
        selected: i === rowIndex ? !row.selected : false,
      })),
    );
  };

  // 선택된 대상을 localStorage에 넣고 등록 화면으로 진입
  const beginRegister = () => {
    const picked = targetRows.filter((row) => row.selected);
    if (picked.length === 0) {
      showWarning("입고검사 대상을 선택해주세요.");
      return;
    }
    localStorage.setItem(
      "selectedIncomingInspectionTargets",
      JSON.stringify(picked),
    );
    setViewMode("create");
  };

  // 결과 행 클릭 → 원본을 inboundSq 로 역추적해 상세 진입
  const openResultDetail = (inboundSq: any) => {
    const original = rawResultRows.find((o: any) => o.inboundSq === inboundSq);
    if (!original) return;
    setActiveRecord(original);
    setViewMode("detail");
  };

  const goBackToList = () => {
    setViewMode("list");
    setActiveRecord(null);
  };

  const goToEdit = () => setViewMode("edit");

  const removeInspection = async () => {
    if (!(await showConfirm("정말 삭제하시겠습니까?"))) return;
    try {
      await incomingInspectionApi.deleteInspectResult([activeRecord.inboundSq]);
      showSuccess("입고검사가 삭제되었습니다.");
      setViewMode("list");
      setActiveRecord(null);
      await reloadAll();
    } catch (err) {
      console.error("[IncomingInspection] Delete error:", err);
      showError("삭제 중 오류가 발생했습니다.");
    }
  };

  // 첨부 성적서 다운로드
  const downloadCertificate = async (filePath: string, fileName: string) => {
    if (!filePath) {
      showWarning("파일이 없습니다.");
      return;
    }
    try {
      await incomingInspectionApi.downloadInspectFile(filePath, fileName);
    } catch (err) {
      console.error("[IncomingInspection] File download failed:", err);
      showError("파일 다운로드에 실패했습니다.");
    }
  };

  const finishRegister = async () => {
    setViewMode("list");
    setActiveRecord(null);
    await reloadAll();
  };

  return {
    // 모드/선택 상태
    viewMode,
    activeRecord,
    busy,
    // 검색 키워드
    keywordItemCode,
    setKeywordItemCode,
    keywordItemName,
    setKeywordItemName,
    keywordCustomer,
    setKeywordCustomer,
    runSearch,
    // 대상 테이블
    pagedTargets,
    targetTotal,
    targetPaging,
    targetPageSize,
    setTargetPageSize,
    setTargetPageIndex,
    toggleTarget,
    // 결과 테이블
    pagedResults,
    resultTotal,
    resultPaging,
    resultPageSize,
    setResultPageSize,
    setResultPageIndex,
    // 액션
    exportExcel,
    beginRegister,
    openResultDetail,
    goBackToList,
    goToEdit,
    removeInspection,
    downloadCertificate,
    finishRegister,
  };
}
