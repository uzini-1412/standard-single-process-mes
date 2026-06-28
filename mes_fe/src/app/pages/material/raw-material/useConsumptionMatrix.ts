/** [원소재투입현황] 연도별 1~12월 투입량 매트릭스 조회·페이징·엑셀 출력 훅. */
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { buildExcelFileName } from "@/app/utils/excelDownload";
import * as plcRawApi from "../../../api/plcRawApi";
import { ConsumptionMatrixRow, ConsumptionTab } from "./consumptionTypes";

interface MatrixColumn {
  key: string;
  label: string;
  width: string;
}

// plcRawApi 응답(mon1~12, totalYear)을 화면 행 형태로 변환. 0 이하 값은 빈 칸 처리.
function toMatrixRows(source: plcRawApi.UsageStatusRes[]): ConsumptionMatrixRow[] {
  return source.map((r, i) => {
    const cell = (v: number) => (v > 0 ? Math.round(v) : "");
    return {
      no: i + 1,
      itemCode: r.itemCode,
      itemName: r.itemName,
      "1월": cell(r.mon1),
      "2월": cell(r.mon2),
      "3월": cell(r.mon3),
      "4월": cell(r.mon4),
      "5월": cell(r.mon5),
      "6월": cell(r.mon6),
      "7월": cell(r.mon7),
      "8월": cell(r.mon8),
      "9월": cell(r.mon9),
      "10월": cell(r.mon10),
      "11월": cell(r.mon11),
      "12월": cell(r.mon12),
      "총합계": cell(r.totalYear),
    } as ConsumptionMatrixRow;
  });
}

export function useConsumptionMatrix(activeTab: ConsumptionTab) {
  const thisYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(thisYear.toString());
  // "전체"(="")면 12개월 전부, 특정 월이면 해당 월만 매트릭스에 노출
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [matrixRows, setMatrixRows] = useState<ConsumptionMatrixRow[]>([]);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [matrixPage, setMatrixPage] = useState(0);
  const [matrixSize, setMatrixSize] = useState(50);

  // 연도 드롭다운: 올해부터 과거 5개년
  const yearChoices = Array.from({ length: 5 }, (_, i) => {
    const y = thisYear - i;
    return { value: y.toString(), label: `${y}년` };
  });

  // 선택 연도 기준 매트릭스 로드 (BE는 PLC 매칭 윈도우를 today 기준으로 처리, 응답은 year의 mon1~12)
  const reloadMatrix = async () => {
    try {
      setMatrixLoading(true);
      const rows = await plcRawApi.loadUsageMatrix({ year: parseInt(selectedYear, 10) });
      setMatrixRows(toMatrixRows(rows));
    } catch (error) {
      console.error("원소재투입현황 로드 실패:", error);
      setMatrixRows([]);
    } finally {
      setMatrixLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "input-status") reloadMatrix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedYear]);

  // 월 선택 상태에 따라 컬럼 구성 (전체=12개월, 특정 월=1개월)
  const matrixColumns = useMemo<MatrixColumn[]>(() => {
    const head: MatrixColumn[] = [
      { key: "no", label: "No.", width: "60px" },
      { key: "itemCode", label: "품번", width: "120px" },
      { key: "itemName", label: "품명", width: "150px" },
    ];
    const months: MatrixColumn[] =
      selectedMonth === ""
        ? Array.from({ length: 12 }, (_, i) => ({
            key: `${i + 1}월`,
            label: `${i + 1}월`,
            width: "80px",
          }))
        : [{ key: `${selectedMonth}월`, label: `${selectedMonth}월`, width: "120px" }];
    return [...head, ...months, { key: "총합계", label: "총합계", width: "120px" }];
  }, [selectedMonth]);

  // 화면에 보이는 컬럼 그대로 엑셀 시트로 출력
  const downloadMatrixExcel = () => {
    if (matrixRows.length === 0) {
      console.warn("출력할 데이터가 없습니다.");
      return;
    }
    const sheetRows = matrixRows.map((r) => {
      const record: Record<string, string | number> = {};
      matrixColumns.forEach((col) => {
        const v = r[col.key];
        record[col.label] = v == null || v === "" ? "" : v;
      });
      return record;
    });
    const worksheet = XLSX.utils.json_to_sheet(sheetRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "원소재투입현황");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buffer], { type: "application/octet-stream" }),
      buildExcelFileName("원소재투입현황"),
    );
  };

  return {
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    matrixRows,
    matrixLoading,
    matrixPage,
    setMatrixPage,
    matrixSize,
    setMatrixSize,
    yearChoices,
    matrixColumns,
    reloadMatrix,
    downloadMatrixExcel,
  };
}
