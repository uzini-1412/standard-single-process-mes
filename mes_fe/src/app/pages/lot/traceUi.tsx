/**
 * LOT 추적조회 화면 전용 프레젠테이션 프리미티브.
 * 페이지 본문(LotTracePage)에서만 사용하는 내부 헬퍼라 export는 이 디렉터리에 한정된다.
 */
import type { ReactNode, CSSProperties } from "react";
import { cn } from "@/app/components/ui/utils";

// LOT 유형별 색상 토큰 (구매=amber / 제조=emerald / 출하=orange)
const TONE = {
  purchase: { badge: "bg-amber-100 text-amber-800 border border-amber-300", row: "bg-amber-50", header: "bg-amber-700 text-white" },
  mfg: { badge: "bg-emerald-100 text-emerald-800 border border-emerald-300", row: "bg-emerald-50", header: "bg-emerald-700 text-white" },
  ship: { badge: "bg-orange-100 text-orange-800 border border-orange-300", row: "bg-orange-50", header: "bg-orange-700 text-white" },
} as const;

type ToneKey = keyof typeof TONE;

export interface TraceColumn {
  label: string;
  bg?: string;
  width?: string;
  /** 숫자 컬럼 우측정렬(NUMBER_ALIGN). 헤더와 같은 인덱스의 셀에 함께 적용된다. */
  align?: string;
}

export interface TraceRow {
  _rowClass?: string;
  cells: { content: ReactNode; className?: string }[];
}

interface PanelTitleProps {
  title: string;
  color?: string;
  textColor?: string;
  right?: ReactNode;
}

export function PanelTitle({ title, color = "bg-slate-700", textColor = "text-white", right }: PanelTitleProps) {
  return (
    <div className={`${color} ${textColor} px-4 py-2 flex items-center justify-between rounded-t`}>
      <span className="text-xs font-bold tracking-wide">{title}</span>
      {right && <span className="text-xs opacity-80">{right}</span>}
    </div>
  );
}

export function KeyValueGrid({ items, cols = 4, bg = "bg-slate-50" }: {
  items: [string, ReactNode][];
  cols?: number;
  bg?: string;
}) {
  const tailStart = items.length - cols;
  return (
    <div className={`${bg} border border-slate-200 rounded-b overflow-hidden`}>
      <div className={`grid grid-cols-${cols}`}>
        {items.map(([label, value], idx) => (
          <div key={idx} className={`flex border-b border-r border-slate-200 last:border-r-0 ${idx >= tailStart ? "border-b-0" : ""}`}>
            <div className="bg-blue-50 text-slate-600 text-xs font-semibold px-3 py-2 w-32 flex-shrink-0 flex items-center border-r border-slate-200">{label}</div>
            <div className="text-slate-800 text-xs px-3 py-2 flex-1 flex items-center font-medium">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TraceTable({ headers, rows, containerClass, containerStyle }: {
  headers: TraceColumn[];
  rows: TraceRow[];
  containerClass?: string;
  containerStyle?: CSSProperties;
}) {
  const span = headers.length;
  const isEmpty = rows.length === 0;
  return (
    <div className={`${containerStyle ? "overflow-auto" : "overflow-x-auto"} border border-slate-200 rounded-b ${containerClass || ""}`} style={containerStyle}>
      <table className="w-full text-xs border-collapse h-full">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className={cn(`px-3 py-2 text-center font-semibold border-b border-slate-200 whitespace-nowrap ${h.bg || "bg-slate-100 text-slate-600"}`, h.align)}
                style={h.width ? { width: h.width } : {}}
              >
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isEmpty ? (
            <tr className="h-full">
              <td colSpan={span} className="text-center align-middle text-slate-400 border-r border-gray-200">데이터가 없습니다</td>
            </tr>
          ) : (
            <>
              {rows.map((row, ri) => (
                <tr key={ri} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${row._rowClass || ""}`}>
                  {row.cells.map((cell, ci) => (
                    <td key={ci} className={cn(`px-3 py-2 text-center whitespace-nowrap ${cell.className || "text-slate-700"}`, headers[ci]?.align)}>
                      {cell.content}
                    </td>
                  ))}
                </tr>
              ))}
              {/* 잔여 세로공간 흡수용 더미 행 — min-h 컨테이너에서 테이블이 하단까지 차도록 한다. */}
              <tr aria-hidden="true">
                <td colSpan={span} className="h-full p-0 border-r border-gray-200" />
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function ToneBadge({ text, type }: { text: string; type: string }) {
  const tone = TONE[type as ToneKey];
  const cls = tone ? tone.badge : "bg-slate-100 text-slate-600 border border-slate-300";
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${cls}`}>{text}</span>;
}

export function VerdictBadge({ pass }: { pass: boolean }) {
  const cls = pass ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700";
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${cls}`}>{pass ? "합격" : "불합격"}</span>;
}

export function DeviationText({ rate }: { rate: string }) {
  const v = parseFloat(rate);
  const tone = v > 0 ? "text-red-600" : v < 0 ? "text-blue-600" : "text-emerald-600";
  return <span className={`${tone} font-semibold`}>{rate}%</span>;
}

export function ListBackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded transition-colors"
    >
      ◀ 목록으로
    </button>
  );
}

export function GuideNotes({ lines }: { lines: string[] }) {
  return (
    <div className="bg-amber-50 border border-amber-300 rounded p-3 mt-3">
      {lines.map((line, i) => (
        <p key={i} className="text-xs text-amber-800 leading-relaxed mb-0.5 last:mb-0">▶ {line}</p>
      ))}
    </div>
  );
}
