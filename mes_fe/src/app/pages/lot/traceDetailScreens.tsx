/**
 * LOT 추적조회 — 상세 화면(구매 LOT / 제조 LOT).
 * LotTracePage 내부 전용. 검색 화면에서 LOT 클릭 시 진입한다.
 */
import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { fetchPurchaseLotDetail, fetchMfgLotDetail } from "../../api/lotTraceApi";
import { UNITS, withUnit } from "@/app/utils/unitConvert";
import { formatNumber } from "@/app/utils/numberFormat";
import { NUMBER_ALIGN } from "@/app/styles/table-styles";
import { showError } from "@/app/utils/toast";
import type {
  PurchaseLotDetailRes,
  PurchaseInspectionItem,
  PurchaseMfgLinkItem,
  PurchaseStockItem,
  MfgLotDetailRes,
  MfgProductWeightItem,
  MfgMaterialItem,
  MfgQaItem,
  MfgShipLinkItem,
  MfgDefectItem,
} from "@/types/lot/lot-trace.interface";
import {
  PanelTitle,
  KeyValueGrid,
  TraceTable,
  VerdictBadge,
  DeviationText,
  ListBackButton,
  GuideNotes,
  type TraceColumn,
  type TraceRow,
} from "./traceUi";

// 한 셀에 흰색 헤더배경을 깔아주는 컬럼 팩토리 — 컬럼 선언 반복을 줄인다.
const col = (label: string, bg: string, extra: Partial<TraceColumn> = {}): TraceColumn => ({ label, bg, ...extra });
const numCol = (label: string, bg: string, width?: string): TraceColumn => ({ label, bg, width, align: NUMBER_ALIGN });

const Loading = () => <div className="text-center py-8 text-slate-400 text-xs">로딩 중...</div>;
const Empty = () => <div className="text-center py-8 text-slate-400 text-xs">데이터가 없습니다</div>;

function DetailCrumb({ label, lot, tone }: { label: string; lot: string; tone: string }) {
  return (
    <div>
      <span className="text-xs text-slate-500">{label}</span>
      <span className="mx-2 text-slate-300">/</span>
      <span className={`text-sm font-mono font-bold ${tone}`}>{lot}</span>
    </div>
  );
}

