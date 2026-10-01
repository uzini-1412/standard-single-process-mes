/** [설비관리 > 일상점검현황] 설비 일상점검 실시 결과 입력/현황. API: facilityDailyCheckApi(/api/facility/daily-check) + checkItem/facility. */
import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { PAGE_LAYOUT_STYLES, BUTTON_STYLES } from "../../../styles/button-styles";
import { DateInputWithLabel } from "../../../components/common/DateInputWithLabel";
import { InputWithLabel } from "../../../components/common/InputWithLabel";
import { fetchCheckItemList } from "@/app/api/facilityCheckItemApi";
import { fetchDailyCheckList } from "@/app/api/facilityDailyCheckApi";
import { fetchFacilityList } from "@/app/api/facilityApi";
import { ResultInspectionItem, MonthlyInspectionItem } from "@/types/equipment/dailyinspection.interface";
import { RESULT_INSPECTION_COLUMNS } from "@/app/constants/eqipment";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { showWarning } from "@/app/utils/toast";
import { todayYmd } from "@/app/utils/dateToday";
import { buildExcelFileName } from "@/app/utils/excelDownload";
import { TableStateRow } from "../../../components/common/TableStateRow";

// 두 자리 0 패딩 (일/월 표기 공통)
const pad2 = (n: number | string) => String(n).padStart(2, "0");

const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

// 선택 연·월의 [1일, 말일] 문자열 범위
const monthRange = (year: number, month: number) => {
  const last = getDaysInMonth(year, month);
  const ym = `${year}-${pad2(month)}`;
  return { firstDay: `${ym}-01`, lastDay: `${ym}-${pad2(last)}`, daysInMonth: last };
};

// OK/NG 결과값에 대응하는 색상 클래스 (빈 값은 무색)
const resultColorClass = (value: string, emphasis = false) => {
  const ng = emphasis ? "text-red-600 font-medium" : "text-red-600";
  const ok = emphasis ? "text-blue-600 font-medium" : "text-blue-600";
  if (value === "OK") return ok;
  if (value === "NG") return ng;
  return emphasis ? "text-gray-700" : "";
};

