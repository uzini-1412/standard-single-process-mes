import type { ReactNode } from "react";
import { cn } from "../ui/utils";

interface FormSectionProps {
  /** 섹션 제목(예: "기본정보"). 미지정 시 제목줄을 렌더하지 않는다. */
  title?: string;
  /** 제목줄 우측 영역(버튼 등). */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * 등록/수정 폼의 제목 있는 섹션 카드.
 * 섹션 제목 스타일과 간격을 한곳에서 통일한다(필드 레이아웃은 children 이 담당).
 */
export function FormSection({ title, actions, children, className }: FormSectionProps) {
  return (
    <section className={cn("mb-6", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between mb-3 border-b border-gray-200 pb-2">
          {title && <h2 className="text-base font-semibold text-gray-900">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
