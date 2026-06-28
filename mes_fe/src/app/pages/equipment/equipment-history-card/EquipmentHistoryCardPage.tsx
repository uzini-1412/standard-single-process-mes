/** [설비관리 > 설비이력카드] 설비별 이력 카드(점검·고장·수리 종합) 출력. API: facilityHistoryApi(/api/facility/history) + facilityApi. */
import { useState, useEffect, useRef, Fragment } from "react";
import { Button } from "../../../components/ui/button";
import { Image as ImageIcon } from "lucide-react";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import { HISTORY_CARD_COLUMNS } from "@/app/constants/eqipment";
import { fetchHistoryCardList, HistoryCardRes } from "@/app/api/facilityHistoryApi";
import { fetchFacilityList } from "@/app/api/facilityApi";
import { EquipmentHistoryData } from "@/types/equipment/history.interface";
import { showWarning } from "@/app/utils/toast";
import { formatCurrency } from "@/app/utils/numberFormat";

// 인쇄 창에 들어갈 <style> 블록. 컴포넌트 밖 상수라 매 렌더마다 새로 만들지 않는다.
const PRINT_STYLE = `
            @page { size: portrait; margin: 15mm; }
            body { font-family: 'Malgun Gothic', sans-serif; margin: 0; padding: 0; }
            .card { border: 2px solid #333; }
            .card-title { background-color: #4A5CC7; color: white; text-align: center; padding: 14px; font-size: 20px; font-weight: bold; }
            .info-grid { display: table; width: 100%; border-collapse: collapse; }
            .info-row { display: table-row; }
            .info-label { display: table-cell; background-color: #f3f4f6; border: 1px solid #ccc; padding: 10px 14px; font-weight: bold; font-size: 13px; color: #333; width: 100px; text-align: center; }
            .info-value { display: table-cell; border: 1px solid #ccc; padding: 10px 14px; font-size: 13px; color: #333; }
            .img-area { border: 1px solid #ccc; margin: 0; padding: 20px; text-align: center; min-height: 200px; display: flex; align-items: center; justify-content: center; }
            .img-area img { max-width: 100%; max-height: 240px; object-fit: contain; }
            .no-img { color: #999; font-size: 14px; padding: 60px 0; }
            table.history { width: 100%; border-collapse: collapse; }
            table.history th { background-color: #4A5CC7; color: white; padding: 10px 8px; font-size: 12px; text-align: center; border: 1px solid #ccc; }
            table.history td { padding: 8px; font-size: 12px; text-align: center; border: 1px solid #ccc; }`;

// cardData -> 인쇄용 완성 HTML 문자열. 행/이미지 조각을 먼저 만들고 마지막에 한 번에 조립한다.
function buildPrintHtml(card: HistoryCardRes): string {
  const historyRows = (card.historyList ?? []);
  const bodyRows = historyRows.length > 0
    ? historyRows.map((row: any) => [
        `<td>${row.occurDate || ""}</td>`,
        `<td style="text-align:left;">${row.actionContent || ""}</td>`,
        `<td>${formatCurrency(row.actionCost)}</td>`,
        `<td>${row.actionManager || ""}</td>`,
        `<td style="text-align:left;">${row.remark || ""}</td>`,
      ].join("")).map((cells) => `<tr>${cells}</tr>`).join("")
    : `<tr><td colspan="5" style="text-align:center;padding:30px;color:#999;">등록된 이력이 없습니다.</td></tr>`;

  const photoMarkup = card.imgPaths
    ? `<img src="${card.imgPaths}" alt="설비사진" />`
    : `<div class="no-img">설비사진 없음</div>`;

  const infoCell = (label: string, value?: string) =>
    `<div class="info-label">${label}</div><div class="info-value">${value || ""}</div>`;

  return `
      <html>
        <head>
          <title>설비 이력카드 - ${card.manageNo}</title>
          <style>${PRINT_STYLE}
          </style>
        </head>
        <body>
          <div class="card">
            <div class="card-title">설비 이력카드</div>

            <div class="info-grid">
              <div class="info-row">
                ${infoCell("설비번호", card.manageNo)}
                ${infoCell("설비명", card.facilityName)}
              </div>
              <div class="info-row">
                ${infoCell("사용공정", card.processNm)}
                ${infoCell("구입일자", card.purchaseDate)}
              </div>
            </div>

            <div class="img-area">
              ${photoMarkup}
            </div>

            <table class="history">
              <thead>
                <tr>
                  <th style="width:100px;">발생일자</th>
                  <th>조치내용 &amp; 특기사항</th>
                  <th style="width:100px;">발생비용</th>
                  <th style="width:80px;">조치자</th>
                  <th style="width:120px;">비고</th>
                </tr>
              </thead>
              <tbody>
                ${bodyRows}
              </tbody>
            </table>
          </div>

          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `;
}