export default function DailyInspectionResultPage() {
  const [checkDate, setCheckDate] = useState(todayYmd());
  const [lineNm, setLineNm] = useState("");
  const [facilityName, setFacilityNm] = useState("");
  const [loading, setLoading] = useState(false);
  const [allSelected, setAllSelected] = useState(false);

  const [inspectionData, setInspectionData] = useState<ResultInspectionItem[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyInspectionItem[]>([]);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    loadInspectionData();
  }, []);

  useEffect(() => {
    updateMonthlyData();
  }, [inspectionData, selectedYear, selectedMonth]);

  useEffect(() => {
    const date = new Date(checkDate);
    setSelectedYear(date.getFullYear());
    setSelectedMonth(date.getMonth() + 1);
  }, [checkDate]);

  const loadInspectionData = async () => {
    setLoading(true);
    try {
      // 점검결과 조회 기간(선택 월 전체) — 동기 계산이라 호출 전에 미리 만든다.
      const d = new Date(checkDate);
      const { firstDay, lastDay } = monthRange(d.getFullYear(), d.getMonth() + 1);

      // 설비 목록 / 점검항목 / 점검결과는 서로 독립적이라 동시에 조회한다.
      const [facilities, checkItems, results] = await Promise.all([
        fetchFacilityList({}),
        fetchCheckItemList({}),
        fetchDailyCheckList({ dateFrom: firstDay, dateTo: lastDay }),
      ]);

      // 설비 → 라인명 매핑 (lineNm 필터용)
      const facilityLineMap = new Map<number, string>(
        facilities.map((f: any) => [f.facilitySq, f.lineNm || ""])
      );

      // 점검항목별 최신결과 / 이상유무를 단일 순회로 동시 집계한다.
      //  - latestMap: 가장 늦은 checkDate의 결과
      //  - ngFlagMap: 해당 월에 NG가 한 번이라도 있었는지
      const latestMap = new Map<number, typeof results[0]>();
      const ngFlagMap = new Map<number, boolean>();
      for (const r of results) {
        const prev = latestMap.get(r.checkItemSq);
        if (!prev || r.checkDate > prev.checkDate) latestMap.set(r.checkItemSq, r);
        // 결과가 존재하는 checkItemSq는 모두 이상유무 대상에 포함. NG가 한 번이라도 있으면 true 고정.
        const flagged = ngFlagMap.get(r.checkItemSq) === true;
        ngFlagMap.set(r.checkItemSq, flagged || r.checkResult === "NG");
      }

      // 설비명 / 라인명 키워드 필터 (둘 다 부분일치, 대소문자 무시)
      const facilityKw = facilityName.trim().toLowerCase();
      const lineKw = lineNm.trim().toLowerCase();
      const filtered = checkItems.filter(item => {
        if (facilityKw && !(item.facilityName?.toLowerCase().includes(facilityKw))) return false;
        if (lineKw && !((facilityLineMap.get(item.facilitySq) || "").toLowerCase().includes(lineKw))) return false;
        return true;
      });

      const mappedData: ResultInspectionItem[] = filtered.map((item, index) => ({
        selected: false,
        No: pad2(index + 1),
        facilitySq: item.facilitySq,
        checkItemSq: item.checkItemSq,
        manageNo: item.manageNo || "",
        facilityName: item.facilityName || "",
        checkItemNm: item.checkItemNm || "",
        checkMethod: item.checkMethod || "",
        checkCriteria: item.checkCriteria || "",
        maxVal: item.maxVal || "",
        minVal: item.minVal || "",
        checkResult: latestMap.get(item.checkItemSq)?.checkResult || "",
        abnormality: ngFlagMap.has(item.checkItemSq) ? (ngFlagMap.get(item.checkItemSq) ? "유" : "무") : "",
      }));

      setInspectionData(mappedData);
    } catch (error) {
      console.error("데이터 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    const newSelectState = !allSelected;
    setAllSelected(newSelectState);
    setInspectionData(prev => prev.map(item => ({ ...item, selected: newSelectState })));
  };

  const handleCheckboxChange = (index: number) => {
    const newData = [...inspectionData];
    newData[index].selected = !newData[index].selected;
    setInspectionData(newData);
    setAllSelected(newData.every(item => item.selected));
  };

  const handleExportExcel = () => {
    if (monthlyData.length === 0) {
      showWarning("출력할 데이터가 없습니다. 상단에서 항목을 선택해주세요.");
      return;
    }

    const yearMonth = `${selectedYear}-${pad2(selectedMonth)}`;
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
    const dayKeys = Array.from({ length: daysInMonth }, (_, i) => pad2(i + 1));

    // 제목 / 헤더 / 데이터 행 구성 (헤더·셀 모두 동일한 일자 키 순서 사용)
    const titleRow = [`${yearMonth} 설비일상점검 결과`];
    const headers = ["No.", "일상점검 항목", ...dayKeys, "비고"];
    const dataRows = monthlyData.map(row => [
      row.No,
      row.checkItemNm,
      ...dayKeys.map(k => row[k] || ""),
      row.remark || "",
    ]);

    const wsData = [titleRow, [], headers, ...dataRows];
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);

    // 제목 셀 병합
    worksheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];

    // 열 너비 설정
    worksheet["!cols"] = [
      { wch: 6 },
      { wch: 20 },
      ...Array(daysInMonth).fill({ wch: 5 }),
      { wch: 10 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "설비일상점검결과");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    const periodStr = `${selectedYear}${pad2(selectedMonth)}`;
    saveAs(blob, buildExcelFileName("설비일상점검결과", [periodStr]));
  };

  const updateMonthlyData = async () => {
    const selectedItems = inspectionData.filter(item => item.selected);
    if (selectedItems.length === 0) {
      setMonthlyData([]);
      return;
    }

    try {
      const { firstDay, lastDay, daysInMonth } = monthRange(selectedYear, selectedMonth);
      const ym = `${selectedYear}-${pad2(selectedMonth)}`;

      const results = await fetchDailyCheckList({ dateFrom: firstDay, dateTo: lastDay });

      // checkItemSq + 날짜 → 결과 빠른 조회용 인덱스
      const resultByKey = new Map<string, string>();
      results.forEach(r => resultByKey.set(`${r.checkItemSq}|${r.checkDate}`, r.checkResult || ""));

      const monthlyItems: MonthlyInspectionItem[] = selectedItems.map((item, index) => {
        const monthlyItem: MonthlyInspectionItem = {
          No: pad2(index + 1),
          checkItemNm: item.checkItemNm,
          remark: "",
        };
        for (let day = 1; day <= daysInMonth; day++) {
          const dd = pad2(day);
          monthlyItem[dd] = resultByKey.get(`${item.checkItemSq}|${ym}-${dd}`) || "";
        }
        return monthlyItem;
      });

      setMonthlyData(monthlyItems);
    } catch (error) {
      console.error("월별 데이터 로딩 실패:", error);
    }
  };

  // 월별 표 헤더/셀에서 공유하는 일자 키 목록 ("01".."31")
  const monthDayKeys = Array.from(
    { length: getDaysInMonth(selectedYear, selectedMonth) },
    (_, i) => pad2(i + 1)
  );

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">일상점검 결과</h1>
          <Button onClick={handleExportExcel} className={BUTTON_STYLES.print}>
            점검결과 출력
          </Button>
        </div>

        {/* Search Filter */}
        <div data-help="daily-inspection-result-search" className="bg-gray-50 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-3">
            <DateInputWithLabel
              label="점검일"
              value={checkDate}
              onChange={setCheckDate}
            />
            <InputWithLabel
              label="라인명"
              value={lineNm}
              onChange={setLineNm}
              placeholder="라인명 입력"
            />
            <InputWithLabel
              label="설비명"
              value={facilityName}
              onChange={setFacilityNm}
              placeholder="설비명 입력"
            />
            <Button onClick={loadInspectionData} className={BUTTON_STYLES.search} disabled={loading}>
              {loading ? "조회중..." : "검색"}
            </Button>
          </div>
        </div>

        {/* 설비일상점검 선택 Section */}
        <div data-help="daily-inspection-result-table" className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">설비일상점검 선택</h2>
          </div>

          <div className="border border-gray-200 rounded-sm overflow-hidden" style={{ height: "calc(50vh - 140px)" }}>
            <div className="overflow-x-auto overflow-y-auto h-full">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#4A5CC7]">
                    {RESULT_INSPECTION_COLUMNS.map((column, idx) => (
                      <th key={column.key} className={`px-4 py-3 text-center text-xs font-semibold text-white whitespace-nowrap border-r border-white ${idx < 2 ? 'w-16' : ''}`}>
                        {column.key === "선택" ? (
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={handleSelectAll}
                            className="w-4 h-4"
                          />
                        ) : (
                          column.label
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <TableStateRow loading={loading} isEmpty={inspectionData.length === 0} colSpan={11} emptyText="등록된 점검항목이 없습니다." />
                  {!loading && inspectionData.map((row, index) => (
                      <tr
                        key={index}
                        onClick={() => handleCheckboxChange(index)}
                        className="border-t border-gray-200 hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="px-4 py-2 text-center border-r border-gray-200">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={() => handleCheckboxChange(index)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{row.No}</td>
                        <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{row.manageNo}</td>
                        <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{row.facilityName}</td>
                        <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{row.checkItemNm}</td>
                        <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{row.checkMethod}</td>
                        <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{row.checkCriteria}</td>
                        <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{row.maxVal}</td>
                        <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{row.minVal}</td>
                        <td className="px-4 py-2 text-xs text-gray-700 text-center font-medium border-r border-gray-200">
                          <span className={resultColorClass(row.checkResult)}>
                            {row.checkResult}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{row.abnormality}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 설비일상점검 결과 월별 Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">
              ({selectedYear}-{pad2(selectedMonth)}) 설비일상점검 결과
            </h2>
          </div>

          <div className="border border-gray-200 rounded-sm overflow-hidden" style={{ height: "calc(50vh - 140px)" }}>
            <div className="overflow-x-auto overflow-y-auto h-full">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#4A5CC7]">
                    <th className="px-4 py-3 text-center text-xs font-semibold text-white whitespace-nowrap border-r border-white w-16">No.</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-white whitespace-nowrap border-r border-white min-w-[150px]">일상점검 항목</th>
                    {monthDayKeys.map((dd) => (
                      <th key={dd} className="px-2 py-3 text-center text-xs font-semibold text-white whitespace-nowrap border-r border-white w-12">
                        {dd}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-xs font-semibold text-white whitespace-nowrap border-r border-white min-w-[100px]">비고</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.length === 0 ? (
                    <tr>
                      <td colSpan={monthDayKeys.length + 3} className="px-4 py-8 text-center text-sm text-gray-500 border-r border-gray-200">
                        상단에서 항목을 선택해주세요
                      </td>
                    </tr>
                  ) : (
                    monthlyData.map((row, index) => (
                      <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{row.No}</td>
                        <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{row.checkItemNm}</td>
                        {monthDayKeys.map((dd) => {
                          const val = row[dd];
                          return (
                            <td key={dd} className="px-2 py-2 text-xs text-center border-r border-gray-200">
                              <span className={resultColorClass(val, true)}>{val}</span>
                            </td>
                          );
                        })}
                        <td className="px-4 py-2 text-xs text-gray-700 text-center border-r border-gray-200">{row.remark}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
