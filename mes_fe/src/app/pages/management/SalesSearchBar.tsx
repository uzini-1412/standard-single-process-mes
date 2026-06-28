import { Button } from "../../components/ui/button";
import { BUTTON_STYLES } from "../../styles/button-styles";
import { DateRangePickerWithLabel } from "../../components/common/DateRangePickerWithLabel";
import type { SalesStatusCustomerOption } from "@/types/management/sales.interface";

interface SalesSearchBarProps {
  dateFrom: string;
  dateTo: string;
  customerCode: string;
  customerOptions: SalesStatusCustomerOption[];
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onCustomerChange: (v: string) => void;
  onSearch: () => void;
  helpKey?: string;
}

// 매출 목록/추이 화면이 공유하는 검색 영역
export function SalesSearchBar({
  dateFrom,
  dateTo,
  customerCode,
  customerOptions,
  onDateFromChange,
  onDateToChange,
  onCustomerChange,
  onSearch,
  helpKey,
}: SalesSearchBarProps) {
  return (
    <div data-help={helpKey} className="bg-gray-50 rounded-lg p-3 mb-3">
      <div className="flex items-center gap-3">
        <DateRangePickerWithLabel
          label="날짜선택"
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={onDateFromChange}
          onDateToChange={onDateToChange}
        />
        <div className="flex items-center">
          <div className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 h-9 flex items-center whitespace-nowrap rounded-l-md border border-gray-300">
            거래처
          </div>
          <select
            value={customerCode}
            onChange={(e) => onCustomerChange(e.target.value)}
            className="h-9 px-3 bg-white border border-l-0 border-gray-300 rounded-r-md text-xs focus:outline-none focus:ring-1 focus:ring-[#5B6FD8]"
          >
            <option value="">전체</option>
            {customerOptions.map((c) => (
              <option key={c.customerCode} value={c.customerCode}>
                {c.customerName} ({c.customerCode})
              </option>
            ))}
          </select>
        </div>
        <Button className={BUTTON_STYLES.search} onClick={onSearch}>
          검색
        </Button>
      </div>
    </div>
  );
}
