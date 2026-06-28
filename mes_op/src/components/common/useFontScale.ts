import { useCallback, useEffect, useState } from "react";

// 현황/요약 화면 전체의 글씨·요소 크기를 한 번에 키우고 줄이기 위한 훅.
// 값은 localStorage에 저장돼 키오스크를 다시 띄워도 마지막 배율이 유지된다.
// 적용은 화면 루트에 style={{ zoom: scale }} 로 걸어 텍스트·여백·차트까지 함께 확대한다.

const STORAGE_KEY = "op.dashboard.fontScale";
const MIN = 0.8;
const MAX = 1.6;
const STEP = 0.1;
const DEFAULT = 1;

const clamp = (v: number) => Math.min(MAX, Math.max(MIN, Math.round(v * 10) / 10));

function readInitial(): number {
  if (typeof window === "undefined") return DEFAULT;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const n = raw ? parseFloat(raw) : DEFAULT;
  return Number.isFinite(n) ? clamp(n) : DEFAULT;
}

export interface FontScaleApi {
  scale: number;
  inc: () => void;
  dec: () => void;
  reset: () => void;
  min: number;
  max: number;
}

export function useFontScale(): FontScaleApi {
  const [scale, setScale] = useState<number>(readInitial);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(scale));
  }, [scale]);

  const inc = useCallback(() => setScale((s) => clamp(s + STEP)), []);
  const dec = useCallback(() => setScale((s) => clamp(s - STEP)), []);
  const reset = useCallback(() => setScale(DEFAULT), []);

  return { scale, inc, dec, reset, min: MIN, max: MAX };
}
