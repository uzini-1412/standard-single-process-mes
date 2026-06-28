import type { ReactNode } from "react";
import { format } from "date-fns";
import { Header } from "./Header";
import { Button } from "../../../components/common/Button";
import { CollapsibleSection } from "../../../components/common/CollapsibleSection";
import { FontScaleControl } from "../../../components/common/FontScaleControl";
import { useFontScale } from "../../../components/common/useFontScale";
import { KpiGauge } from "../../../components/charts/KpiGauge";
import { CategoryDonut } from "../../../components/charts/CategoryDonut";
import { KPI_COLORS } from "../../../components/charts/chartTheme";
import { ProductionWrapUpProps } from "@/types/workCompletion.interface";
import { useProductionWrapUp } from "./wrapUp/useProductionWrapUp";

const toNumber = (v: string | number) =>
  parseFloat(String(v).replace(/[^0-9.\-]/g, "")) || 0;

// 라벨/값 2열 표 (차트의 산출 근거·내역으로 접기 안에 넣는다).
function KeyValueTable({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <table className="w-full border-collapse text-sm">
      <tbody>
        {rows.map((row, idx) => (
          <tr key={idx} className="border-b border-gray-100 last:border-b-0">
            <th className="w-40 bg-slate-50 px-3 py-2 text-left font-medium text-slate-600">
              {row.label}
            </th>
            <td className="px-3 py-2 text-slate-900">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// 양품/불량 등 수량 입력 칸.
function NumberField({
  label,
  required,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-slate-600">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-gray-300 px-3 py-2 text-center focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
      />
    </label>
  );
}

// 읽기 전용 수치 칸.
function ReadField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-center text-slate-900">
        {value}
      </div>
    </div>
  );
}

export function ProductionWrapUp({ onBack, onHome, orderNumber, workOrderData }: ProductionWrapUpProps) {
  const wrapUp = useProductionWrapUp({ onHome, orderNumber, workOrderData });
  const font = useFontScale();

  // 생산현황(메타) — 근거/내역 성격이라 접어 둔다.
  const productionRows = [
    { label: "제품구분", value: wrapUp.productCategory },
    { label: "라인구분", value: wrapUp.lineCategory },
    { label: "작업일", value: wrapUp.workDate },
    { label: "품번", value: wrapUp.itemCode },
    { label: "품명", value: wrapUp.itemName },
    { label: "지시량", value: wrapUp.orderQty },
    { label: "생산량", value: wrapUp.productionQty },
    { label: "생산 Lot-No", value: wrapUp.lotNo },
    { label: "제품보관위치", value: wrapUp.storageLocation },
  ];

  // 가동현황 상세 — 비가동 유형별 도넛의 산출 근거.
  const operationRows = [
    { label: "지시량", value: wrapUp.orderQty },
    { label: "생산량", value: wrapUp.productionQty },
    { label: "가동시간", value: wrapUp.operationTime },
    { label: "비가동시간", value: wrapUp.nonOperationTime },
    ...wrapUp.downtimeTypes.map((dt) => ({ label: dt.label, value: dt.value })),
  ];

  // 비가동 유형별 시간(분) — 값이 있는 유형만 도넛으로.
  const downtimeChart = wrapUp.downtimeTypes
    .map((dt) => ({ name: dt.label, value: toNumber(dt.value) }))
    .filter((d) => d.value > 0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ zoom: font.scale }}>
      <Header
        helpKey="op-work-completion"
        onBackClick={onBack}
        showBackButton={true}
        extraButtons={<FontScaleControl {...font} />}
      />

      <div className="mx-auto w-full max-w-6xl flex-1 space-y-5 p-6">
        {/* 제목 */}
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-4 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            {format(wrapUp.currentTime, "yyyy. M. d. HH:mm")} · {orderNumber} 작업완료
          </h1>
        </div>

        {/* 핵심 지표 게이지 — 표 숫자 대신 한눈에 */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiGauge label="생산달성율" value={toNumber(wrapUp.productionAchievementRate)} color={KPI_COLORS.achievement} />
          <KpiGauge label="가동율" value={toNumber(wrapUp.operationRate)} color={KPI_COLORS.operation} />
          <KpiGauge label="양품율" value={toNumber(wrapUp.goodRate)} color={KPI_COLORS.good} />
          <KpiGauge label="불량률" value={toNumber(wrapUp.defectRate)} color={KPI_COLORS.defect} />
        </div>

        {/* 품질 입력 — 작업완료에 필요한 입력이라 항상 보이게 */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-800">품질 입력</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            <ReadField label="검사수량" value={wrapUp.inspectionQty} />
            <NumberField label="양품수량" required value={wrapUp.goodQty} onChange={wrapUp.setGoodQty} />
            <NumberField label="불량수량" required value={wrapUp.defectQty} onChange={wrapUp.onDefectQtyChange} />
            <NumberField label="외관불량" value={wrapUp.appearanceDefect} onChange={wrapUp.onAppearanceDefectChange} />
            <NumberField label="치수불량" value={wrapUp.dimensionDefect} onChange={wrapUp.onDimensionDefectChange} />
          </div>
        </div>

        {/* 산출 근거 / 내역 — 접어서 제공 */}
        <CollapsibleSection title="생산현황 상세" summary={`${wrapUp.itemName || "-"} · 생산량 ${wrapUp.productionQty}`}>
          <KeyValueTable rows={productionRows} />
        </CollapsibleSection>

        <CollapsibleSection title="가동현황 상세" summary={`가동 ${wrapUp.operationTime || "-"} / 비가동 ${wrapUp.nonOperationTime || "-"}`}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-slate-600">비가동 유형별 시간</p>
              <CategoryDonut data={downtimeChart} unit="분" height={220} />
            </div>
            <KeyValueTable rows={operationRows} />
          </div>
        </CollapsibleSection>

        {/* 액션 */}
        <div className="flex justify-center pt-2">
          <Button
            className="rounded-lg bg-slate-900 px-16 py-4 text-lg font-bold text-white hover:bg-slate-800"
            data-help="op-work-completion-action"
            onClick={wrapUp.submitWrapUp}
          >
            작업완료 확인
          </Button>
        </div>
      </div>
    </div>
  );
}
