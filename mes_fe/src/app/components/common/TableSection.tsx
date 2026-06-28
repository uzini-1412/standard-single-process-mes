import { Children, isValidElement, ReactNode } from "react";
import { LIST_TABLE_STYLES } from "../../styles/button-styles";
import { ServerPagination } from "./ServerPagination";

export const HEIGHT_MAP = {
  half: "calc((100vh - 360px) / 2)",
  third: "calc((100vh - 400px) / 3)",
  full: "calc(100vh - 280px)",
  oneThird: "calc((100vh - 360px) / 3)",
  twoThirds: "calc((100vh - 360px) * 2 / 3)",
} as const;

interface TableSectionProps {
  title?: string;
  actions?: ReactNode;
  height?: keyof typeof HEIGHT_MAP;
  children: ReactNode;
  className?: string;
}

export function TableSection({
  title,
  actions,
  height = "half",
  children,
  className = "",
}: TableSectionProps) {
  let extractedPagination: ReactNode = null;
  const tableChildren: ReactNode[] = [];
  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.type === ServerPagination) {
      extractedPagination = child;
    } else {
      tableChildren.push(child);
    }
  });

  return (
    <div className={`mb-4 ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between mb-3">
          {title ? (
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          ) : (
            <span />
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={LIST_TABLE_STYLES.container}>
        <div className={LIST_TABLE_STYLES.scrollWrapper} style={{ height: HEIGHT_MAP[height] }}>
          {tableChildren}
        </div>
        {extractedPagination && (
          <div className={LIST_TABLE_STYLES.paginationWrapper}>{extractedPagination}</div>
        )}
      </div>
    </div>
  );
}
