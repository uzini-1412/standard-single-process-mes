import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { handleNonNegativeNumberChange, preventNegativeKey } from "@/app/utils/numericInput";
import { formatNumber } from "@/app/utils/numberFormat";
import { NUMBER_ALIGN, HEADER_ALIGN } from "@/app/styles/table-styles";
import { UNITS, withUnit } from "@/app/utils/unitConvert";
import type { ItemSpecInfo } from "@/types/standard-info/item.interface";

const PLACEHOLDER = "-";

const isEmpty = (value?: string | number | null) =>
  value === null || value === undefined || value === "";

const displayValue = (value?: string | number | null) =>
  isEmpty(value) ? PLACEHOLDER : String(value);

const displayNumber = (value?: string | number | null) =>
  isEmpty(value) ? PLACEHOLDER : formatNumber(value);

// 입력값으로 쓸 때는 "-" 표시값 대신 빈 문자열로 환원한다.
const editText = (value?: string | number | null) =>
  isEmpty(value) ? "" : String(value);

const NUMERIC_INPUT_CLASS =
  "w-full border border-gray-300 rounded px-2 py-1 text-sm text-right";
const TEXT_INPUT_CLASS =
  "w-full border border-gray-300 rounded px-2 py-1 text-sm";
const READONLY_NUMBER_CLASS = `block text-xs text-gray-700 border-r border-gray-200 ${NUMBER_ALIGN}`;
const READONLY_TEXT_CLASS =
  "block text-xs text-gray-700 text-center border-r border-gray-200";

interface ItemSpecRowValue {
  itemSpecSq?: number;
  width?: string | number;
  length?: string | number;
  weight?: string | number;
  safetyStock?: string | number;
  warehouseLocation?: string;
  storageLocation?: string;
}

interface ItemSpecTableSectionProps {
  rows: ItemSpecRowValue[];
  warehouseLocationOptions?: string[];
  editable?: boolean;
  emptyMessage?: string;
  onAddSpec?: () => void;
  onRemoveSpec?: (index: number) => void;
  onSpecChange?: (
    index: number,
    field: keyof ItemSpecInfo,
    value: string,
  ) => void;
}

// 컬럼 정의 — readonly 폭과 editable 폭을 함께 들고 다닌다.
type NumericKey = "width" | "length" | "safetyStock";
const NUMERIC_COLUMNS: {
  key: NumericKey;
  width: string;
  editWidth: string;
  placeholder: string;
}[] = [
  { key: "width", width: "12%", editWidth: "12%", placeholder: "폭 입력" },
  { key: "length", width: "12%", editWidth: "12%", placeholder: "길이 입력" },
  { key: "safetyStock", width: "15%", editWidth: "14%", placeholder: "적정재고 입력" },
];

