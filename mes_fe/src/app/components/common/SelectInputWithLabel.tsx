import React from "react";

interface SelectInputWithLabelProps {
  selectValue: string;
  onSelectChange: (value: string) => void;
  inputValue: string;
  onInputChange: (value: string) => void;
  options: { value: string; label: string }[];
  selectPlaceholder?: string;
  inputPlaceholder?: string;
  width?: string;
}

/**
 * 선택박스와 입력 필드가 붙어있는 컴포넌트
 * DateRangePickerWithLabel과 동일한 스타일
 */
export function SelectInputWithLabel({
  selectValue,
  onSelectChange,
  inputValue,
  onInputChange,
  options,
  selectPlaceholder = "선택",
  inputPlaceholder = "",
  width = "280px",
}: SelectInputWithLabelProps) {
  return (
    <div className="flex items-center relative" style={{ minWidth: width }}>
      <select
        value={selectValue}
        onChange={(e) => onSelectChange(e.target.value)}
        className="h-9 px-3 bg-gray-100 border border-gray-300 rounded-l-md text-xs text-gray-700 font-semibold focus:outline-none focus:ring-2 focus:ring-[#5B6FD8] whitespace-nowrap relative z-10 [&>option]:bg-white [&>option]:text-gray-900"
        style={{ minWidth: "100px" }}
      >
        <option value="">{selectPlaceholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => onInputChange(e.target.value)}
        placeholder={inputPlaceholder}
        className="h-9 px-3 bg-white border border-l-0 border-gray-300 rounded-r-md text-xs focus:outline-none focus:ring-2 focus:ring-[#5B6FD8] flex-1"
      />
    </div>
  );
}