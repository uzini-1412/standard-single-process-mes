/** [출하관리 > 출하지시관리] 거래명세표 출력 화면. tradeStatementApi(/api/shipment/trade-statement) 사용. */
import { useState, useEffect, useRef } from "react";
import { Button } from "../../../components/ui/button";
import { PAGE_LAYOUT_STYLES, BUTTON_STYLES } from "../../../styles/button-styles";
import * as tradeApi from "../../../api/tradeStatementApi";
import type { TradeStatementData, TradeStatementItem } from "../../../api/tradeStatementApi";
import { showSuccess, showError } from "@/app/utils/toast";
import { formatNumber } from "@/app/utils/numberFormat";
import {
  STATEMENT_ROW_COUNT,
  STATEMENT_PRINT_CSS,
  buildBlankStatementRow,
  buildBlankStatementRows,
  computeTax,
} from "./tradeStatementHelpers";
import { todayYmd } from "@/app/utils/dateToday";

interface TradeStatementViewProps {
  shipOrderSq: number;
  onBack: () => void;
  /** 외부에서 데이터를 직접 주입할 때 사용(매출현황 등). 주입 시 API 로드를 건너뛴다. */
  initialForm?: Partial<TradeStatementData>;
}

export function TradeStatementView({ shipOrderSq, onBack, initialForm }: TradeStatementViewProps) {
  const [taxMode, setTaxMode] = useState<"round" | "floor">("round");
  const [fontSize, setFontSize] = useState(11);
  const [form, setForm] = useState<TradeStatementData>(() => {
    const base: TradeStatementData = {
      shipOrderSq,
      statementDate: todayYmd(),
      supplierRegNo: "", supplierCompany: "", supplierCeo: "", supplierAddress: "", supplierBizType: "", supplierBizItem: "",
      buyerRegNo: "", buyerCompany: "", buyerCeo: "", buyerAddress: "", buyerBizType: "", buyerBizItem: "",
      prevBalance: "", shipAmount: "", depositAmount: "", currBalance: "",
      receiverName: "", remark: "", items: buildBlankStatementRows(),
    };
    if (!initialForm) return base;
    const merged = { ...base, ...initialForm };
    // 품목이 기본 행 수 미만이면 빈 행으로 채운다.
    while (merged.items.length < STATEMENT_ROW_COUNT) merged.items.push(buildBlankStatementRow(merged.items.length + 1));
    return merged;
  });
  const printRef = useRef<HTMLDivElement>(null);

  // initialForm 이 있어도 DB 저장본이 있으면 그쪽을 우선한다.
  useEffect(() => {
    void fetchStatement();
  }, [shipOrderSq]);

  async function fetchStatement() {
    try {
      // 먼저 sourceType+sourceKey 로 조회(매출현황/거래처원장 저장 케이스).
      let saved: any = null;
      const st = initialForm?.sourceType || form.sourceType;
      const sk = initialForm?.sourceKey || form.sourceKey;
      if (st && sk) {
        saved = await tradeApi.fetchTradeStatementBySource(st, sk);
      }
      // 폴백: shipOrderSq 로 조회.
      if ((!saved || !saved.statementSq) && shipOrderSq > 0) {
        saved = await tradeApi.fetchTradeStatement(shipOrderSq);
      }
      if (saved && saved.statementSq) {
        const items = saved.items && saved.items.length > 0 ? [...saved.items] : buildBlankStatementRows();
        while (items.length < STATEMENT_ROW_COUNT) items.push(buildBlankStatementRow(items.length + 1));
        // 저장본의 sourceType/sourceKey 는 유지.
        setForm((prev) => ({ ...prev, ...saved, items, sourceType: saved.sourceType || prev.sourceType, sourceKey: saved.sourceKey || prev.sourceKey }));
        return;
      }
    } catch {
      /* ignore */
    }

    // 외부 주입본이 있으면 그대로 사용(신규 발행).
    if (initialForm) return;

    // 신규: BE 가 출하지시→출하계획→수주 체인을 타고 초기 데이터를 내려준다(출하지시관리 전용).
    try {
      const init = await tradeApi.fetchTradeStatementInitData(shipOrderSq);
      if (init) {
        const items = buildBlankStatementRows();
        (init.items || []).forEach((initItem, idx) => {
          if (idx >= items.length) return;
          const supply = initItem.supplyPrice;
          items[idx] = {
            rowNo: idx + 1,
            productName: initItem.productName || "",
            spec: initItem.spec || "",
            qty: initItem.qty,
            unitPrice: initItem.unitPrice,
            supplyPrice: supply,
            tax: supply != null ? Math.round(supply * 0.1) : initItem.tax,
          };
        });
        setForm((prev) => ({
          ...prev,
          statementDate: init.statementDate || prev.statementDate,
          buyerRegNo: init.buyerRegNo || "",
          buyerCompany: init.buyerCompany || "",
          buyerCeo: init.buyerCeo || "",
          buyerAddress: init.buyerAddress || "",
          items,
        }));
      }
    } catch {
      /* ignore */
    }
  }

  const setField = (field: keyof TradeStatementData, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  // 품목 셀 갱신. 문자 컬럼은 그대로, 숫자 컬럼은 number/null 로. 공급가액 변경 시 세액 자동 계산.
  const setRowCell = (idx: number, field: keyof TradeStatementItem, value: string) => {
    setForm((prev) => {
      const items = [...prev.items];
      const numVal = value === "" ? null : Number(value);
      items[idx] = { ...items[idx], [field]: field === "productName" || field === "spec" ? value : numVal };
      if (field === "supplyPrice" && numVal != null) {
        items[idx].tax = computeTax(numVal, taxMode);
      }
      return { ...prev, items };
    });
  };

  // 세액 모드 토글 시 전체 세액 재계산.
  const switchTaxMode = (mode: "round" | "floor") => {
    setTaxMode(mode);
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => ({
        ...item,
        tax: item.supplyPrice != null ? computeTax(item.supplyPrice, mode) : item.tax,
      })),
    }));
  };

  async function saveStatement() {
    try {
      await tradeApi.saveTradeStatement(form);
      showSuccess("거래명세표가 저장되었습니다.");
    } catch {
      showError("저장에 실패했습니다.");
    }
  }

  function printStatement() {
    const el = printRef.current;
    if (!el) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const css = STATEMENT_PRINT_CSS.replace("font-size: 11px", `font-size: ${fontSize}px`);
    win.document.write(`<!DOCTYPE html><html><head><title>거래명세표</title><style>${css}</style></head><body><div id="print-root">${el.innerHTML}</div></body></html>`);
    win.document.close();
    win.onafterprint = () => win.close();
    setTimeout(() => win.print(), 300);
  }

  const sumQty = form.items.reduce((s, i) => s + (i.qty || 0), 0);
  const sumSupply = form.items.reduce((s, i) => s + (i.supplyPrice || 0), 0);
  const sumTax = form.items.reduce((s, i) => s + (i.tax || 0), 0);

  const wonText = (v: number) => `\\${v.toLocaleString()}`;

  // 14열 colgroup — 헤더/정보/품목/푸터를 단일 테이블로 통합.
  const colDefs = (
    <colgroup>
      <col style={{ width: "3%" }} />
      <col style={{ width: "6%" }} />
      <col style={{ width: "11.5%" }} />
      <col style={{ width: "5%" }} />
      <col style={{ width: "8.5%" }} />
      <col style={{ width: "3%" }} />
      <col style={{ width: "6%" }} />
      <col style={{ width: "11.5%" }} />
      <col style={{ width: "5%" }} />
      <col style={{ width: "8.5%" }} />
      <col style={{ width: "6%" }} />
      <col style={{ width: "8.7%" }} />
      <col style={{ width: "8.6%" }} />
      <col style={{ width: "8.2%" }} />
    </colgroup>
  );

  const renderCopy = (variant: "buyer" | "supplier") => {
    const c = variant === "buyer" ? "#2D5A9E" : "#4A7C44";
    const copyLabel = variant === "buyer" ? "공급받는자용" : "공급자용";
    const bg = variant === "buyer" ? "#EBF0F9" : "#EDF5EC";
    const bgL = variant === "buyer" ? "#F5F8FC" : "#F6FAF5";
    const b = `1px solid ${c}`;
    const fs = fontSize; // base
    const fsL = fs + 13; // 거래명세표 타이틀
    const fsS = fs - 2; // 소형 라벨
    const fsSS = fs - 3; // 인, (법인명)
    const fsXL = fs + 3; // 합계금액 값

    return (
      <div className="form-wrap">
        <table style={{ color: c, borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>
          {colDefs}
          <tbody>
            {/* ===== SECTION 1: HEADER (거래명세표 + 확인란) ===== */}
            <tr>
              <td colSpan={10} rowSpan={2} style={{ border: b, textAlign: "center", fontSize: fsL, fontWeight: "bold", letterSpacing: 12, height: 46 }}>
                거래명세표<br /><span style={{ fontSize: fs, fontWeight: "normal", letterSpacing: 2 }}>({copyLabel})</span>
              </td>
              <td rowSpan={2} style={{ border: b, textAlign: "center", fontWeight: "bold", fontSize: fsS, background: bg, verticalAlign: "middle" }}>확인</td>
              <td style={{ border: b, height: 30 }}></td>
              <td style={{ border: b }}></td>
              <td style={{ border: b }}></td>
            </tr>
            <tr>
              <td style={{ border: b, height: 14 }}></td>
              <td style={{ border: b }}></td>
              <td style={{ border: b }}></td>
            </tr>

            {/* ===== SECTION 2: INFO — 공급자/공급받는자 + 금액란 (8행, 빈 행 없음) ===== */}
            <tr>
              <td rowSpan={8} style={{ border: b, textAlign: "center", fontWeight: "bold", writingMode: "vertical-lr", letterSpacing: 6, background: bg, fontSize: fs + 1 }}>공급자</td>
              <td rowSpan={2} style={{ border: b, textAlign: "center", background: bg, fontWeight: "bold", verticalAlign: "middle" }}>등록번호</td>
              <td rowSpan={2} colSpan={3} style={{ border: b, verticalAlign: "middle" }}><input value={form.supplierRegNo} onChange={(e) => setField("supplierRegNo", e.target.value)} /></td>
              <td rowSpan={8} style={{ border: b, textAlign: "center", fontWeight: "bold", writingMode: "vertical-lr", letterSpacing: 4, background: bg, fontSize: fs }}>공급받는자</td>
              <td rowSpan={2} style={{ border: b, textAlign: "center", background: bg, fontWeight: "bold", verticalAlign: "middle" }}>등록번호</td>
              <td rowSpan={2} colSpan={3} style={{ border: b, verticalAlign: "middle" }}><input value={form.buyerRegNo} onChange={(e) => setField("buyerRegNo", e.target.value)} /></td>
              <td style={{ border: b, textAlign: "center", background: bg, fontWeight: "bold", fontSize: fsS }}>전잔액</td>
              <td colSpan={3} style={{ border: b }}><input value={form.prevBalance} onChange={(e) => setField("prevBalance", e.target.value)} /></td>
            </tr>
            <tr>
              <td style={{ border: b, textAlign: "center", background: bg, fontWeight: "bold", fontSize: fsS }}>출고액</td>
              <td colSpan={3} style={{ border: b }}><input value={form.shipAmount} onChange={(e) => setField("shipAmount", e.target.value)} /></td>
            </tr>
            <tr>
              <td rowSpan={2} style={{ border: b, textAlign: "center", background: bg, fontWeight: "bold", verticalAlign: "middle" }}>상호<br /><span style={{ fontSize: fsSS }}>(법인명)</span></td>
              <td rowSpan={2} style={{ border: b, verticalAlign: "middle" }}><input value={form.supplierCompany} onChange={(e) => setField("supplierCompany", e.target.value)} /></td>
              <td rowSpan={2} style={{ border: b, textAlign: "center", background: bg, fontWeight: "bold", verticalAlign: "middle" }}>성명</td>
              <td rowSpan={2} style={{ border: b, position: "relative", overflow: "hidden", verticalAlign: "middle" }}>
                <input value={form.supplierCeo} onChange={(e) => setField("supplierCeo", e.target.value)} style={{ paddingRight: 22 }} />
                <span style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", border: `1px solid ${c}`, borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: fsSS }}>인</span>
              </td>
              <td rowSpan={2} style={{ border: b, textAlign: "center", background: bg, fontWeight: "bold", verticalAlign: "middle" }}>상호<br /><span style={{ fontSize: fsSS }}>(법인명)</span></td>
              <td rowSpan={2} style={{ border: b, verticalAlign: "middle" }}><input value={form.buyerCompany} onChange={(e) => setField("buyerCompany", e.target.value)} /></td>
              <td rowSpan={2} style={{ border: b, textAlign: "center", background: bg, fontWeight: "bold", verticalAlign: "middle" }}>성명</td>
              <td rowSpan={2} style={{ border: b, position: "relative", overflow: "hidden", verticalAlign: "middle" }}>
                <input value={form.buyerCeo} onChange={(e) => setField("buyerCeo", e.target.value)} style={{ paddingRight: 22 }} />
                <span style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", border: `1px solid ${c}`, borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: fsSS }}>인</span>
              </td>
              <td style={{ border: b, textAlign: "center", background: bg, fontWeight: "bold", fontSize: fsS }}>입금액</td>
              <td colSpan={3} style={{ border: b }}><input value={form.depositAmount} onChange={(e) => setField("depositAmount", e.target.value)} /></td>
            </tr>
            <tr>
              <td style={{ border: b, textAlign: "center", background: bg, fontWeight: "bold", fontSize: fsS }}>잔액</td>
              <td colSpan={3} style={{ border: b }}><input value={form.currBalance} onChange={(e) => setField("currBalance", e.target.value)} /></td>
            </tr>
            <tr>
              <td rowSpan={2} style={{ border: b, textAlign: "center", background: bg, fontWeight: "bold", verticalAlign: "middle" }}>사업장<br />주소</td>
              <td rowSpan={2} colSpan={3} style={{ border: b, verticalAlign: "middle" }}><input value={form.supplierAddress} onChange={(e) => setField("supplierAddress", e.target.value)} /></td>
              <td rowSpan={2} style={{ border: b, textAlign: "center", background: bg, fontWeight: "bold", verticalAlign: "middle" }}>사업장<br />주소</td>
              <td rowSpan={2} colSpan={3} style={{ border: b, verticalAlign: "middle" }}><input value={form.buyerAddress} onChange={(e) => setField("buyerAddress", e.target.value)} /></td>
              <td colSpan={4} style={{ borderRight: b, borderTop: "none", borderBottom: "none", borderLeft: "none", textAlign: "center", fontSize: fs, padding: "2px 4px" }}>아래 금액을</td>
            </tr>
            <tr>
              <td colSpan={4} style={{ borderRight: b, borderTop: "none", borderBottom: "none", borderLeft: "none", textAlign: "center", fontSize: fs, padding: "2px 4px" }}>
                <input value={form.remark} onChange={(e) => setField("remark", e.target.value)} placeholder="청구" style={{ width: 60, textAlign: "center", borderBottom: `1px solid ${c}` }} />
                {" "}합니다.
              </td>
            </tr>
            <tr>
              <td rowSpan={2} style={{ border: b, textAlign: "center", background: bg, fontWeight: "bold", verticalAlign: "middle" }}>업태</td>
              <td rowSpan={2} style={{ border: b, verticalAlign: "middle" }}><input value={form.supplierBizType} onChange={(e) => setField("supplierBizType", e.target.value)} /></td>
              <td rowSpan={2} style={{ border: b, textAlign: "center", background: bg, fontWeight: "bold", verticalAlign: "middle" }}>종목</td>
              <td rowSpan={2} style={{ border: b, verticalAlign: "middle" }}><input value={form.supplierBizItem} onChange={(e) => setField("supplierBizItem", e.target.value)} /></td>
              <td rowSpan={2} style={{ border: b, textAlign: "center", background: bg, fontWeight: "bold", verticalAlign: "middle" }}>업태</td>
              <td rowSpan={2} style={{ border: b, verticalAlign: "middle" }}><input value={form.buyerBizType} onChange={(e) => setField("buyerBizType", e.target.value)} /></td>
              <td rowSpan={2} style={{ border: b, textAlign: "center", background: bg, fontWeight: "bold", verticalAlign: "middle" }}>종목</td>
              <td rowSpan={2} style={{ border: b, verticalAlign: "middle" }}><input value={form.buyerBizItem} onChange={(e) => setField("buyerBizItem", e.target.value)} /></td>
              <td rowSpan={2} style={{ border: b, textAlign: "center", background: bg, fontWeight: "bold", fontSize: fsS, verticalAlign: "middle" }}>합계<br />금액</td>
              <td rowSpan={2} colSpan={3} style={{ border: b, textAlign: "center", fontWeight: "bold", fontSize: fsXL, verticalAlign: "middle" }}>
                {(sumSupply + sumTax) ? wonText(sumSupply + sumTax) : ""}
              </td>
            </tr>
            <tr>{/* 모든 셀이 위 rowSpan 으로 커버됨 */}</tr>

            {/* ===== SECTION 3: ITEMS ===== */}
            <tr>
              <th colSpan={5} style={{ border: b, background: bg, padding: "6px 4px", fontWeight: "bold" }}>품목 · 규격</th>
              <th colSpan={2} style={{ border: b, background: bg, padding: "6px 4px", fontWeight: "bold" }}>수량</th>
              <th colSpan={2} style={{ border: b, background: bg, padding: "6px 4px", fontWeight: "bold" }}>단가</th>
              <th colSpan={3} style={{ border: b, background: bg, padding: "6px 4px", fontWeight: "bold" }}>공급가액</th>
              <th colSpan={2} style={{ border: b, background: bg, padding: "6px 4px", fontWeight: "bold" }}>세액</th>
            </tr>
            {form.items.map((item, idx) => (
              <tr key={idx}>
                <td colSpan={5} style={{ border: b, background: idx % 2 === 1 ? bgL : "transparent", height: 20, textAlign: "center" }}><input value={item.productName} onChange={(e) => setRowCell(idx, "productName", e.target.value)} /></td>
                <td colSpan={2} style={{ border: b, background: idx % 2 === 1 ? bgL : "transparent", textAlign: "center" }}><input value={item.qty ?? ""} onChange={(e) => setRowCell(idx, "qty", e.target.value)} type="number" min="0" step="1" /></td>
                <td colSpan={2} style={{ border: b, background: idx % 2 === 1 ? bgL : "transparent", textAlign: "center" }}><input value={item.unitPrice ?? ""} onChange={(e) => setRowCell(idx, "unitPrice", e.target.value)} type="number" min="0" step="1" /></td>
                <td colSpan={3} style={{ border: b, background: idx % 2 === 1 ? bgL : "transparent", textAlign: "center" }}><input value={item.supplyPrice ?? ""} onChange={(e) => setRowCell(idx, "supplyPrice", e.target.value)} type="number" min="0" step="1" /></td>
                <td colSpan={2} style={{ border: b, background: idx % 2 === 1 ? bgL : "transparent", textAlign: "center" }}><input value={item.tax ?? ""} onChange={(e) => setRowCell(idx, "tax", e.target.value)} type="number" min="0" step="1" /></td>
              </tr>
            ))}
            <tr>
              <td colSpan={5} style={{ border: b, textAlign: "center", fontWeight: "bold", background: bg, padding: "4px 4px" }}>합계</td>
              <td colSpan={2} style={{ border: b, textAlign: "center", fontWeight: "bold", background: bg }}>{sumQty ? formatNumber(sumQty) : ""}</td>
              <td colSpan={2} style={{ border: b, background: bg }}></td>
              <td colSpan={3} style={{ border: b, textAlign: "center", fontWeight: "bold", background: bg }}>{sumSupply ? sumSupply.toLocaleString() : ""}</td>
              <td colSpan={2} style={{ border: b, textAlign: "center", fontWeight: "bold", background: bg }}>{sumTax ? sumTax.toLocaleString() : ""}</td>
            </tr>

            {/* ===== SECTION 4: FOOTER ===== */}
            <tr>
              <td colSpan={5} style={{ border: b, padding: "4px 8px" }}>총수량: <strong>{sumQty ? formatNumber(sumQty) : ""}</strong></td>
              <td colSpan={4} style={{ border: b, padding: "4px 8px" }}>인수자(인): <input value={form.receiverName} onChange={(e) => setField("receiverName", e.target.value)} style={{ width: 120 }} /></td>
              <td colSpan={5} style={{ border: b, padding: "4px 8px", textAlign: "right", fontWeight: "bold" }}>소계: {(sumSupply + sumTax) ? wonText(sumSupply + sumTax) : ""}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-gray-900">거래명세표</h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
              <button onClick={() => setFontSize((s) => Math.max(8, s - 1))}
                className="px-2 py-2 text-xs font-bold bg-white text-gray-600 hover:bg-gray-100 border-r border-gray-300">A-</button>
              <span className="px-2 py-2 text-xs text-gray-500 bg-white">{fontSize}px</span>
              <button onClick={() => setFontSize((s) => Math.min(16, s + 1))}
                className="px-2 py-2 text-xs font-bold bg-white text-gray-600 hover:bg-gray-100 border-l border-gray-300">A+</button>
            </div>
            <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
              <button onClick={() => switchTaxMode("round")}
                className={`px-3 py-2 text-xs font-medium ${taxMode === "round" ? "bg-black text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}>세액 반올림</button>
              <button onClick={() => switchTaxMode("floor")}
                className={`px-3 py-2 text-xs font-medium ${taxMode === "floor" ? "bg-black text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}>세액 버림</button>
            </div>
            <Button className={BUTTON_STYLES.primary} onClick={saveStatement}>저장</Button>
            <Button className={BUTTON_STYLES.primary} onClick={printStatement}>출력</Button>
            <Button className={BUTTON_STYLES.secondary} onClick={onBack}>목록</Button>
          </div>
        </div>

        {/* eslint-disable-next-line */}
        <style>{`.trade-form input { font-size: ${fontSize}px !important; text-align: center !important; }`}</style>
        <div ref={printRef} className="trade-form bg-white p-4 border border-gray-200 rounded-lg" style={{ width: "100%", fontSize: `${fontSize}px` }}>
          {renderCopy("buyer")}
          <hr className="cut" style={{ border: "none", borderTop: "2px dashed #aaa", margin: "8px 0" }} />
          {renderCopy("supplier")}
        </div>
      </div>
    </div>
  );
}
