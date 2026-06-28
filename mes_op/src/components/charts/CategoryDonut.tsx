import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_PALETTE } from "./chartTheme";

export interface CategoryDatum {
  name: string;
  value: number;
}

interface CategoryDonutProps {
  data: CategoryDatum[];
  /** name → 고정색 매핑(없으면 팔레트 순환) */
  colorByName?: Record<string, string>;
  height?: number;
  unit?: string;
}

// 범주별 비중(비가동 유형, 작업상태 분포 등)을 도넛으로 보여준다.
// 값이 모두 0이면 안내 문구로 대체한다.
export function CategoryDonut({ data, colorByName, height = 240, unit = "" }: CategoryDonutProps) {
  const rows = data.filter((d) => d.value > 0);

  if (rows.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-gray-400"
        style={{ height }}
      >
        표시할 데이터가 없습니다.
      </div>
    );
  }

  const colorFor = (name: string, idx: number) =>
    colorByName?.[name] ?? CHART_PALETTE[idx % CHART_PALETTE.length];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={rows}
          dataKey="value"
          nameKey="name"
          innerRadius="55%"
          outerRadius="85%"
          paddingAngle={2}
        >
          {rows.map((row, idx) => (
            <Cell key={row.name} fill={colorFor(row.name, idx)} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number | string) => `${value}${unit}`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
