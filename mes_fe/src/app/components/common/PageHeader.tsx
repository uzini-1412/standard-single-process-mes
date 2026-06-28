import { ReactNode } from "react";
import { HelpButton } from "./HelpButton";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** 도움말 화면 키 직접 지정 (생략 시 현재 화면 키 자동 사용) */
  helpKey?: string;
}

export function PageHeader({ title, description, actions, helpKey }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-1.5">
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          <HelpButton pageKey={helpKey} />
        </div>
        {description && (
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
