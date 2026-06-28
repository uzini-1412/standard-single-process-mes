import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";

interface KpiGaugeProps {
  label: string;
  /** 0~100 백분율 값 */
  value: number;
  color: string;
  height?: number;
}

// 단일 백분율 지표(달성율/가동율/양품율/불량률 등)를 반·원형 게이지로 강조한다.
// 표의 숫자를 나열하는 대신 한눈에 들어오는 시각 지표로 바꾸기 위한 컴포넌트.
export function KpiGauge({ label, value, color, height = 168 }: KpiGaugeProps) {
  const safe = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  const data = [{ name: label, value: safe }];

  return (
    <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="relative w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="72%"
            outerRadius="100%"
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar
              dataKey="value"
              angleAxisId={0}
              cornerRadius={10}
              fill={color}
              background={{ fill: "#eef2f6" }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>
            {safe.toFixed(1)}%
          </span>
        </div>
      </div>
      <span className="mt-1 text-sm font-medium text-gray-600">{label}</span>
    </div>
  );
}
