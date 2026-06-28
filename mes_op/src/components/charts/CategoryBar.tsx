import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_PALETTE } from "./chartTheme";
import type { CategoryDatum } from "./CategoryDonut";

interface CategoryBarProps {
  data: CategoryDatum[];
  colorByName?: Record<string, string>;
  height?: number;
  unit?: string;
}

// 범주별 수치를 막대로 비교한다(작업상태 건수, 비가동 시간 등).
// 도넛이 비중을, 막대가 절대량을 보여주는 용도로 나눠 쓴다.
export function CategoryBar({ data, colorByName, height = 240, unit = "" }: CategoryBarProps) {
  const rows = data.filter((d) => d.value > 0);

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-400" style={{ height }}>
        표시할 데이터가 없습니다.
      </div>
    );
  }

  const colorFor = (name: string, idx: number) =>
    colorByName?.[name] ?? CHART_PALETTE[idx % CHART_PALETTE.length];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f6" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={36} />
        <Tooltip formatter={(value: number | string) => `${value}${unit}`} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={56}>
          {rows.map((row, idx) => (
            <Cell key={row.name} fill={colorFor(row.name, idx)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
