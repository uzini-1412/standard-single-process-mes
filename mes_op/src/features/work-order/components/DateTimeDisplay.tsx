import { useEffect, useState } from "react";
import { format } from "date-fns";

const TICK_MS = 1_000;
const DATE_PATTERN = "yyyy.MM.dd";
const TIME_PATTERN = "HH:mm:ss";

/** 일정 주기로 갱신되는 현재 시각 훅. 시계 표시가 필요한 곳에서 재사용한다. */
function useTickingClock(intervalMs = TICK_MS) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}

/** 날짜(윗줄)·시각(아랫줄)을 큰 글씨로 보여주는 시계 패널. */
export function DateTimeDisplay() {
  const now = useTickingClock();
  const rows = [format(now, DATE_PATTERN), format(now, TIME_PATTERN)];

  return (
    <div className="flex items-center justify-center border-2 border-gray-300 rounded-lg px-8 py-6 bg-white min-w-[280px]">
      <div className="text-center">
        {rows.map((text, idx) => (
          <div
            key={text + idx}
            className={`text-3xl font-bold text-gray-900${idx > 0 ? " mt-1" : ""}`}
          >
            {text}
          </div>
        ))}
      </div>
    </div>
  );
}
