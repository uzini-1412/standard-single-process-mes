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
import type { PurchaseStatusTrendRes } from "@/types/management/purchase.interface";

// 추이 라인의 데이터 키와 색상
const TREND_VALUE_KEY = "amount";
const TREND_LINE_COLOR = "#C7474A";

interface ChartProps {
  series: PurchaseStatusTrendRes[];
  seriesLabel: string;
  totalAmount: number;
  isLoading: boolean;
}

// 월별 매입 추이를 라인 차트로 그리는 카드
export function PurchaseTrendChart({ series, seriesLabel, totalAmount, isLoading }: ChartProps) {
  // 로딩/빈 데이터/정상 중 어떤 본문을 그릴지 결정
  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500 text-sm">
          불러오는 중...
        </div>
      );
    }
    if (series.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500 text-sm">
          데이터가 없습니다
        </div>
      );
    }
    return (
      <ResponsiveContainer>
        <LineChart data={series} margin={{ top: 10, right: 24, left: 24, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="yearMonth" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => Number(v).toLocaleString()} />
          <Tooltip
            formatter={(value: number) => [`₩ ${Math.round(value).toLocaleString()}`, seriesLabel]}
          />
          <Legend formatter={() => seriesLabel} />
          <Line
            type="monotone"
            dataKey={TREND_VALUE_KEY}
            name={seriesLabel}
            stroke={TREND_LINE_COLOR}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="bg-white border border-gray-300 rounded-md p-4 mb-3">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-gray-800">월별 매입 추이 — {seriesLabel}</div>
        <div className="text-sm text-gray-600">
          기간 합계: ₩ {Math.round(totalAmount).toLocaleString()}
        </div>
      </div>
      <div style={{ width: "100%", height: 420 }}>{renderBody()}</div>
    </div>
  );
}
