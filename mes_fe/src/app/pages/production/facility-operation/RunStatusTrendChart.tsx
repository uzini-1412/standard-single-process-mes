/** 설비가동현황 그래프 탭 — 일자별 가동/비가동시간 꺾은선 차트. */
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyRunSummary } from "./runStatusHelpers";

const OPERATING_COLOR = "#22C55E";
const DOWNTIME_COLOR = "#EF4444";

interface RunStatusTrendChartProps {
  isLoading: boolean;
  data: DailyRunSummary[];
}

export function RunStatusTrendChart({ isLoading, data }: RunStatusTrendChartProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        불러오는 중...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        데이터가 없습니다
      </div>
    );
  }

  return (
    <ResponsiveContainer>
      <LineChart data={data} margin={{ top: 10, right: 24, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="workDate" tick={{ fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => Number(v).toLocaleString()}
        />
        <Tooltip
          formatter={(value: number, name: string) => [`${Math.round(value).toLocaleString()}분`, name]}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="opMinutes"
          name="가동시간(분)"
          stroke={OPERATING_COLOR}
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="dtMinutes"
          name="비가동시간(분)"
          stroke={DOWNTIME_COLOR}
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