// ─── 구매 LOT 상세 ────────────────────────────────────────────
export function PurchaseLotDetail({ lotNo, onBack }: { lotNo: string; onBack: () => void }) {
  const [detail, setDetail] = useState<PurchaseLotDetailRes | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let alive = true;
    setBusy(true);
    fetchPurchaseLotDetail(lotNo)
      .then(res => { if (alive) setDetail(res); })
      .catch(e => {
        console.error("[PurchaseLotDetail] Error:", e);
        showError("구매 LOT 상세 조회 중 오류가 발생했습니다.");
      })
      .finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [lotNo]);

  if (busy) return <Loading />;
  if (!detail) return <Empty />;

  const info: [string, ReactNode][] = [
    ["구매 LOT-No", <span className="font-mono font-bold text-amber-700">{detail.lotNo}</span>],
    ["입고일자", detail.receiptDate || "-"],
    ["거래처명", detail.vendorName || "-"],
    ["거래처번호", detail.vendorCode || "-"],
    ["품번", <span className="font-mono">{detail.itemCode || "-"}</span>],
    ["품명", detail.itemName || "-"],
    ["발주번호", <span className="font-mono">{detail.purchaseOrderNo || "-"}</span>],
    [withUnit("발주수량", UNITS.weight), detail.orderedQty || "-"],
    [withUnit("입고수량", UNITS.weight), detail.receivedQty || "-"],
    ["창고 / 보관위치", detail.storageLocation || "-"],
  ];

  const inspectCols: TraceColumn[] = [
    col("검사번호", "bg-amber-700 text-white"),
    col("검사일자", "bg-amber-700 text-white"),
    col("검사자", "bg-amber-700 text-white"),
    numCol("시료수", "bg-amber-700 text-white"),
    col("판정", "bg-amber-700 text-white"),
  ];
  const inspectRows: TraceRow[] = (detail.inspections || []).map((r: PurchaseInspectionItem) => ({
    cells: [
      { content: <span className="font-mono">{r.inspectNo}</span> },
      { content: r.inspectDate },
      { content: r.inspectorName },
      { content: formatNumber(r.sampleCount) },
      { content: <VerdictBadge pass={r.result === "합격"} /> },
    ],
  }));

  const linkCols: TraceColumn[] = [
    col("제조 LOT", "bg-emerald-700 text-white"),
    col("투입일시", "bg-emerald-700 text-white"),
    numCol(withUnit("투입량", UNITS.weight), "bg-emerald-700 text-white"),
    numCol("표준비율%", "bg-emerald-700 text-white"),
    col("과투입율%", "bg-emerald-700 text-white"),
  ];
  const linkRows: TraceRow[] = (detail.mfgLinks || []).map((r: PurchaseMfgLinkItem) => ({
    cells: [
      { content: <span className="font-mono text-emerald-700 font-semibold">{r.mfgLotNo}</span> },
      { content: r.inputTime, className: "text-slate-500 text-xs" },
      { content: formatNumber(r.inputQty), className: "font-semibold" },
      { content: formatNumber(r.standardRatio) },
      { content: <DeviationText rate={r.overRate} /> },
    ],
  }));

  const stockCols: TraceColumn[] = [
    col("구매 LOT", "bg-blue-700 text-white"),
    col("입고일자", "bg-blue-700 text-white"),
    col("거래처", "bg-blue-700 text-white"),
    numCol(withUnit("입고수량", UNITS.weight), "bg-blue-700 text-white"),
    numCol(withUnit("투입소진", UNITS.weight), "bg-blue-700 text-white"),
    numCol(withUnit("현재고", UNITS.weight), "bg-blue-700 text-white"),
    col("재고상태", "bg-blue-700 text-white"),
    col("보관위치", "bg-blue-700 text-white"),
  ];
  const stockRows: TraceRow[] = (detail.stockByLot || []).map((r: PurchaseStockItem) => {
    const drained = r.status === "소진";
    return {
      _rowClass: drained ? "opacity-60" : "",
      cells: [
        { content: <span className="font-mono text-xs">{r.lotNo}</span> },
        { content: r.inboundDate },
        { content: r.vendorName },
        { content: formatNumber(r.receivedQty) },
        { content: formatNumber(r.consumedQty) },
        { content: <span className={`font-bold ${drained ? "text-slate-400" : "text-emerald-700"}`}>{formatNumber(r.currentQty)}</span> },
        { content: (
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${drained ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-700"}`}>
            {r.status}
          </span>
        )},
        { content: r.location },
      ],
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ListBackButton onClick={onBack} />
        <DetailCrumb label="구매 LOT 상세" lot={lotNo} tone="text-amber-700" />
      </div>

      <div>
        <PanelTitle title="구매 LOT 기본 정보" color="bg-amber-700" />
        <KeyValueGrid items={info} cols={4} bg="bg-amber-50/30" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <PanelTitle title="입고검사 결과" color="bg-amber-600" />
          <TraceTable headers={inspectCols} rows={inspectRows} />
        </div>
        <div>
          <PanelTitle title="제조 LOT 연계 현황 (투입 이력)" color="bg-emerald-700" />
          <TraceTable headers={linkCols} rows={linkRows} />
        </div>
      </div>

      <div>
        <PanelTitle title="LOT별 자재재고 잔량 현황 (동일 품번 전체 구매 LOT 표시)" color="bg-blue-700" />
        <TraceTable headers={stockCols} rows={stockRows} />
      </div>

      <GuideNotes lines={[
        "구매 LOT 번호 생성 : 가입고등록(SW_2002-1)에서 입고검사 완료 후 자동 부여. 형식: RM-YYMMDD-거래처번호-NNN",
        "제조 LOT 연계 : 원소재투입량분석(SW_2005-2)에서 LOT No. 입력 시 구매LOT ↔ 제조LOT 연결 키 생성. PLC 투입 시각 및 중량 자동 수집",
        "자재재고 잔량 : 입고수량 - 제조LOT 투입 소진량 = 현재고. 동일 품번의 모든 구매LOT 잔량 합산이 자재재고현황(SW_2004-2) 현재고와 일치해야 함",
        "재고상태 : 잔량 0 → 소진(회색), 잔량 > 0 → 재고(녹색), 잔량 < 0 → 오류(적색 알림). 적정재고 이하 시 자동 경고",
      ]} />
    </div>
  );
}

// ─── 제조 LOT 상세 ────────────────────────────────────────────
const verdictCell = (code: string): ReactNode => {
  if (code === "OK" || code === "합격") return <VerdictBadge pass={true} />;
  if (code === "NG" || code === "불합격") return <VerdictBadge pass={false} />;
  return <span>{code}</span>;
};

export function MfgLotDetail({ lotNo, onBack, onSelectPurchase }: {
  lotNo: string;
  onBack: () => void;
  onSelectPurchase: (lot: string) => void;
}) {
  const [detail, setDetail] = useState<MfgLotDetailRes | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let alive = true;
    setBusy(true);
    fetchMfgLotDetail(lotNo)
      .then(res => { if (alive) setDetail(res); })
      .catch(e => {
        console.error("[MfgLotDetail] Error:", e);
        showError("제조 LOT 상세 조회 중 오류가 발생했습니다.");
      })
      .finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [lotNo]);

  if (busy) return <Loading />;
  if (!detail) return <Empty />;

  const info: [string, ReactNode][] = [
    ["제조 LOT-No", <span className="font-mono font-bold text-emerald-700">{detail.lotNo}</span>],
    ["생산일자", detail.prodDate || "-"],
    ["품번", <span className="font-mono">{detail.itemCode || "-"}</span>],
    ["품명", detail.itemName || "-"],
    [withUnit("평량", UNITS.basisWeight), detail.basisWeight || "-"],
    [withUnit("폭", UNITS.width), detail.width || "-"],
    [withUnit("작업지시량", UNITS.length), detail.orderedQty || "-"],
    [withUnit("실생산량", UNITS.length), <span className="font-bold text-emerald-700">{detail.actualQty || "-"}</span>],
    ["라인 / 작업시간", detail.lineTime || "-"],
    ["양품 / 불량", detail.goodDefect || "-"],
    [withUnit("생산속도", UNITS.productionSpeed), detail.speed || "-"],
    [withUnit("관리평량", UNITS.basisWeight), detail.managedWeight || "-"],
  ];

  const weightCols: TraceColumn[] = [
    col("제조LOT-No", "bg-slate-700 text-white"),
    col("Roll No", "bg-slate-700 text-white", { width: "70px" }),
    numCol(withUnit("폭", UNITS.width), "bg-slate-700 text-white", "80px"),
    numCol(withUnit("길이", UNITS.length), "bg-slate-700 text-white", "80px"),
    numCol(withUnit("평량", UNITS.basisWeight), "bg-slate-700 text-white", "90px"),
    numCol(withUnit("순중량", UNITS.weight), "bg-slate-700 text-white", "90px"),
    numCol(withUnit("총중량", UNITS.weight), "bg-slate-700 text-white", "90px"),
    col("판정", "bg-slate-700 text-white", { width: "70px" }),
    col("생산일", "bg-slate-700 text-white", { width: "100px" }),
  ];
  const weightRows: TraceRow[] = (detail.productWeights || []).map((r: MfgProductWeightItem) => ({
    _rowClass: r.judgeCode === "NG" ? "bg-red-50" : "",
    cells: [
      { content: <span className="font-mono font-semibold text-emerald-700">{r.lotNo}</span> },
      { content: r.rollNo },
      { content: formatNumber(r.prodWidth) },
      { content: formatNumber(r.prodLength) },
      { content: formatNumber(r.realBasisWeight) },
      { content: formatNumber(r.netWeight) },
      { content: formatNumber(r.grossWeight) },
      { content: verdictCell(r.judgeCode) },
      { content: r.workDate },
    ],
  }));

  const materialCols: TraceColumn[] = [
    col("구매 LOT", "bg-amber-700 text-white"),
    col("품번", "bg-amber-700 text-white"),
    col("소재구분", "bg-amber-700 text-white"),
    numCol("표준비율%", "bg-amber-700 text-white"),
    numCol(withUnit("투입량", UNITS.weight), "bg-amber-700 text-white"),
    col("과투입율%", "bg-amber-700 text-white"),
  ];
  const materialRows: TraceRow[] = (detail.materials || []).map((r: MfgMaterialItem) => ({
    cells: [
      { content: (
        <button
          onClick={() => onSelectPurchase(r.purchaseLotNo)}
          className="font-mono text-xs text-amber-700 hover:text-amber-900 hover:underline font-semibold transition-colors"
        >
          {r.purchaseLotNo}
        </button>
      )},
      { content: <span className="font-mono">{r.itemCode}</span> },
      { content: r.materialType },
      { content: formatNumber(r.standardRatio) },
      { content: formatNumber(r.inputQty), className: "font-semibold" },
      { content: <DeviationText rate={r.overRate} /> },
    ],
  }));

  const qaCols: TraceColumn[] = [
    col("검사구분", "bg-emerald-700 text-white"),
    col("검사시각", "bg-emerald-700 text-white"),
    col("검사항목", "bg-emerald-700 text-white"),
    col("기준치", "bg-emerald-700 text-white"),
    col("측정치", "bg-emerald-700 text-white"),
    col("판정", "bg-emerald-700 text-white"),
  ];
  const qaRows: TraceRow[] = (detail.qaResults || []).map((r: MfgQaItem, i: number) => ({
    _rowClass: i % 2 === 0 ? "bg-emerald-50/30" : "",
    cells: [
      { content: <span className="font-semibold text-emerald-800">{r.inspectType}</span> },
      { content: r.inspectTime, className: "text-slate-500" },
      { content: r.inspectItem },
      { content: r.standard, className: "text-slate-500" },
      { content: <span className="font-bold">{r.measured}</span> },
      { content: <VerdictBadge pass={r.pass} /> },
    ],
  }));
  if (detail.qaLotNo) {
    qaRows.push({
      _rowClass: "bg-emerald-100/50",
      cells: [
        { content: <span className="font-bold text-emerald-800">자주검사 Lot-No</span> },
        { content: <span className="font-mono font-bold text-emerald-700">{detail.qaLotNo}</span> },
        { content: "" }, { content: "" }, { content: "" }, { content: "" },
      ],
    });
  }

  const shipCols: TraceColumn[] = [
    col("출하 LOT", "bg-orange-700 text-white"),
    col("출하일자", "bg-orange-700 text-white"),
    col("거래처명", "bg-orange-700 text-white"),
    numCol(withUnit("출하량", UNITS.length), "bg-orange-700 text-white"),
    col("출하검사", "bg-orange-700 text-white"),
    col("연계 수주번호", "bg-orange-700 text-white"),
  ];
  const shipRows: TraceRow[] = (detail.shipLinks || []).map((r: MfgShipLinkItem) => ({
    cells: [
      { content: <span className="font-mono text-xs">{r.shipLotNo}</span> },
      { content: r.shipDate },
      { content: r.customerName },
      { content: <span className="font-semibold">{formatNumber(r.shippedQty)}</span> },
      { content: verdictCell(r.qaResult) },
      { content: <span className="font-mono text-orange-700 font-bold">{r.salesOrderNo}</span> },
    ],
  }));

  const defectCols: TraceColumn[] = [
    col("불량유형", "bg-red-700 text-white"),
    numCol("수량(m)", "bg-red-700 text-white"),
    col("발생날짜", "bg-red-700 text-white"),
    col("조치내용", "bg-red-700 text-white"),
  ];
  const defectRows: TraceRow[] = (detail.defects || []).map((r: MfgDefectItem) => ({
    cells: [
      { content: r.defectType, className: "font-semibold text-red-700" },
      { content: <span className="font-bold text-red-700">{formatNumber(r.qty)}</span> },
      { content: r.occurTime, className: "text-slate-500" },
      { content: r.action },
    ],
  }));

  const defectList = detail.defects || [];
  const defectTotal = defectList.reduce((sum, r) => sum + (parseFloat(r.qty) || 0), 0);
  const producedQty = parseFloat(detail.actualQty) || 0;
  const defectRate = producedQty > 0 ? ((defectTotal / producedQty) * 100).toFixed(2) : "0.00";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ListBackButton onClick={onBack} />
        <DetailCrumb label="제조 LOT 상세" lot={lotNo} tone="text-emerald-700" />
      </div>

      <div>
        <PanelTitle title="제조 LOT 기본 정보" color="bg-emerald-800" />
        <KeyValueGrid items={info} cols={4} bg="bg-emerald-50/20" />
      </div>

      <div>
        <PanelTitle title="제품중량 현황 (해당 작업지시에서 생산된 제품 LOT)" color="bg-slate-700" />
        <TraceTable headers={weightCols} rows={weightRows} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <PanelTitle title="원소재 투입 현황 (구매 LOT 연계)" color="bg-amber-700" />
          <TraceTable headers={materialCols} rows={materialRows} />
          <p className="text-xs text-slate-400 mt-1 px-1">구매 LOT 클릭 시 구매 LOT 상세로 이동</p>
        </div>
        <div>
          <PanelTitle title="품질 검사 현황 (자주검사 초·중·종)" color="bg-emerald-700" />
          <TraceTable headers={qaCols} rows={qaRows} />
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3">
          <PanelTitle title="출하 연계 현황 (동일 제조 LOT 출하 이력)" color="bg-orange-700" />
          <TraceTable headers={shipCols} rows={shipRows} />
        </div>
        <div className="col-span-2">
          <PanelTitle title="공정 불량 현황" color="bg-red-700" />
          <TraceTable headers={defectCols} rows={defectRows} />
          {defectList.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-b p-2 flex items-center gap-4 text-xs -mt-px">
              <span className="text-red-600">총 불량 <strong>{defectTotal}m</strong></span>
              <span className="text-slate-500">불량율</span>
              <span className="text-red-700 font-bold">{defectRate}%</span>
            </div>
          )}
        </div>
      </div>

      <GuideNotes lines={[
        "원소재 투입 : 구매 LOT-No 컬럼은 원소재투입량분석(SW_2005-2)에서 LOT No. 입력 → 작업지시(SW_3003-1) 연계로 자동 매핑. 미입력 시 '-' 표시",
        "품질검사 : 자주검사(SW_4002)의 초·중·종품 결과 자동 연계. 자주검사 Lot-No는 해당 검사의 추적 식별자. 불합격 시 적색 강조",
        "출하 연계 : 동일 제조 LOT-No로 출하된 출하실적(SW_5003) 자동 연계. 수주번호는 출하 배정 시 연결된 역참조값",
        "공정 불량 : 공정불량현황(SW_3006)에서 동일 제조 LOT 불량 이력 자동 연계. 불량율 = 불량수량 / 생산량 × 100",
      ]} />
    </div>
  );
}