export function ItemSpecTableSection({
  rows,
  warehouseLocationOptions = [],
  editable = false,
  emptyMessage = "등록된 규격이 없습니다.",
  onAddSpec,
  onRemoveSpec,
  onSpecChange,
}: ItemSpecTableSectionProps) {
  const colWidth = (readonly: string, edit: string) =>
    editable ? edit : readonly;

  const renderNumericCell = (
    row: ItemSpecRowValue,
    index: number,
    column: (typeof NUMERIC_COLUMNS)[number],
  ) => (
    <td
      key={column.key}
      style={{ width: colWidth(column.width, column.editWidth) }}
      className="px-3 py-1.5 border-r border-gray-200"
    >
      {editable ? (
        <input
          type="number"
          min="0"
          step="any"
          value={editText(row[column.key])}
          onChange={(event) =>
            handleNonNegativeNumberChange(event.target.value, (value) =>
              onSpecChange?.(index, column.key, value),
            )
          }
          onKeyDown={preventNegativeKey}
          className={NUMERIC_INPUT_CLASS}
          placeholder={column.placeholder}
        />
      ) : (
        <span className={READONLY_NUMBER_CLASS}>
          {displayNumber(row[column.key])}
        </span>
      )}
    </td>
  );

  const columnCount = editable ? 8 : 7;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-700">규격 목록 (폭/길이)</h2>
        {editable && onAddSpec && (
          <Button
            type="button"
            onClick={onAddSpec}
            className="flex items-center gap-1 bg-[#4A5CC7] hover:bg-[#3A4CB7] text-white text-xs px-3 py-1.5 h-7 rounded"
          >
            <Plus className="w-3.5 h-3.5" />
            추가
          </Button>
        )}
      </div>

      <div className="border border-gray-200 rounded-sm overflow-hidden" style={{ height: "220px" }}>
        <table className="w-full table-fixed">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#4A5CC7]">
              <th style={{ width: "6%" }} className="px-3 py-2 text-xs font-semibold text-white text-center">No.</th>
              <th style={{ width: "12%" }} className={`px-3 py-2 text-xs font-semibold text-white ${HEADER_ALIGN}`}>{withUnit("폭", UNITS.width)}</th>
              <th style={{ width: "12%" }} className={`px-3 py-2 text-xs font-semibold text-white ${HEADER_ALIGN}`}>{withUnit("길이", UNITS.length)}</th>
              <th style={{ width: "12%" }} className={`px-3 py-2 text-xs font-semibold text-white ${HEADER_ALIGN}`}>{withUnit("중량", UNITS.weight)}</th>
              <th style={{ width: colWidth("15%", "14%") }} className={`px-3 py-2 text-xs font-semibold text-white ${HEADER_ALIGN}`}>적정재고</th>
              <th style={{ width: colWidth("16%", "14%") }} className="px-3 py-2 text-xs font-semibold text-white text-center">창고구분</th>
              <th style={{ width: colWidth("27%", "20%") }} className="px-3 py-2 text-xs font-semibold text-white text-center">보관위치</th>
              {editable && (
                <th style={{ width: "10%" }} className="px-3 py-2 text-xs font-semibold text-white text-center">삭제</th>
              )}
            </tr>
          </thead>
        </table>
        <div className="overflow-y-auto" style={{ height: "calc(100% - 36px)" }}>
          <table className="w-full table-fixed">
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columnCount}
                    className="px-3 py-8 text-center text-xs text-gray-400 border-r border-gray-200"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={row.itemSpecSq || index} className="border-b border-gray-200">
                    <td style={{ width: "6%" }} className="px-3 py-1.5 text-xs text-gray-700 text-center border-r border-gray-200">
                      {index + 1}
                    </td>
                    {renderNumericCell(row, index, NUMERIC_COLUMNS[0])}
                    {renderNumericCell(row, index, NUMERIC_COLUMNS[1])}
                    <td style={{ width: "12%" }} className="px-3 py-1.5 border-r border-gray-200">
                      {editable ? (
                        <input
                          type="text"
                          value={editText(row.weight)}
                          disabled
                          readOnly
                          tabIndex={-1}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-right bg-gray-100 text-gray-500 cursor-not-allowed"
                          placeholder="자동계산"
                        />
                      ) : (
                        <span className={READONLY_NUMBER_CLASS}>
                          {displayNumber(row.weight)}
                        </span>
                      )}
                    </td>
                    {renderNumericCell(row, index, NUMERIC_COLUMNS[2])}
                    <td style={{ width: colWidth("16%", "14%") }} className="px-3 py-1.5 border-r border-gray-200">
                      {editable ? (
                        <select
                          value={editText(row.warehouseLocation)}
                          onChange={(event) =>
                            onSpecChange?.(
                              index,
                              "warehouseLocation",
                              event.target.value,
                            )
                          }
                          className={TEXT_INPUT_CLASS}
                        >
                          <option value="">선택</option>
                          {warehouseLocationOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={READONLY_TEXT_CLASS}>
                          {displayValue(row.warehouseLocation)}
                        </span>
                      )}
                    </td>
                    <td style={{ width: colWidth("27%", "20%") }} className="px-3 py-1.5 border-r border-gray-200">
                      {editable ? (
                        <input
                          type="text"
                          value={editText(row.storageLocation)}
                          onChange={(event) =>
                            onSpecChange?.(index, "storageLocation", event.target.value)
                          }
                          className={TEXT_INPUT_CLASS}
                          placeholder="보관위치 입력"
                        />
                      ) : (
                        <span className={READONLY_TEXT_CLASS}>
                          {displayValue(row.storageLocation)}
                        </span>
                      )}
                    </td>
                    {editable && (
                      <td style={{ width: "10%" }} className="px-3 py-1.5 text-center border-r border-gray-200">
                        <button
                          type="button"
                          onClick={() => onRemoveSpec?.(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
