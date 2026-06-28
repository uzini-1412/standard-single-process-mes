import React from "react";

interface DateRangePickerWithLabelProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  label?: string;
}

/**
 * 날짜선택 레이블이 포함된 날짜 범위 선택 컴포넌트
 * 영업관리, 자재관리 등에서 공통으로 사용
 */
export function DateRangePickerWithLabel({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  label = "날짜선택",
}: DateRangePickerWithLabelProps) {
  const handleFromChange = (newFrom: string) => {
    if (newFrom && dateTo && newFrom > dateTo) {
      onDateFromChange(dateTo);
      onDateToChange(newFrom);
    } else {
      onDateFromChange(newFrom);
    }
  };

  const handleToChange = (newTo: string) => {
    if (newTo && dateFrom && dateFrom > newTo) {
      onDateFromChange(newTo);
      onDateToChange(dateFrom);
    } else {
      onDateToChange(newTo);
    }
  };

  return (
    <div className="flex items-center">
      <div className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 h-9 flex items-center whitespace-nowrap rounded-l-md border border-gray-300">
        {label}
      </div>
      <div className="flex items-center gap-0 bg-white border border-l-0 border-gray-300 rounded-r-md">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => handleFromChange(e.target.value)}
          className="h-9 px-3 bg-transparent border-0 text-xs focus:outline-none focus:ring-0"
        />
        <span className="text-gray-400 text-xs px-1">~</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => handleToChange(e.target.value)}
          className="h-9 px-3 bg-transparent border-0 text-xs focus:outline-none focus:ring-0"
        />
      </div>
    </div>
  );
}