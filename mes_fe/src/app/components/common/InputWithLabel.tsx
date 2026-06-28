import React from "react";

interface InputWithLabelProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  width?: string;
}

/**
 * 회색 헤더가 포함된 입력 필드 컴포넌트
 * DateRangePickerWithLabel과 동일한 스타일
 */
export function InputWithLabel({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
  width = "200px",
}: InputWithLabelProps) {
  return (
    <div className="flex items-center" style={{ minWidth: width }}>
      <div className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 h-9 flex items-center whitespace-nowrap rounded-l-md border border-gray-300">
        {label}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 px-3 bg-white border border-l-0 border-gray-300 rounded-r-md text-xs focus:outline-none focus:ring-2 focus:ring-[#5B6FD8] flex-1"
      />
    </div>
  );
}