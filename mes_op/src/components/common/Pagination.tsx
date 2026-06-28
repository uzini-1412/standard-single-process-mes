import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import type { ComponentType } from "react";
import { Button } from "./Button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/** 좌우 이동 버튼 4개를 데이터로 정의해 렌더링을 한 곳에서 처리한다. */
type StepKey = "first" | "prev" | "next" | "last";
const STEP_ICONS: Record<StepKey, ComponentType<{ className?: string }>> = {
  first: ChevronsLeft,
  prev: ChevronLeft,
  next: ChevronRight,
  last: ChevronsRight,
};

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const atStart = currentPage <= 1;
  const atEnd = currentPage >= totalPages;

  // 각 버튼이 이동할 목표 페이지와 비활성 조건.
  const steps: Array<{ key: StepKey; target: number; disabled: boolean }> = [
    { key: "first", target: 1, disabled: atStart },
    { key: "prev", target: currentPage - 1, disabled: atStart },
    { key: "next", target: currentPage + 1, disabled: atEnd },
    { key: "last", target: totalPages, disabled: atEnd },
  ];

  const renderStep = ({ key, target, disabled }: (typeof steps)[number]) => {
    const Icon = STEP_ICONS[key];
    return (
      <Button
        key={key}
        variant="outline"
        size="icon"
        className="h-8 w-8"
        disabled={disabled}
        onClick={() => onPageChange(target)}
      >
        <Icon className="h-4 w-4" />
      </Button>
    );
  };

  return (
    <div className="flex items-center justify-end gap-2 py-3">
      <span className="text-sm text-gray-600 mr-4">
        Page {currentPage} of {totalPages}
      </span>

      {renderStep(steps[0])}
      {renderStep(steps[1])}

      <Button variant="outline" size="sm" className="h-8 min-w-8 px-2">
        {currentPage}
      </Button>

      {renderStep(steps[2])}
      {renderStep(steps[3])}
    </div>
  );
}
