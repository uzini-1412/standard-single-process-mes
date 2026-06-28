import React from "react";

interface DateInputWithLabelProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * 레이블이 포함된 날짜 입력 컴포넌트
 * DateRangePickerWithLabel과 동일한 스타일 적용
 */
export function DateInputWithLabel({ 
  label, 
  value, 
  onChange,
  placeholder = "날짜 선택"
}: DateInputWithLabelProps) {
  return (
    <div className="flex items-center">
      <div className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 h-9 flex items-center whitespace-nowrap rounded-l-md border border-gray-300">
        {label}
      </div>
      <div className="flex items-center bg-white border border-l-0 border-gray-300 rounded-r-md">
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-9 px-3 bg-transparent border-0 text-xs focus:outline-none focus:ring-0"
        />
      </div>
    </div>
  );
}
