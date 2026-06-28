import React from "react";

interface SelectWithLabelProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

/**
 * 레이블이 포함된 Select 컴포넌트
 * DateRangePickerWithLabel, InputWithLabel과 동일한 스타일 적용
 */
export function SelectWithLabel({ 
  label, 
  value, 
  onChange, 
  options,
  placeholder = "선택"
}: SelectWithLabelProps) {
  return (
    <div className="flex items-center">
      <div className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 h-9 flex items-center whitespace-nowrap rounded-l-md border border-gray-300">
        {label}
      </div>
      <div className="flex items-center bg-white border border-l-0 border-gray-300 rounded-r-md">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 px-3 bg-transparent border-0 text-xs focus:outline-none focus:ring-0 min-w-[120px]"
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
