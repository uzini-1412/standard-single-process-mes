import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

interface CollapsibleSectionProps {
  /** 헤더에 보일 제목 */
  title: ReactNode;
  /** 처음 펼친 상태로 둘지 (근거/내역 표는 보통 접어 둔다) */
  defaultOpen?: boolean;
  /** 헤더 오른쪽에 보여줄 요약 문구(접힌 상태에서도 핵심값을 보이게) */
  summary?: ReactNode;
  children: ReactNode;
  className?: string;
}

// 차트의 산출 근거 / 내역 조회용 표를 접었다 펼 수 있게 감싸는 공용 패널.
// 표만 단독으로 보여줄 화면에는 쓰지 않는다(차트의 보조일 때만 사용).
export function CollapsibleSection({
  title,
  defaultOpen = false,
  summary,
  children,
  className = "",
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 bg-slate-50 px-4 py-3 text-left hover:bg-slate-100"
      >
        <span className="flex items-center gap-2 font-semibold text-slate-800">
          <ChevronDown
            className={`h-4 w-4 text-slate-500 transition-transform ${open ? "" : "-rotate-90"}`}
          />
          {title}
        </span>
        {summary != null && <span className="text-sm text-slate-500">{summary}</span>}
      </button>
      {open && <div className="border-t border-gray-200 p-4">{children}</div>}
    </section>
  );
}
