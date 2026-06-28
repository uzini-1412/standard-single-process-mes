import type { KeyboardEvent, ReactNode } from "react";
import { Button } from "../ui/button";
import { BUTTON_STYLES } from "../../styles/button-styles";

interface ListSearchFilterProps {
  children: ReactNode;
  onSearch?: () => void;
  searchLabel?: string;
}

/** Enter 로 검색을 실행시킬 폼 컨트롤 태그. */
const ENTER_SUBMIT_TAGS = new Set(["INPUT", "SELECT"]);

export function ListSearchFilter({ children, onSearch, searchLabel = "검색" }: ListSearchFilterProps) {
  // 필터 영역의 input/select 에서 Enter 입력 시 검색을 실행한다.
  const submitOnEnter = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" || !onSearch) return;
    const tag = (event.target as HTMLElement).tagName;
    if (!ENTER_SUBMIT_TAGS.has(tag)) return;
    event.preventDefault();
    onSearch();
  };

  return (
    <div className="bg-gray-50 rounded-lg p-3 mb-4" onKeyDown={submitOnEnter}>
      <div className="flex flex-wrap items-center gap-3">
        {children}
        {onSearch && (
          <Button className={BUTTON_STYLES.search} onClick={onSearch}>
            {searchLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
