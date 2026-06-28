import { useState, useEffect } from "react";
import * as processInspectionApi from "../../../api/processInspectionApi";
import * as commonInfoApi from "../../../api/commonInfoApi";
import { SelfInspectionHeader, SelfInspectionResult } from "@/types/quality/inspection.interface";
import { selfInspectionResultColumns } from "@/app/constants/qualityInspection";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { showWarning } from "@/app/utils/toast";
import { buildExcelFileName } from "@/app/utils/excelDownload";
import { expandSampleRows, resolveResultCellValue } from "./selfCheckMath";

// 진척현황 한 행을 화면 표시용으로 정규화. 누락 필드는 빈 문자열/기본 상태로 채움
function toHeaderRow(raw: any, index: number): SelfInspectionHeader {
  return {
    selected: false,
    no: String(index + 1),
    workOrderSq: raw.workOrderSq,
    inspectDate: raw.inspectDate || "",
    lineName: raw.lineName || "",
    itemCode: raw.itemCode || "",
    itemName: raw.itemName || "",
    progressStatus: raw.progressStatus || "대기",
    passFail: raw.passFail || "",
    remark: raw.remark || "",
  };
}

// 검사항목 한 건의 전체 합부. 백엔드 값이 있으면 그대로, 없으면 초품·종품을 한계치와 비교해 산출
function deriveItemPassFail(raw: any): string {
  if (raw.passFail) return raw.passFail;
  if (!raw.firstVal || !raw.lastVal) return "";
  const upper = raw.maxVal !== "" ? parseFloat(raw.maxVal) : Infinity;
  const lower = raw.minVal !== "" ? parseFloat(raw.minVal) : -Infinity;
  const firstSet = String(raw.firstVal).split(",").map((v: string) => parseFloat(v.trim()));
  const lastSet = String(raw.lastVal).split(",").map((v: string) => parseFloat(v.trim()));
  const everyWithin = [...firstSet, ...lastSet].every(
    (v) => isNaN(v) || (v >= lower && v <= upper),
  );
  return everyWithin ? "합격" : "불합격";
}

function toResultRow(raw: any, index: number): SelfInspectionResult {
  return {
    no: String(index + 1),
    inspectItemName: raw.inspectItemName || "",
    inspectCriteria: raw.inspectCriteria || "",
    inspectMethod: raw.inspectMethod || "",
    inspectCycle: raw.inspectCycle || "",
    baseVal: raw.baseVal || "",
    maxVal: raw.maxVal || "",
    minVal: raw.minVal || "",
    firstVal: raw.firstVal || "",
    lastVal: raw.lastVal || "",
    passFail: deriveItemPassFail(raw),
    lotNo: raw.lotNo || "",
  };
}