export default function EquipmentHistoryCardPage({ onBack }: { onBack?: () => void } = {}) {
  const [manageNo, setManageNo] = useState("");
  const [cardData, setCardData] = useState<HistoryCardRes | null>(null);

  // 설비번호 자동완성 목록
  const [allManageNos, setAllManageNos] = useState<string[]>([]);
  const [filteredManageNos, setFilteredManageNos] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 인쇄 영역 ref
  const printRef = useRef<HTMLDivElement>(null);

  // manageNo 입력값으로 자동완성 후보를 추려낸다. 빈 값이면 전체 목록.
  const matchManageNos = (keyword: string) =>
    keyword
      ? allManageNos.filter((no) => no.toLowerCase().includes(keyword.toLowerCase()))
      : allManageNos;

  // 페이지 로드 시 설비번호 목록 가져오기
  useEffect(() => {
    const loadManageNos = async () => {
      try {
        const data = await fetchFacilityList();
        const nos = data.map((item: any) => item.manageNo).filter(Boolean);
        setAllManageNos(nos);
      } catch (error) {
        console.error("Failed to load facility list:", error);
      }
    };
    loadManageNos();
  }, []);

  // 입력값 변경 시 필터링
  useEffect(() => {
    const candidates = matchManageNos(manageNo);
    setFilteredManageNos(candidates);
    setShowDropdown(candidates.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manageNo, allManageNos]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchByManageNo = async (no: string) => {
    if (!no) return;
    try {
      const result = await fetchHistoryCardList({ keyword: no });
      const matched = result.find((item) => item.manageNo === no);
      setCardData(matched || null);
    } catch (error) {
      console.error("Failed to search equipment history card:", error);
    }
  };

  const handleSelectManageNo = (no: string) => {
    setManageNo(no);
    setShowDropdown(false);
    // 선택 즉시 검색
    searchByManageNo(no);
  };

  const handleSearch = () => {
    searchByManageNo(manageNo);
  };

  const handleReset = () => {
    setManageNo("");
    setCardData(null);
  };

  const handlePrint = () => {
    if (!cardData) {
      showWarning("출력할 이력 데이터가 없습니다.");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(buildPrintHtml(cardData));
    printWindow.document.close();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setShowDropdown(false);
      handleSearch();
    }
  };

  const imgPath = cardData?.imgPaths || null;

  // 최신순(등록일자 desc, 동일 일자는 historySq desc) 정렬된 이력 목록
  const sortedHistory = cardData?.historyList
    ? [...cardData.historyList].sort((a: EquipmentHistoryData, b: EquipmentHistoryData) => {
        const byDate = (b.regDt || b.occurDate || "").slice(0, 10)
          .localeCompare((a.regDt || a.occurDate || "").slice(0, 10));
        return byDate !== 0 ? byDate : (b.historySq ?? 0) - (a.historySq ?? 0);
      })
    : [];

  // 카드 상단 설비정보(설비번호/설비명/사용공정/구입일자) 2행 구성
  const infoPairs: [string, string][] = [
    ["설비번호", cardData?.manageNo || ""],
    ["설비명", cardData?.facilityName || ""],
    ["사용공정", cardData?.processNm || ""],
    ["구입일자", cardData?.purchaseDate || ""],
  ];

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        {/* Page Header with Action Buttons */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <h1 className="text-2xl font-semibold text-gray-900">설비 이력카드</h1>
          <div className="flex gap-2">
            {onBack && <Button onClick={onBack} className={BUTTON_STYLES.list}>목록</Button>}
            <Button onClick={handleReset} className={BUTTON_STYLES.reset}>초기화</Button>
            <Button onClick={handlePrint} className={BUTTON_STYLES.primary}>출력</Button>
          </div>
        </div>

        {/* Search Filter */}
        <div data-help="equipment-history-card-search" className="bg-gray-50 rounded-lg p-3 mb-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="flex items-center relative" style={{ minWidth: "250px" }} ref={dropdownRef}>
              <div className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 h-9 flex items-center whitespace-nowrap rounded-l-md border border-gray-300">
                설비번호
              </div>
              <div className="relative flex-1">
                <input
                  type="text"
                  value={manageNo}
                  onChange={(e) => setManageNo(e.target.value)}
                  onFocus={() => {
                    const list = matchManageNos(manageNo);
                    setFilteredManageNos(list);
                    setShowDropdown(list.length > 0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="설비번호 입력"
                  className="w-full h-9 px-3 bg-white border border-l-0 border-gray-300 rounded-r-md text-xs focus:outline-none focus:ring-2 focus:ring-[#5B6FD8]"
                />
                {/* 자동완성 드롭다운 */}
                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                    {filteredManageNos.map((no, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-2 text-xs text-gray-700 hover:bg-blue-50 cursor-pointer"
                        onClick={() => handleSelectManageNo(no)}
                      >
                        {no}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <Button onClick={handleSearch} className={BUTTON_STYLES.primary}>
              검색
            </Button>
          </div>
        </div>

        {/* 설비이력카드 Section (인쇄 대상) */}
        <div data-help="equipment-history-card-table" ref={printRef} className="border border-gray-200 rounded-sm overflow-hidden">
          {/* Title with Blue Background */}
          <div className="bg-[#4A5CC7] text-white text-center py-3 mb-0">
            <h2 className="text-lg font-semibold">설비 이력카드</h2>
          </div>

          {/* Content Area */}
          <div className="p-6">
            {/* Info Table — infoPairs를 2개씩 끊어 행으로 출력 */}
            <table className="w-full border border-gray-300 mb-6">
              <tbody>
                {[0, 2].map((start) => (
                  <tr key={start}>
                    {infoPairs.slice(start, start + 2).map(([label, value]) => (
                      <Fragment key={label}>
                        <td className="border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 w-32 border-r border-gray-200">{label}</td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700 border-r border-gray-200">{value}</td>
                      </Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Image */}
            <div className="mb-6">
              <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center h-64">
                {imgPath ? (
                  <img src={imgPath} alt="설비사진" className="w-full h-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    <ImageIcon className="w-16 h-16 mb-2" />
                    <span className="text-sm">설비사진 없음</span>
                  </div>
                )}
              </div>
            </div>

            {/* History Table */}
            <div className="border border-gray-200 rounded-sm overflow-hidden">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#4A5CC7]">
                    {HISTORY_CARD_COLUMNS.map((column: { key: string; label: string }, idx: number) => (
                      <th
                        key={column.key}
                        className={`px-4 py-3 text-center text-xs font-semibold text-white whitespace-nowrap ${idx !== HISTORY_CARD_COLUMNS.length - 1 ? 'border-r border-white' : ''}`}
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const placeholder = !cardData
                      ? "설비번호를 검색하여 이력을 조회하세요."
                      : sortedHistory.length === 0
                        ? "등록된 설비 이력이 없습니다."
                        : null;
                    if (placeholder) {
                      return (
                        <tr className="border-b border-gray-200">
                          <td colSpan={HISTORY_CARD_COLUMNS.length} className="px-4 py-8 text-center text-sm text-gray-500 border-r border-gray-200">
                            {placeholder}
                          </td>
                        </tr>
                      );
                    }
                    return sortedHistory.map((row: EquipmentHistoryData, index: number) => (
                      <tr key={index} className="border-b border-gray-200">
                        <td className="px-4 py-3 text-xs text-gray-700 text-center border-r border-gray-200">{row.occurDate}</td>
                        <td className="px-4 py-3 text-xs text-gray-700 border-r border-gray-200">{row.actionContent}</td>
                        <td className="px-4 py-3 text-xs text-gray-700 text-center border-r border-gray-200">{formatCurrency(row.actionCost)}</td>
                        <td className="px-4 py-3 text-xs text-gray-700 text-center border-r border-gray-200">{row.actionManager}</td>
                        <td className="px-4 py-3 text-xs text-gray-700 border-r border-gray-200">{row.remark}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
