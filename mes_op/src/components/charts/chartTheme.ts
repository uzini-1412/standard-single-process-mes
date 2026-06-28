// 현황·요약 화면 차트가 공유하는 색 팔레트.
// 의미가 있는 지표는 의미색을, 범주형은 PALETTE 순환색을 쓴다.
export const CHART_PALETTE = [
  "#0ea5e9", // sky
  "#14b8a6", // teal
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#22c55e", // green
  "#64748b", // slate
  "#eab308", // yellow
];

// 작업상태별 고정 색 (진행현황 보드 차트에서 사용)
export const STATUS_COLORS: Record<string, string> = {
  작업대기: "#94a3b8",
  작업진행중: "#0ea5e9",
  작업완료: "#22c55e",
  작업중지: "#ef4444",
};

export const KPI_COLORS = {
  achievement: "#0ea5e9", // 생산달성율
  operation: "#14b8a6", // 가동율
  good: "#22c55e", // 양품율
  defect: "#ef4444", // 불량률
};
