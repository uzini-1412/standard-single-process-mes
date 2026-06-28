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
import type { SalesStatusTrendRes } from "@/types/management/sales.interface";

// recharts 라인 차트가 읽을 데이터 키와 선 색상
const AMOUNT_KEY = "amount";
const LINE_STROKE = "#4A5CC7";

interface SalesTrendChartProps {
  series: SalesStatusTrendRes[];
  loading: boolean;
  seriesLabel: string;
  total: number;
}

export function SalesTrendChart({ series, loading, seriesLabel, total }: SalesTrendChartProps) {
  return (
    <div className="bg-white border border-gray-300 rounded-md p-4 mb-3">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-gray-800">
          월별 매출 추이 — {seriesLabel}
        </div>
        <div className="text-sm text-gray-600">
          기간 합계: ₩ {Math.round(total).toLocaleString()}
        </div>
      </div>
      <div style={{ width: "100%", height: 420 }}>
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            불러오는 중...
          </div>
        ) : series.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            데이터가 없습니다
          </div>
        ) : (
          <ResponsiveContainer>
            <LineChart data={series} margin={{ top: 10, right: 24, left: 24, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="yearMonth" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => Number(v).toLocaleString()}
              />
              <Tooltip
                formatter={(value: number) => [
                  `₩ ${Math.round(value).toLocaleString()}`,
                  seriesLabel,
                ]}
              />
              <Legend formatter={() => seriesLabel} />
              <Line
                type="monotone"
                dataKey={AMOUNT_KEY}
                name={seriesLabel}
                stroke={LINE_STROKE}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
