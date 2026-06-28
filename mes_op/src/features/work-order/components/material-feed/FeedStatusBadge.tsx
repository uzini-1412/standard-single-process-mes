import { FEED_STATUS_STYLES, type FeedStatus } from "./feedHelpers";

// 투입 상태를 색상 배지로 표시하는 작은 표시용 컴포넌트
export function FeedStatusBadge({ status }: { status: FeedStatus }) {
  const style = FEED_STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${style.cls}`}>
      {style.label}
    </span>
  );
}
