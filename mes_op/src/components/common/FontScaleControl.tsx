import { Minus, Plus, Type } from "lucide-react";
import type { FontScaleApi } from "./useFontScale";

// 화면 글씨 크기를 A−/A＋ 로 조절하는 작은 컨트롤. 헤더 우측에 둔다.
// 가운데 퍼센트 배지를 누르면 기본(100%)으로 되돌린다.
type Props = Pick<FontScaleApi, "scale" | "inc" | "dec" | "reset" | "min" | "max">;

export function FontScaleControl({ scale, inc, dec, reset, min, max }: Props) {
  const percent = Math.round(scale * 100);

  return (
    <div className="flex items-center gap-1 rounded-lg bg-white/10 px-1.5 py-1">
      <Type className="mr-0.5 h-4 w-4 text-white/70" aria-hidden />
      <button
        type="button"
        onClick={dec}
        disabled={scale <= min}
        title="글씨 작게"
        className="flex h-7 w-7 items-center justify-center rounded text-white hover:bg-white/20 disabled:opacity-30"
      >
        <Minus className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={reset}
        title="기본 크기로"
        className="min-w-[48px] rounded px-1 text-center text-sm font-semibold text-white hover:bg-white/20"
      >
        {percent}%
      </button>
      <button
        type="button"
        onClick={inc}
        disabled={scale >= max}
        title="글씨 크게"
        className="flex h-7 w-7 items-center justify-center rounded text-white hover:bg-white/20 disabled:opacity-30"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