// 공정 자주검사 워크벤치의 상태·조회·페이징·엑셀출력을 한데 묶은 훅
export function useInProcessSelfCheck() {
  const [searchDateFrom, setSearchDateFrom] = useState("");
  const [searchDateTo, setSearchDateTo] = useState("");
  const [searchItemCode, setSearchItemCode] = useState("");
  const [searchItemName, setSearchItemName] = useState("");
  const [searchLine, setSearchLine] = useState("");
  const [lineOptions, setLineOptions] = useState<string[]>([]);

  const [headerData, setHeaderData] = useState<SelfInspectionHeader[]>([]);
  const [resultData, setResultData] = useState<SelfInspectionResult[]>([]);
  const [activeWorkOrderSq, setActiveWorkOrderSq] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // 진척현황은 서버에서 전량 받아 클라이언트에서 페이징
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  // 진척현황 목록을 다시 읽어 헤더 테이블에 채운다
  const reloadProgress = async () => {
    try {
      setLoading(true);
      const rows = await processInspectionApi.fetchProcessInspectionProgress();
      setHeaderData(rows.map(toHeaderRow));
    } catch (error) {
      console.error("공정검사 진척현황 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  // 최초 진입 시 진척현황과 라인 코드 옵션을 병렬로 준비
  useEffect(() => {
    reloadProgress();
    commonInfoApi
      .fetchDetailContentsByItemName("라인구분")
      .then(setLineOptions)
      .catch(() => setLineOptions([]));
  }, []);

  // 선택된 작업지시의 검사 상세를 읽어 결과 테이블을 채우고, 상단 합부도 반영
  const loadDetailFor = async (workOrderSq: number) => {
    try {
      const rows = await processInspectionApi.fetchProcessInspectionResultDetail(workOrderSq);
      const results = rows.map(toResultRow);
      setResultData(results);

      // 검사항목 중 하나라도 불합격이면 전체 불합격으로 헤더에 표기
      const anyFail = results.some((r) => r.passFail === "불합격");
      const anyJudged = results.some((r) => r.passFail !== "");
      const overall = anyJudged ? (anyFail ? "불합격" : "합격") : "";
      setHeaderData((prev) =>
        prev.map((h) => (h.workOrderSq === workOrderSq ? { ...h, passFail: overall } : h)),
      );
    } catch {
      setResultData([]);
    }
  };

  // 라디오 형태 단일 선택: 같은 행을 다시 누르면 해제, 다른 행이면 상세 로드
  const toggleRow = (workOrderSq: number) => {
    if (activeWorkOrderSq === workOrderSq) {
      setActiveWorkOrderSq(null);
      setResultData([]);
      return;
    }
    setActiveWorkOrderSq(workOrderSq);
    loadDetailFor(workOrderSq);
  };

  // 검색조건으로 헤더 데이터 필터링(날짜 범위/품번/품명 부분일치/라인 정확일치)
  const matchedHeaderData = headerData.filter((item) => {
    if (searchDateFrom && (!item.inspectDate || item.inspectDate < searchDateFrom)) return false;
    if (searchDateTo && (!item.inspectDate || item.inspectDate > searchDateTo)) return false;
    if (searchItemCode && !item.itemCode?.toLowerCase().includes(searchItemCode.toLowerCase())) return false;
    if (searchItemName && !item.itemName?.toLowerCase().includes(searchItemName.toLowerCase())) return false;
    if (searchLine && item.lineName !== searchLine) return false;
    return true;
  });

  // 필터 결과를 현재 페이지 구간으로 잘라내고 No 컬럼을 페이지 기준으로 다시 매김
  const totalElements = matchedHeaderData.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
  const safePage = Math.min(pageIndex, totalPages - 1);
  const startOffset = safePage * pageSize;
  const pagedHeaderData = matchedHeaderData
    .slice(startOffset, startOffset + pageSize)
    .map((item, idx) => ({ ...item, no: String(startOffset + idx + 1) }));

  const runSearch = () => setPageIndex(0);
  const goToPage = (p: number) => setPageIndex(p);
  const changePageSize = (s: number) => {
    setPageSize(s);
    setPageIndex(0);
  };

  // 성적서 엑셀 다운로드: 검사항목을 시료수만큼 행으로 펼치고, 공통값은 동일하게 반복
  const exportReportExcel = () => {
    if (resultData.length === 0) {
      showWarning("출력할 검사 결과가 없습니다.");
      return;
    }

    const rows: Record<string, string>[] = [];
    resultData.forEach((item) => {
      expandSampleRows(item).forEach((sample) => {
        const row: Record<string, string> = {};
        for (const col of selfInspectionResultColumns) {
          row[col.label] = resolveResultCellValue(col.key, item, sample);
        }
        rows.push(row);
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "공정검사결과");

    // 선택 행의 품번-품명을 파일명에 붙이고, 선택이 없으면 기본명만 사용
    const selectedHeader = headerData.find((h) => h.workOrderSq === activeWorkOrderSq);
    const fileName = buildExcelFileName(
      "공정검사성적서",
      selectedHeader ? [selectedHeader.itemCode, selectedHeader.itemName] : [],
    );

    const binary = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([binary], { type: "application/octet-stream" }), fileName);
  };

  return {
    // 검색조건
    searchDateFrom, setSearchDateFrom,
    searchDateTo, setSearchDateTo,
    searchItemCode, setSearchItemCode,
    searchItemName, setSearchItemName,
    searchLine, setSearchLine,
    lineOptions,
    // 데이터/선택
    resultData,
    activeWorkOrderSq,
    loading,
    pagedHeaderData,
    // 페이징
    pageSize,
    safePage,
    totalElements,
    totalPages,
    // 액션
    toggleRow,
    runSearch,
    goToPage,
    changePageSize,
    exportReportExcel,
  };
}
