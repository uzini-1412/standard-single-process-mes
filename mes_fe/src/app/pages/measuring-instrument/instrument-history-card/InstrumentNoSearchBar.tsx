import { Button } from "../../../components/ui/button";
import { BUTTON_STYLES } from "../../../styles/button-styles";

interface InstrumentNoSearchBarProps {
  keyword: string;
  suggestions: string[];
  isPanelOpen: boolean;
  panelRef: React.RefObject<HTMLDivElement | null>;
  onKeywordChange: (value: string) => void;
  onFocus: () => void;
  onEnter: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onPick: (no: string) => void;
  onSearch: () => void;
}

// 계측기번호 입력 + 자동완성 패널 + 검색 버튼을 묶은 필터 바
export function InstrumentNoSearchBar({
  keyword,
  suggestions,
  isPanelOpen,
  panelRef,
  onKeywordChange,
  onFocus,
  onEnter,
  onPick,
  onSearch,
}: InstrumentNoSearchBarProps) {
  return (
    <div data-help="instrument-history-card-search" className="bg-gray-50 rounded-lg p-3 mb-4 print:hidden">
      <div className="flex items-center gap-3">
        <div ref={panelRef} className="flex items-center relative" style={{ minWidth: "250px" }}>
          <div className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 h-9 flex items-center whitespace-nowrap rounded-l-md border border-gray-300">
            계측기번호
          </div>
          <div className="relative flex-1">
            <input
              type="text"
              value={keyword}
              placeholder="계측기번호 입력"
              className="w-full h-9 px-3 bg-white border border-l-0 border-gray-300 rounded-r-md text-xs focus:outline-none focus:ring-2 focus:ring-[#5B6FD8]"
              onChange={(e) => onKeywordChange(e.target.value)}
              onFocus={onFocus}
              onKeyDown={onEnter}
            />
            {isPanelOpen && (
              <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                {suggestions.map((no, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-2 text-xs text-gray-700 hover:bg-blue-50 cursor-pointer"
                    onClick={() => onPick(no)}
                  >
                    {no}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <Button onClick={onSearch} className={BUTTON_STYLES.primary}>검색</Button>
      </div>
    </div>
  );
}
