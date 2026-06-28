import type { SalesViewMode } from "./SalesLedgerPage";

interface SalesViewSwitchProps {
  value: SalesViewMode;
  onChange: (mode: SalesViewMode) => void;
}

// 매출 목록과 추이 화면을 오가는 콤보박스
export function SalesViewSwitch({ value, onChange }: SalesViewSwitchProps) {
  return (
    <div className="mb-3">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SalesViewMode)}
        className="w-48 h-9 px-3 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5B6FD8]"
      >
        <option value="list">매출 목록</option>
        <option value="trend">매출 추이</option>
      </select>
    </div>
  );
}
