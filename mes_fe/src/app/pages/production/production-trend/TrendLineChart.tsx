/** 생산추이도 상단 라인 차트(라인별 + 종합 계열) 표시 영역. */
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
import {
  SERIES_PALETTE,
  TOTAL_SERIES_KEY,
  TOTAL_SERIES_LABEL,
} from "./trendChartHelpers";

interface TrendLineChartProps {
  isLoading: boolean;
  activeLines: string[];
  chartSeries: Record<string, number | string>[];
}

/** 종합 키를 라벨로 치환하는 공통 표시 함수. */
const renderSeriesName = (name: string) =>
  name === TOTAL_SERIES_KEY ? TOTAL_SERIES_LABEL : name;

export function TrendLineChart({ isLoading, activeLines, chartSeries }: TrendLineChartProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        불러오는 중...
      </div>
    );
  }

  if (activeLines.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        데이터가 없습니다
      </div>
    );
  }

  return (
    <ResponsiveContainer>
      <LineChart data={chartSeries} margin={{ top: 10, right: 24, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => Number(v).toLocaleString()}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            `${Math.round(value).toLocaleString()} m`,
            renderSeriesName(name),
          ]}
        />
        <Legend formatter={(value: string) => renderSeriesName(value)} />
        {activeLines.map((line, idx) => (
          <Line
            key={line}
            type="monotone"
            dataKey={line}
            stroke={SERIES_PALETTE[idx % SERIES_PALETTE.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
        <Line
          key={TOTAL_SERIES_KEY}
          type="monotone"
          dataKey={TOTAL_SERIES_KEY}
          stroke="#111827"
          strokeWidth={2}
          strokeDasharray="5 3"
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
