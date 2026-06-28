/** [제품이력관리 > LOT추적조회] LOT 단위 정·역방향 이력 추적. API: lotTraceApi(/api/item/lot-trace) — 수주·작업·검사·출하 등 여러 BE 엔드포인트 집계. */
import { useState, useCallback } from "react";
import type { ReactNode } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { buildExcelFileName } from "@/app/utils/excelDownload";
import {
  fetchLotTraceSearch,
  fetchLotTraceSearchPaged,
  fetchSalesOrderRefs,
  fetchLinkedLotsBulk,
} from "../../api/lotTraceApi";
import { UNITS, withUnit } from "@/app/utils/unitConvert";
import { ServerPagination } from "../../components/common/ServerPagination";
import { HEIGHT_MAP } from "../../components/common/TableSection";
import { PAGE_LAYOUT_STYLES } from "../../styles/button-styles";
import { formatNumber } from "@/app/utils/numberFormat";
import { NUMBER_ALIGN } from "@/app/styles/table-styles";
import { showError, showWarning } from "@/app/utils/toast";
import type { LotTraceSearchItem, SalesOrderRefItem } from "@/types/lot/lot-trace.interface";
import {
  PanelTitle,
  TraceTable,
  ToneBadge,
  GuideNotes,
  type TraceColumn,
  type TraceRow,
} from "./traceUi";
import { PurchaseLotDetail, MfgLotDetail } from "./traceDetailScreens";

type TraceStart = "PURCHASE" | "MFG" | "SHIP";

interface TraceParams {
  searchType: TraceStart;
  searchValue?: string;
  direction: "FORWARD" | "BACKWARD";
}

const isForward = (dir: string) => dir.startsWith("순");

/**
 * 검색값 접두어로 추적 시작점을 판별한다.
 *  - RM- → 구매, SH- → 출하, 그 외 입력값 → 제조
 *  - 입력값이 비면 방향으로 결정(순방향=구매 기점 / 역방향=출하 기점)
 */
function resolveStart(value: string, direction: string): TraceStart {
  const token = (value || "").trim().toUpperCase();
  if (token.startsWith("RM-")) return "PURCHASE";
  if (token.startsWith("SH-")) return "SHIP";
  if (!token) return isForward(direction) ? "PURCHASE" : "SHIP";
  return "MFG";
}

const buildParams = (value: string, direction: string): TraceParams => ({
  searchType: resolveStart(value, direction),
  searchValue: value || undefined,
  direction: isForward(direction) ? "FORWARD" : "BACKWARD",
});

// 추적 결과 그리드 헤더 (슬레이트 톤 고정)
const slateHead = "bg-slate-700 text-white";
const resultColumns: TraceColumn[] = [
  { label: "구분", bg: slateHead, width: "80px" },
  { label: "LOT 번호", bg: slateHead, width: "160px" },
  { label: "일자", bg: slateHead, width: "100px" },
  { label: "거래처 / 라인", bg: slateHead },
  { label: "품번", bg: slateHead, width: "110px" },
  { label: withUnit("평량", UNITS.basisWeight), bg: slateHead, width: "90px", align: NUMBER_ALIGN },
  { label: withUnit("폭", UNITS.width), bg: slateHead, width: "80px", align: NUMBER_ALIGN },
  { label: "수량 / 중량", bg: slateHead, width: "100px", align: NUMBER_ALIGN },
  { label: "연계 LOT", bg: slateHead },
  { label: "상세", bg: slateHead, width: "60px" },
];

const refHead = "bg-slate-600 text-white";
const salesRefColumns: TraceColumn[] = [
  { label: "출하 LOT", bg: refHead },
  { label: "출하일자", bg: refHead },
  { label: "거래처명", bg: refHead },
  { label: "품번", bg: refHead },
  { label: withUnit("출하량", UNITS.length), bg: refHead, align: NUMBER_ALIGN },
  { label: "수주번호", bg: refHead },
  { label: "수주일자", bg: refHead },
  { label: withUnit("수주량", UNITS.length), bg: refHead, align: NUMBER_ALIGN },
  { label: "잔여량(m)", bg: refHead, align: NUMBER_ALIGN },
];

