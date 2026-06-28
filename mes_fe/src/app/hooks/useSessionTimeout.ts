import { useCallback, useEffect, useRef, useState } from 'react';

const IDLE_LIMIT_MS = 30 * 60 * 1000; // 30분
const TICK_MS = 1_000;

// 사용자 활동으로 간주해 타이머를 늘리는 이벤트
const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
] as const;

// 남은 밀리초 → "MM:SS"
function formatClock(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function useSessionTimeout(onTimeout: () => void) {
  const [remainingMs, setRemainingMs] = useState(IDLE_LIMIT_MS);
  // 만료 예정 시각(now + 남은시간). 활동이 있을 때마다 뒤로 민다.
  const deadlineRef = useRef(Date.now() + IDLE_LIMIT_MS);

  const resetTimer = useCallback(() => {
    deadlineRef.current = Date.now() + IDLE_LIMIT_MS;
    setRemainingMs(IDLE_LIMIT_MS);
  }, []);

  useEffect(() => {
    const bumpDeadline = () => {
      deadlineRef.current = Date.now() + IDLE_LIMIT_MS;
    };
    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, bumpDeadline, { passive: true }),
    );

    // 1초마다 남은 시간을 다시 계산한다.
    const intervalId = window.setInterval(() => {
      const left = Math.max(0, deadlineRef.current - Date.now());
      setRemainingMs(left);
      if (left <= 0) onTimeout();
    }, TICK_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((evt) =>
        window.removeEventListener(evt, bumpDeadline),
      );
      window.clearInterval(intervalId);
    };
  }, [onTimeout]);

  return { remainingMs, displayTime: formatClock(remainingMs), resetTimer };
}
