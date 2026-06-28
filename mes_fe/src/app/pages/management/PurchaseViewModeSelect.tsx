import type { PurchaseLedgerMode } from "./PurchaseLedgerPage";

interface SelectProps {
  value: PurchaseLedgerMode;
  onChange: (mode: PurchaseLedgerMode) => void;
}

// 매입 목록/추이 화면을 전환하는 콤보 박스
export function PurchaseViewModeSelect({ value, onChange }: SelectProps) {
  return (
    <div className="mb-3">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as PurchaseLedgerMode)}
        className="w-48 h-9 px-3 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5B6FD8]"
      >
        <option value="list">매입 목록</option>
        <option value="trend">매입 추이</option>
      </select>
    </div>
  );
}
