import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * 서버 페이징 컨트롤 (DataTable과 분리된 서버 페이징 전용)
 * - 0-based page 인덱스 (백엔드 PageResponse 규격)
 * - <<, >> : 첫/끝 페이지로 즉시 이동
 * - <, >   : 표시되는 페이지 번호 창(window)만 이동 (실제 페이지는 바뀌지 않음)
 * - 숫자 버튼 클릭 시 실제 페이지 이동
 */
export interface ServerPaginationProps {
  page: number;          // 0-based
  size: number;
  totalElements: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSizeChange?: (size: number) => void;
  sizeOptions?: number[];
  loading?: boolean;
  windowSize?: number; // 한 번에 보여줄 페이지 버튼 개수
}

const DEFAULT_SIZE_OPTIONS = [50, 100, 200, 300];

/** 주어진 페이지를 창 가운데에 두는 창 시작 인덱스(0-based, 경계 보정 포함). */
function centeredWindowStart(page: number, totalPages: number, windowSize: number): number {
  const lastPossibleStart = totalPages - windowSize;
  return Math.max(0, Math.min(page - Math.floor(windowSize / 2), lastPossibleStart));
}

export function ServerPagination({
  page,
  size,
  totalElements,
  totalPages,
  onPageChange,
  onSizeChange,
  sizeOptions = DEFAULT_SIZE_OPTIONS,
  loading = false,
  windowSize = 5,
}: ServerPaginationProps) {
  // 표시되는 페이지 버튼 창의 시작 번호 (0-based)
  const [windowStart, setWindowStart] = useState<number>(() =>
    totalPages <= 0 ? 0 : centeredWindowStart(page, totalPages, windowSize)
  );

  // 현재 페이지가 창 밖으로 나가면 창을 다시 가운데로 맞춘다(재조회 등).
  useEffect(() => {
    if (totalPages <= 0) return;
    const outOfWindow = page < windowStart || page >= windowStart + windowSize;
    if (outOfWindow) {
      const next = centeredWindowStart(page, totalPages, windowSize);
      setWindowStart(next < 0 ? 0 : next);
    }
  }, [page, totalPages, windowSize]);

  if (totalPages <= 0) return null;

  const maxStart = Math.max(0, totalPages - windowSize);
  const fromPage = Math.max(0, Math.min(windowStart, maxStart));
  const toPage = Math.min(totalPages - 1, fromPage + windowSize - 1);

  const hasPrevWindow = fromPage > 0;
  const hasNextWindow = toPage < totalPages - 1;
  const isLastPage = page >= totalPages - 1;

  const shiftWindow = (direction: -1 | 1) => {
    if (direction < 0 && !hasPrevWindow) return;
    if (direction > 0 && !hasNextWindow) return;
    const moved = fromPage + direction * windowSize;
    setWindowStart(Math.min(maxStart, Math.max(0, moved)));
  };

  const stepBtn =
    "h-8 w-8 flex items-center justify-center rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40";
  const edgeBtn =
    "h-8 px-2 text-xs rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40";

  const numberButtons = [];
  for (let p = fromPage; p <= toPage; p++) {
    const isCurrent = p === page;
    numberButtons.push(
      <button
        key={p}
        onClick={() => onPageChange(p)}
        disabled={loading || isCurrent}
        className={
          "min-w-[32px] h-8 px-2 text-xs rounded border transition-colors " +
          (isCurrent
            ? "bg-slate-800 text-white border-slate-800"
            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50")
        }
      >
        {p + 1}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between px-2 py-2 text-xs text-slate-600">
      <div className="flex items-center gap-2">
        {onSizeChange && (
          <select
            value={size}
            onChange={(e) => onSizeChange(Number(e.target.value))}
            disabled={loading}
            className="h-7 px-2 border border-slate-300 rounded bg-white text-xs"
          >
            {sizeOptions.map((s) => (
              <option key={s} value={s}>
                {s}건/쪽
              </option>
            ))}
          </select>
        )}
        <span>
          총 <span className="font-semibold text-slate-800">{totalElements.toLocaleString()}</span>건
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(0)}
          disabled={loading || page === 0}
          title="첫 페이지"
          className={edgeBtn}
        >
          {"<<"}
        </button>
        <button
          onClick={() => shiftWindow(-1)}
          disabled={loading || !hasPrevWindow}
          title="이전 페이지 번호들 보기"
          className={stepBtn}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {numberButtons}
        <button
          onClick={() => shiftWindow(1)}
          disabled={loading || !hasNextWindow}
          title="다음 페이지 번호들 보기"
          className={stepBtn}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(totalPages - 1)}
          disabled={loading || isLastPage}
          title="마지막 페이지"
          className={edgeBtn}
        >
          {">>"}
        </button>
      </div>
    </div>
  );
}