// 행 배경: 구매=amber / 제조=emerald / 출하=orange
const rowTint = (typeBg: string): string =>
  typeBg === "purchase" ? "bg-amber-50/50" : typeBg === "mfg" ? "bg-emerald-50/50" : "bg-orange-50/50";

// ─── 검색 화면 ────────────────────────────────────────────────
function LotSearch({ onSelectPurchase, onSelectMfg }: {
  onSelectPurchase: (lot: string) => void;
  onSelectMfg: (lot: string) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [direction, setDirection] = useState("순방향");
  const [searched, setSearched] = useState(false);
  const [rows, setRows] = useState<LotTraceSearchItem[]>([]);
  const [salesRefs, setSalesRefs] = useState<SalesOrderRefItem[]>([]);
  const [pending, setPending] = useState(false);
  const [exporting, setExporting] = useState(false);

  // 서버 페이징
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(50);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // 페이지 이동/사이즈 변경 시 재사용할 마지막 검색조건
  const [activeParams, setActiveParams] = useState<TraceParams | null>(null);

  const load = async (targetPage: number, targetSize: number, override?: TraceParams) => {
    const base = override ?? activeParams ?? buildParams(keyword, direction);
    try {
      setPending(true);
      const query = { ...base, page: targetPage, size: targetSize };
      // 페이지 데이터와 수주 역참조(SHIP 한정)는 독립적이라 병렬 조회
      const wantsRefs = base.searchType === "SHIP";
      const [paged, refs] = await Promise.all([
        fetchLotTraceSearchPaged(query),
        wantsRefs ? fetchSalesOrderRefs(base) : Promise.resolve([]),
      ]);
      setRows(paged.content);
      setPage(paged.page);
      setSize(paged.size);
      setTotalElements(paged.totalElements);
      setTotalPages(paged.totalPages);
      setActiveParams(base);
      setSalesRefs(refs);
      setSearched(true);
    } catch (error) {
      console.error("[LotTrace] Search error:", error);
      showError("LOT 추적 검색 중 오류가 발생했습니다.");
    } finally {
      setPending(false);
    }
  };

  // 검색 버튼: 현재 입력값으로 새 조건을 만든다(캐시 무시) → 첫 페이지로
  const handleSearch = () => load(0, size, buildParams(keyword, direction));
  const handlePageChange = (p: number) => load(p, size);
  const handleSizeChange = (s: number) => load(0, s);

  const handleExcel = async () => {
    if (!searched || !activeParams) {
      showWarning("먼저 검색을 실행해주세요.");
      return;
    }
    try {
      setExporting(true);
      const all = await fetchLotTraceSearch(activeParams);
      if (all.length === 0) {
        showWarning("출력할 데이터가 없습니다.");
        return;
      }

      // 연계 LOT을 백엔드 1회 호출로 일괄 매핑
      const linked = await fetchLinkedLotsBulk(all.map(r => ({ lotNo: r.lotNo, typeBg: r.typeBg })));
      const linkedByLot = new Map<string, string[]>();
      for (const it of linked) linkedByLot.set(it.lotNo, it.linkedLots || []);

      const basisLabel = withUnit("평량", UNITS.basisWeight);
      const widthLabel = withUnit("폭", UNITS.width);
      const sheetRows = all.map((r, idx) => {
        const chain = linkedByLot.get(r.lotNo) || [];
        return {
          "No.": idx + 1,
          "구분": r.type,
          "LOT 번호": r.lotNo,
          "일자": r.date,
          "거래처/라인": r.party,
          "품번": r.itemCode,
          [basisLabel]: r.basisWeight,
          [widthLabel]: r.width,
          "수량/중량": r.qty,
          "연계 LOT": chain.length > 0 ? chain.join(", ") : "-",
        };
      });

      const ws = XLSX.utils.json_to_sheet(sheetRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "LOT추적관리");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      saveAs(new Blob([buf], { type: "application/octet-stream" }), buildExcelFileName("LOT추적관리"));
    } catch (e) {
      console.error("[LotTrace] Excel export error:", e);
      showError("엑셀 출력 중 오류가 발생했습니다.");
    } finally {
      setExporting(false);
    }
  };

  const linkedCell = (r: LotTraceSearchItem): ReactNode => {
    if (r.typeBg === "purchase")
      return (
        <button
          onClick={() => onSelectPurchase(r.lotNo)}
          className="text-blue-600 hover:text-blue-800 font-semibold hover:underline transition-colors"
        >
          {r.linkedLot}
        </button>
      );
    if (r.typeBg === "mfg")
      return (
        <button
          onClick={() => onSelectMfg(r.lotNo)}
          className="text-emerald-600 hover:text-emerald-800 font-semibold hover:underline transition-colors"
        >
          {r.linkedLot}
        </button>
      );
    return <span className="text-orange-600 font-semibold">{r.linkedLot}</span>;
  };

  const openDetail = (r: LotTraceSearchItem) => {
    if (r.typeBg === "purchase") onSelectPurchase(r.lotNo);
    else if (r.typeBg === "mfg") onSelectMfg(r.lotNo);
  };

  const resultRows: TraceRow[] = rows.map(r => ({
    _rowClass: rowTint(r.typeBg),
    cells: [
      { content: <ToneBadge text={r.type} type={r.typeBg} /> },
      { content: <span className="font-mono font-semibold text-slate-800">{r.lotNo}</span> },
      { content: r.date, className: "text-slate-600" },
      { content: r.party },
      { content: r.itemCode, className: "font-mono" },
      { content: formatNumber(r.basisWeight) },
      { content: formatNumber(r.width) },
      { content: formatNumber(r.qty), className: "font-semibold" },
      { content: linkedCell(r) },
      { content: (
        <button
          onClick={() => openDetail(r)}
          className="w-7 h-7 bg-slate-700 hover:bg-slate-500 text-white rounded flex items-center justify-center transition-colors text-xs"
        >
          ▶
        </button>
      )},
    ],
  }));

  const refRows: TraceRow[] = salesRefs.map(r => ({
    cells: [
      { content: <span className="font-mono text-xs">{r.shipLotNo}</span> },
      { content: r.shipDate },
      { content: r.customerName },
      { content: r.itemCode, className: "font-mono" },
      { content: formatNumber(r.shippedQty), className: "font-semibold" },
      { content: <span className="font-mono text-orange-700 font-bold">{r.salesOrderNo}</span> },
      { content: r.salesOrderDate },
      { content: formatNumber(r.salesOrderQty) },
      { content: <span className="font-semibold text-blue-700">{formatNumber(r.remainQty)}</span> },
    ],
  }));

  const forwardView = isForward(direction);
  const showSalesRefs = activeParams?.searchType === "SHIP";

  return (
    <div className="space-y-4">
      {/* 검색조건: 검색값 | 추적방향 | 버튼 */}
      <div data-help="lot-trace-search">
        <PanelTitle title="LOT 추적 검색" color="bg-slate-800" />
        <div className="border border-slate-200 rounded-b overflow-hidden">
          <table className="w-full text-xs border-collapse">
            <tbody>
              <tr>
                <td className="bg-blue-50 text-slate-600 font-semibold px-3 py-2 border-r border-slate-200 w-24 whitespace-nowrap">검색값</td>
                <td className="px-3 py-2 border-r border-slate-200">
                  <input
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    placeholder="LOT 번호 직접 입력 (RM- / P1-·P2- / SH-)"
                    className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                  />
                </td>
                <td className="bg-blue-50 text-slate-600 font-semibold px-3 py-2 border-r border-slate-200 w-24 whitespace-nowrap">추적방향</td>
                <td className="px-3 py-2 border-r border-slate-200">
                  <select
                    value={direction}
                    onChange={e => setDirection(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option>순방향 (구매→생산→출하)</option>
                    <option>역방향 (출하→생산→구매)</option>
                  </select>
                </td>
                <td className="px-2 py-2 w-52 border-r border-gray-200">
                  <div className="flex gap-2">
                    <button
                      onClick={handleSearch}
                      disabled={pending}
                      className="flex-1 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded transition-colors whitespace-nowrap"
                    >
                      {pending ? "검색중..." : "검색"}
                    </button>
                    <button
                      onClick={handleExcel}
                      disabled={exporting}
                      className="flex-1 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:bg-emerald-400 text-white text-xs font-bold rounded transition-colors whitespace-nowrap"
                    >
                      {exporting ? "출력중..." : "엑셀출력"}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 추적 결과 (항상 표시) */}
      <div data-help="lot-trace-table">
        <PanelTitle
          title={forwardView
            ? "추적결과 현황 (구매 LOT → 제조 LOT → 출하)"
            : "추적결과 현황 (출하 LOT → 제조 LOT → 구매 LOT)"}
          color="bg-slate-800"
          right={
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-300 inline-block" />구매LOT</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-300 inline-block" />제조LOT</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-300 inline-block" />출하</span>
            </div>
          }
        />
        <TraceTable headers={resultColumns} rows={resultRows} containerStyle={{ height: HEIGHT_MAP.full }} />
        {searched && totalPages > 0 && (
          <ServerPagination
            page={page}
            size={size}
            totalElements={totalElements}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onSizeChange={handleSizeChange}
            loading={pending}
          />
        )}
      </div>

      {/* 수주 역참조 — 출하 LOT 검색 시에만 */}
      {showSalesRefs && (
        <div>
          <div className="bg-slate-500 text-white px-4 py-2 rounded-t flex items-center gap-2">
            <span className="text-xs font-bold">수주 역참조 정보</span>
            <span className="text-xs bg-slate-400 px-2 py-0.5 rounded">출하 시점 연계 — LOT 추적 체인 외 별도 표시</span>
          </div>
          <TraceTable headers={salesRefColumns} rows={refRows} containerStyle={{ height: HEIGHT_MAP.third }} />
        </div>
      )}

      {/* 하단 안내 */}
      {searched && (
        <GuideNotes lines={[
          "추적구분 : 구매LOT(RM-), 제조LOT(P1-/P2-..), 출하LOT(SH-) 선택 후 검색값 입력 / 추적방향 : 순방향(구매→출하) 또는 역방향(출하→구매) 선택",
          "구매LOT : 가입고등록(SW_2002-1) 시 자동 부여. 형식: RM-YYMMDD-거래처번호-NNN / 제조LOT : 작업지시(SW_3003-1) 확정 시 자동 부여. 형식: 라인-YYMMDD-NNN",
          "수주(SO)는 LOT 추적 체인에 포함되지 않음. 출하 시점에 수주번호가 배정되며, 하단 '수주 역참조' 섹션에서 별도 확인",
        ]} />
      )}
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────
export function LotTracePage() {
  const [view, setView] = useState<"search" | "purchase" | "mfg">("search");
  const [selectedLot, setSelectedLot] = useState<string | null>(null);

  const goToPurchase = useCallback((lot: string) => { setSelectedLot(lot); setView("purchase"); }, []);
  const goToMfg = useCallback((lot: string) => { setSelectedLot(lot); setView("mfg"); }, []);
  const goBack = useCallback(() => { setView("search"); setSelectedLot(null); }, []);

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      {/* 상세 전환 시에도 검색 결과/입력값을 잃지 않도록 검색화면은 언마운트하지 않고 숨김 처리 */}
      <div style={{ display: view === "search" ? "block" : "none" }}>
        <LotSearch onSelectPurchase={goToPurchase} onSelectMfg={goToMfg} />
      </div>
      {view === "purchase" && <PurchaseLotDetail lotNo={selectedLot || ""} onBack={goBack} />}
      {view === "mfg" && <MfgLotDetail lotNo={selectedLot || ""} onBack={goBack} onSelectPurchase={goToPurchase} />}
    </div>
  );
}
