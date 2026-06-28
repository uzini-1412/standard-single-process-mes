import { format } from "date-fns";
import { HelpButton } from "../../../components/common/HelpButton";
import { FontScaleControl } from "../../../components/common/FontScaleControl";
import { useFontScale } from "../../../components/common/useFontScale";
import { CategoryDonut } from "../../../components/charts/CategoryDonut";
import { STATUS_COLORS } from "../../../components/charts/chartTheme";
import { ProductionProgressBoardProps } from "@/types/workProgress.interface";
import type { WorkProgressRow } from "@/types/workProgress.interface";
import { ProgressBoardTable } from "./ProgressBoardTable";
import { useLiveClock, useProgressFeed } from "./useProductionProgress";

// 표시 순서를 고정해 차트/요약 칩의 색과 순서를 일관되게 유지한다.
const STATUS_ORDER = ["작업대기", "작업진행중", "작업완료", "작업중지"] as const;

function countByStatus(rows: WorkProgressRow[]) {
  return STATUS_ORDER.map((status) => ({
    name: status,
    value: rows.filter((r) => r.workStatus === status).length,
  }));
}

// 상단 바: 도움말 + 타이틀 + 글씨크기 조절 + 이전
function BoardTopBar({ onBack, font }: { onBack: () => void; font: ReturnType<typeof useFontScale> }) {
  return (
    <header className="bg-slate-900 px-8 py-4 flex items-center justify-between">
      <div className="flex-1 flex items-center">
        <HelpButton pageKey="op-progress-status" />
      </div>
      <h1 className="text-white text-xl font-bold flex-1 text-center">MES 생산정보시스템</h1>
      <div className="flex-1 flex justify-end items-center gap-3">
        <FontScaleControl {...font} />
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium"
          onClick={onBack}
        >
          이전
        </button>
      </div>
    </header>
  );
}

// 작업상태 건수를 색 칩으로 요약.
function StatusChips({ counts }: { counts: { name: string; value: number }[] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {counts.map((c) => (
        <div
          key={c.name}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-sm"
        >
          <span className="h-3 w-3 rounded-full" style={{ background: STATUS_COLORS[c.name] }} />
          <span className="text-sm font-medium text-slate-600">{c.name}</span>
          <span className="text-lg font-bold text-slate-900">{c.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ProductionProgressBoard({ onBack }: ProductionProgressBoardProps) {
  const now = useLiveClock();
  const { rows, loading } = useProgressFeed();
  const font = useFontScale();

  const headline = `${format(now, "yyyy. M. dd. HH:mm")} 현재 작업진행 현황입니다.`;
  const statusCounts = countByStatus(rows);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ zoom: font.scale }}>
      <BoardTopBar onBack={onBack} font={font} />

      <div className="p-6 flex flex-col flex-1 gap-5">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">{headline}</h2>
        </div>

        {/* 작업상태 요약: 칩 + 분포 도넛 */}
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <StatusChips counts={statusCounts} />
          <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm lg:w-72">
            <p className="mb-1 text-center text-sm font-medium text-slate-600">작업상태 분포</p>
            <CategoryDonut data={statusCounts} colorByName={STATUS_COLORS} unit="건" height={200} />
          </div>
        </div>

        {/* 진행 현황 표 — 보드의 본문이므로 접지 않고 그대로 노출 */}
        <div
          className="flex-1 border-2 border-gray-900 rounded-lg overflow-hidden flex flex-col"
          data-help="op-progress-status-main"
        >
          <ProgressBoardTable loading={loading} rows={rows} />
          <div className="flex-1 bg-white border-t border-gray-300"></div>
        </div>
      </div>
    </div>
  );
}
