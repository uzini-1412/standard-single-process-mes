/** [출하관리 > 출하지시관리] 출하보고서(출하증) 출력 화면. shipmentReportApi(/api/shipment/report) 사용. */
import { useState, useEffect, useRef } from "react";
import { Button } from "../../../components/ui/button";
import { PAGE_LAYOUT_STYLES, BUTTON_STYLES } from "../../../styles/button-styles";
import * as reportApi from "../../../api/shipmentReportApi";
import type { ShipmentReportData, ShipmentReportItem } from "../../../api/shipmentReportApi";
import { showSuccess, showError } from "@/app/utils/toast";
import {
  REPORT_ROW_COUNT,
  REPORT_PALETTE,
  REPORT_PRINT_CSS,
  buildEmptyReportRow,
  buildEmptyReportRows,
} from "./shipmentReportHelpers";

interface ShipmentReportViewProps {
  /** 출하지시관리에서 진입 시: 출하지시 단위 */
  shipOrderSq?: number;
  /** 출하실적 화면에서 진입 시: BE 가 shipOrderSq 를 풀어 SHIP_RESULT 단위로 별도 보관 */
  shipResultSq?: number;
  onBack: () => void;
}

export function ShipmentReportView({ shipOrderSq, shipResultSq, onBack }: ShipmentReportViewProps) {
  const fromResultEntry = !shipOrderSq && !!shipResultSq;
  const [form, setForm] = useState<ShipmentReportData>(() => ({
    shipOrderSq: shipOrderSq ?? 0,
    reportDateFrom: "",
    reportDateTo: "",
    title: "NEEDLE 공정 자주검사표",
    workType: "",
    color: "",
    headerLabel1: "N/P",
    headerLabel2: "I/R",
    headerLabel3: "CAMI",
    itemCode: "",
    itemName: "",
    sourceType: fromResultEntry ? "SHIP_RESULT" : undefined,
    sourceKey: fromResultEntry ? String(shipResultSq) : undefined,
    items: buildEmptyReportRows(REPORT_ROW_COUNT),
  }));

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetchReport();
  }, [shipOrderSq, shipResultSq]);

  async function fetchReport() {
    // 저장된 성적서가 있으면 우선 적재.
    try {
      const saved = fromResultEntry
        ? await reportApi.loadShipmentReportByResult(shipResultSq!)
        : await reportApi.loadShipmentReportByOrder(shipOrderSq!);
      if (saved && saved.shipReportSq) {
        const items = saved.items && saved.items.length > 0 ? [...saved.items] : buildEmptyReportRows(REPORT_ROW_COUNT);
        while (items.length < REPORT_ROW_COUNT) items.push(buildEmptyReportRow(items.length));
        setForm({
          ...saved,
          items,
          sourceType: fromResultEntry ? "SHIP_RESULT" : saved.sourceType,
          sourceKey: fromResultEntry ? String(shipResultSq) : saved.sourceKey,
        });
        return;
      }
    } catch {
      /* 저장본 없으면 초기 데이터로 진행 */
    }

    // 저장본이 없으면 BE 초기 데이터를 채운다.
    try {
      const init = fromResultEntry
        ? await reportApi.loadShipmentReportInitByResult(shipResultSq!)
        : await reportApi.loadShipmentReportInitByOrder(shipOrderSq!);
      if (init) {
        const items: ShipmentReportItem[] = (init.items || []).map((it) => ({
          rowNo: it.rowNo,
          rollNo: it.rollNo ?? String(it.rowNo),
          width: it.width,
          length: it.length,
          rollWeight: it.rollWeight,
          rollBasis: it.rollBasis,
          weightLeft: null,
          weightCenter: null,
          weightRight: null,
        }));
        while (items.length < REPORT_ROW_COUNT) items.push(buildEmptyReportRow(items.length));
        setForm((prev) => ({
          ...prev,
          reportDateFrom: init.reportDateFrom || prev.reportDateFrom,
          reportDateTo: init.reportDateTo || prev.reportDateTo,
          title: init.title || prev.title,
          itemCode: init.itemCode || prev.itemCode,
          itemName: init.itemName || prev.itemName,
          items,
        }));
      }
    } catch {
      /* 초기 데이터도 없으면 빈 양식 유지 */
    }
  }

  // 폼 단일 필드 갱신.
  const setField = <K extends keyof ShipmentReportData>(field: K, value: ShipmentReportData[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // 성적서 행의 셀 값 갱신. rollNo 는 문자열, 나머지는 숫자(빈값은 null).
  const setRowCell = (idx: number, field: keyof ShipmentReportItem, value: string) => {
    setForm((prev) => {
      const items = [...prev.items];
      if (field === "rollNo") {
        items[idx] = { ...items[idx], rollNo: value };
      } else {
        items[idx] = { ...items[idx], [field]: value === "" ? null : Number(value) };
      }
      return { ...prev, items };
    });
  };

  const appendRow = () => setForm((prev) => ({ ...prev, items: [...prev.items, buildEmptyReportRow(prev.items.length)] }));
  const dropLastRow = () =>
    setForm((prev) => ({ ...prev, items: prev.items.length > 1 ? prev.items.slice(0, -1) : prev.items }));

  async function saveReport() {
    try {
      const items = form.items.map((it, idx) => ({ ...it, rowNo: idx + 1 }));
      await reportApi.saveShipmentReport({ ...form, items });
      showSuccess("출하성적서가 저장되었습니다.");
      await fetchReport();
    } catch {
      showError("저장에 실패했습니다.");
    }
  }

  function printReport() {
    const el = printRef.current;
    if (!el) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(
      `<!DOCTYPE html><html><head><title>${form.title || "출하성적서"}</title><style>${REPORT_PRINT_CSS}</style></head><body><div id="print-root">${el.innerHTML}</div></body></html>`
    );
    win.document.close();
    win.onafterprint = () => win.close();
    setTimeout(() => win.print(), 300);
  }

  // 컬럼 합계.
  const sumRollWeight = form.items.reduce((s, i) => s + (i.rollWeight || 0), 0);
  const sumRollBasis = form.items.reduce((s, i) => s + (i.rollBasis || 0), 0);
  const sumLeft = form.items.reduce((s, i) => s + (i.weightLeft || 0), 0);
  const sumCenter = form.items.reduce((s, i) => s + (i.weightCenter || 0), 0);
  const sumRight = form.items.reduce((s, i) => s + (i.weightRight || 0), 0);

  // 숫자 입력 셀 (값 + onChange).
  const numberCell = (value: number | null, onChange: (v: string) => void, bold = false) => (
    <input
      type="number"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        textAlign: "center",
        border: "none",
        background: "transparent",
        outline: "none",
        fontSize: 13,
        fontFamily: "inherit",
        fontWeight: bold ? 700 : 400,
        color: "#000",
      }}
    />
  );

  const cellBorder = `1px solid ${REPORT_PALETTE.lightBorder}`;
  const outerBorder = `2px solid ${REPORT_PALETTE.border}`;

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-gray-900">출하성적서</h1>
          <div className="flex items-center gap-2">
            <Button className={BUTTON_STYLES.secondary} onClick={dropLastRow}>행 삭제</Button>
            <Button className={BUTTON_STYLES.secondary} onClick={appendRow}>행 추가</Button>
            <Button className={BUTTON_STYLES.primary} onClick={saveReport}>저장</Button>
            <Button className={BUTTON_STYLES.primary} onClick={printReport}>출력</Button>
            <Button className={BUTTON_STYLES.secondary} onClick={onBack}>목록</Button>
          </div>
        </div>

        <div ref={printRef} className="bg-white p-6 border border-gray-200 rounded-lg" style={{ fontSize: 13, color: "#000" }}>
          {/* TITLE */}
          <div style={{ textAlign: "center", padding: "4px 0 14px" }}>
            <input
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              style={{ width: "70%", textAlign: "center", fontSize: 26, fontWeight: 800, letterSpacing: 4, border: "none", outline: "none", color: "#000" }}
            />
          </div>

          {/* META: 사진과 동일한 단일 표 */}
          <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 6, tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "8%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "1%" }} />
              <col style={{ width: "17%" }} />
              <col style={{ width: "17%" }} />
              <col style={{ width: "17%" }} />
            </colgroup>
            <tbody>
              <tr>
                <td style={{ background: REPORT_PALETTE.labelBg, padding: "5px 6px", fontWeight: 700, textAlign: "center" }}>
                  <input
                    type="number"
                    value={form.reportDateFrom ? form.reportDateFrom.slice(0, 4) : ""}
                    onChange={(e) => {
                      const rest = form.reportDateFrom.slice(4) || "-01-01";
                      setField("reportDateFrom", e.target.value + rest);
                    }}
                    style={{ width: 50, textAlign: "right", border: "none", outline: "none", fontSize: 13, fontWeight: 700, background: "transparent" }}
                  />
                  <span>年</span>
                </td>
                <td style={{ padding: "5px 6px", fontWeight: 700 }}>
                  <input type="date" value={form.reportDateFrom} onChange={(e) => setField("reportDateFrom", e.target.value)}
                    style={{ border: "none", outline: "none", fontSize: 12, fontWeight: 700 }} />
                  <span style={{ margin: "0 6px" }}>~</span>
                  <input type="date" value={form.reportDateTo} onChange={(e) => setField("reportDateTo", e.target.value)}
                    style={{ border: "none", outline: "none", fontSize: 12, fontWeight: 700 }} />
                </td>
                <td style={{ background: REPORT_PALETTE.labelBg, padding: "5px 6px", fontWeight: 700, textAlign: "right" }}>작업구분:</td>
                <td style={{ padding: "5px 6px", fontWeight: 700 }}>
                  <input value={form.workType} onChange={(e) => setField("workType", e.target.value)} placeholder="P-2"
                    style={{ width: "100%", border: "none", outline: "none", fontSize: 13, fontWeight: 700, background: "transparent" }} />
                </td>
                <td />
                <td style={{ background: REPORT_PALETTE.labelBg, padding: "5px 6px", textAlign: "center" }}>
                  <input value={form.headerLabel1} onChange={(e) => setField("headerLabel1", e.target.value)}
                    style={{ width: "100%", textAlign: "center", padding: "2px 4px", border: "none", background: "transparent", outline: "none", fontWeight: 700, fontSize: 13 }} />
                </td>
                <td style={{ padding: "5px 6px", textAlign: "center" }}>
                  <input value={form.headerLabel2} onChange={(e) => setField("headerLabel2", e.target.value)}
                    style={{ width: "100%", textAlign: "center", padding: "2px 4px", border: "none", background: "transparent", outline: "none", fontWeight: 700, fontSize: 13 }} />
                </td>
                <td style={{ background: REPORT_PALETTE.labelBg, padding: "5px 6px", textAlign: "center" }}>
                  <input value={form.headerLabel3} onChange={(e) => setField("headerLabel3", e.target.value)}
                    style={{ width: "100%", textAlign: "center", padding: "2px 4px", border: "none", background: "transparent", outline: "none", fontWeight: 700, fontSize: 13 }} />
                </td>
              </tr>
              <tr>
                <td style={{ background: REPORT_PALETTE.labelBg, padding: "5px 6px", fontWeight: 700, textAlign: "center" }}>品名:</td>
                <td style={{ padding: "5px 6px", fontWeight: 700 }}>
                  <input value={form.itemName} onChange={(e) => setField("itemName", e.target.value)}
                    style={{ width: "100%", border: "none", outline: "none", fontSize: 14, fontWeight: 800, background: "transparent", color: "#000" }} />
                </td>
                <td style={{ background: REPORT_PALETTE.labelBg, padding: "5px 6px", fontWeight: 700, textAlign: "right" }}>COLOR:</td>
                <td colSpan={5} style={{ padding: "5px 6px" }}>
                  <input value={form.color} onChange={(e) => setField("color", e.target.value)} placeholder="WHITE"
                    style={{ width: "30%", border: "none", outline: "none", fontSize: 14, fontWeight: 800, background: "transparent", color: "#000" }} />
                </td>
              </tr>
            </tbody>
          </table>

          {/* MAIN TABLE */}
          <table style={{ borderCollapse: "collapse", width: "100%", border: outerBorder, tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "18%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "14%" }} />
            </colgroup>
            <thead>
              <tr style={{ background: REPORT_PALETTE.headerBg }}>
                <th rowSpan={2} style={{ border: cellBorder, padding: "8px 4px", fontWeight: 700 }}>ROLL NO</th>
                <th rowSpan={2} style={{ border: cellBorder, padding: "8px 4px", fontWeight: 700 }}>폭</th>
                <th rowSpan={2} style={{ border: cellBorder, padding: "8px 4px", fontWeight: 700 }}>길이</th>
                <th rowSpan={2} style={{ border: cellBorder, padding: "8px 4px", fontWeight: 700 }}>Roll중량</th>
                <th rowSpan={2} style={{ border: cellBorder, padding: "8px 4px", fontWeight: 700 }}>
                  Roll단위중량/M<sup>2</sup>
                </th>
                <th colSpan={3} style={{ border: cellBorder, padding: "6px 4px", fontWeight: 700, borderBottom: cellBorder }}>
                  중량 g/m<sup>2</sup>
                </th>
              </tr>
              <tr style={{ background: REPORT_PALETTE.headerBg }}>
                <th style={{ border: cellBorder, padding: "4px", fontWeight: 700 }}>좌</th>
                <th style={{ border: cellBorder, padding: "4px", fontWeight: 700 }}>중</th>
                <th style={{ border: cellBorder, padding: "4px", fontWeight: 700 }}>우</th>
              </tr>
            </thead>
            <tbody>
              {form.items.map((it, idx) => (
                <tr key={idx} style={{ background: idx % 2 === 1 ? REPORT_PALETTE.zebraBg : "#fff" }}>
                  <td style={{ border: cellBorder, padding: "2px 4px", textAlign: "center", fontWeight: 700, color: "#000" }}>
                    <input
                      value={it.rollNo}
                      onChange={(e) => setRowCell(idx, "rollNo", e.target.value)}
                      style={{ width: "100%", textAlign: "center", border: "none", background: "transparent", outline: "none", fontSize: 12, fontWeight: 700, color: "#000", fontFamily: "monospace" }}
                    />
                  </td>
                  <td style={{ border: cellBorder, padding: "2px 4px" }}>{numberCell(it.width, (v) => setRowCell(idx, "width", v))}</td>
                  <td style={{ border: cellBorder, padding: "2px 4px" }}>{numberCell(it.length, (v) => setRowCell(idx, "length", v))}</td>
                  <td style={{ border: cellBorder, padding: "2px 4px" }}>{numberCell(it.rollWeight, (v) => setRowCell(idx, "rollWeight", v))}</td>
                  <td style={{ border: cellBorder, padding: "2px 4px" }}>{numberCell(it.rollBasis, (v) => setRowCell(idx, "rollBasis", v))}</td>
                  <td style={{ border: cellBorder, padding: "2px 4px" }}>{numberCell(it.weightLeft, (v) => setRowCell(idx, "weightLeft", v))}</td>
                  <td style={{ border: cellBorder, padding: "2px 4px" }}>{numberCell(it.weightCenter, (v) => setRowCell(idx, "weightCenter", v))}</td>
                  <td style={{ border: cellBorder, padding: "2px 4px" }}>{numberCell(it.weightRight, (v) => setRowCell(idx, "weightRight", v))}</td>
                </tr>
              ))}
              <tr style={{ background: REPORT_PALETTE.headerBg, fontWeight: 700, color: "#000" }}>
                <td style={{ border: cellBorder, padding: "6px 4px", textAlign: "center" }}>TOTAL</td>
                <td style={{ border: cellBorder, padding: "6px 4px" }}></td>
                <td style={{ border: cellBorder, padding: "6px 4px" }}></td>
                <td style={{ border: cellBorder, padding: "6px 4px", textAlign: "center" }}>{sumRollWeight ? sumRollWeight.toLocaleString() : ""}</td>
                <td style={{ border: cellBorder, padding: "6px 4px", textAlign: "center" }}>{sumRollBasis ? sumRollBasis.toLocaleString() : ""}</td>
                <td style={{ border: cellBorder, padding: "6px 4px", textAlign: "center" }}>{sumLeft ? sumLeft.toLocaleString() : ""}</td>
                <td style={{ border: cellBorder, padding: "6px 4px", textAlign: "center" }}>{sumCenter ? sumCenter.toLocaleString() : ""}</td>
                <td style={{ border: cellBorder, padding: "6px 4px", textAlign: "center" }}>{sumRight ? sumRight.toLocaleString() : ""}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
