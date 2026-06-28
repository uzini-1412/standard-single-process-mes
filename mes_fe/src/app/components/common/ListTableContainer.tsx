import { Children, isValidElement, ReactNode } from "react";
import { LIST_TABLE_STYLES } from "../../styles/button-styles";
import { ServerPagination } from "./ServerPagination";

const DEFAULT_HEIGHT = "calc(100vh - 280px)";

interface ListTableContainerProps {
  children: ReactNode;
  pagination?: ReactNode;
  height?: string;
  className?: string;
}

export function ListTableContainer({
  children,
  pagination,
  height = DEFAULT_HEIGHT,
  className = "",
}: ListTableContainerProps) {
  let extractedPagination: ReactNode = null;
  const tableChildren: ReactNode[] = [];
  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.type === ServerPagination) {
      extractedPagination = child;
    } else {
      tableChildren.push(child);
    }
  });

  const finalPagination = pagination ?? extractedPagination;

  return (
    <div className={`${LIST_TABLE_STYLES.container} ${className}`}>
      <div className={LIST_TABLE_STYLES.scrollWrapper} style={{ height }}>
        {tableChildren}
      </div>
      {finalPagination && (
        <div className={LIST_TABLE_STYLES.paginationWrapper}>{finalPagination}</div>
      )}
    </div>
  );
}
