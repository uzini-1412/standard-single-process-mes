import { useEffect, useState, type ReactNode } from "react";

interface SlideOverPanelProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** 패널 폭(Tailwind 클래스). 표가 많은 화면은 넓게 준다. */
  widthClass?: string;
}

// 작업 화면 위로 우측에서 밀려나오는 공용 슬라이드 드로어.
// open=false 가 되면 슬라이드 아웃 애니메이션을 보여준 뒤 언마운트한다(맥락 유지·화면이동 없음).
export function SlideOverPanel({ open, onClose, children, widthClass = "w-[92vw] max-w-6xl" }: SlideOverPanelProps) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      // 다음 프레임에 transform 을 풀어 슬라이드 인이 보이게 한다.
      const id = window.requestAnimationFrame(() => setShown(true));
      return () => window.cancelAnimationFrame(id);
    }
    setShown(false);
    const timer = window.setTimeout(() => setMounted(false), 280);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* 뒤 작업 화면을 살짝 가리는 배경(클릭 시 닫힘) */}
      <div
        className={`flex-1 bg-black/40 transition-opacity duration-300 ${shown ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      {/* 우측 슬라이드 패널 */}
      <aside
        className={`flex h-full ${widthClass} flex-col overflow-y-auto bg-gray-50 shadow-2xl transition-transform duration-300 ${
          shown ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {children}
      </aside>
    </div>
  );
}
