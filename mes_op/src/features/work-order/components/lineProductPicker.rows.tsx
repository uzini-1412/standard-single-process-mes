import React from 'react';

const LABEL_CELL =
  'bg-gray-200 px-6 py-3 w-40 flex items-center font-medium';
const VALUE_CELL = 'bg-white px-6 py-3 flex-1 flex items-center';
const SELECT_BASE =
  'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';

interface SelectRowProps {
  label: string;
  value: string;
  options: string[];
  optionKeyPrefix: string;
  editable: boolean;
  fallbackText: string;
  disabled?: boolean;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

// 라벨 셀 + 드롭다운/텍스트 셀 한 줄을 그린다.
// editable 이면 select, 아니면 정적 텍스트로 표시한다.
export function SelectRow({
  label,
  value,
  options,
  optionKeyPrefix,
  editable,
  fallbackText,
  disabled,
  onChange,
}: SelectRowProps) {
  return (
    <div className="flex">
      <div className={LABEL_CELL}>{label}</div>
      <div className={VALUE_CELL}>
        {editable ? (
          <select
            className={
              disabled !== undefined
                ? `${SELECT_BASE} disabled:bg-gray-100 disabled:cursor-not-allowed`
                : SELECT_BASE
            }
            value={value}
            disabled={disabled}
            onChange={onChange}
          >
            <option value="">선택하세요</option>
            {options.map((opt, idx) => (
              <option value={opt} key={`${optionKeyPrefix}-${idx}-${opt}`}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <span>{fallbackText}</span>
        )}
      </div>
    </div>
  );
}

interface StaticRowProps {
  label: string;
  text: string;
}

// 수정 불가한 단순 표시 한 줄(라벨 + 값).
export function StaticRow({ label, text }: StaticRowProps) {
  return (
    <div className="flex">
      <div className={LABEL_CELL}>{label}</div>
      <div className={VALUE_CELL}>{text}</div>
    </div>
  );
}
