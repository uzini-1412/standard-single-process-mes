import type { ReactNode } from "react";
import { CommonCodeCombobox } from "@/app/components/common/CommonCodeCombobox";
import { ITEM_IMPORT_INSPECTION_OPTIONS } from "@/app/constants/item";
import { FOUR_COLUMN_GRID_STYLES } from "@/app/styles/button-styles";
import { handleNonNegativeNumberChange, preventNegativeKey } from "@/app/utils/numericInput";
import { UNITS, withUnit } from "@/app/utils/unitConvert";
import type {
  ItemFormData,
  ItemFormOptions,
} from "@/types/standard-info/item.interface";

// 텍스트/숫자/셀렉트로 다룰 수 있는 문자열 값 필드만 추린다(specs 배열 제외).
type StringField = Exclude<keyof ItemFormData, "specs">;

interface ItemFormSectionProps {
  formData: ItemFormData;
  options: ItemFormOptions;
  onChange: (field: keyof ItemFormData, value: string) => void;
}

const SELECT_CLASS = FOUR_COLUMN_GRID_STYLES.input + " w-full";
const TEXT_CLASS = FOUR_COLUMN_GRID_STYLES.input + " w-full px-3 py-2";

const requiredMark = <span className="text-red-500"> *</span>;

export function ItemFormSection({
  formData,
  options,
  onChange,
}: ItemFormSectionProps) {
  // 공통 셀 렌더러 — 입력 종류별로 한 번씩만 정의해 반복 마크업을 제거한다.
  const renderSelect = (
    field: StringField,
    choices: { value: string; label: string }[],
  ) => (
    <select
      value={formData[field]}
      onChange={(event) => onChange(field, event.target.value)}
      className={SELECT_CLASS}
    >
      <option value="">선택</option>
      {choices.map((choice) => (
        <option key={choice.value} value={choice.value}>
          {choice.label}
        </option>
      ))}
    </select>
  );

  const renderText = (field: StringField) => (
    <input
      type="text"
      value={formData[field]}
      onChange={(event) => onChange(field, event.target.value)}
      className={TEXT_CLASS}
    />
  );

  const renderNumber = (field: StringField) => (
    <input
      type="number"
      min="0"
      step="any"
      value={formData[field]}
      onChange={(event) =>
        handleNonNegativeNumberChange(event.target.value, (value) =>
          onChange(field, value),
        )
      }
      onKeyDown={preventNegativeKey}
      className={TEXT_CLASS}
    />
  );

  const asChoices = (values: string[]) =>
    values.map((value) => ({ value, label: value }));

  const inspectionChoices = ITEM_IMPORT_INSPECTION_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  }));

  // (왼쪽 라벨/필드, 오른쪽 라벨/필드) 한 쌍 = 한 행.
  type Cell = { label: ReactNode; field: ReactNode };
  const rows: [Cell, Cell][] = [
    [
      { label: "제품구분", field: renderSelect("itemType", asChoices(options.itemTypeOptions)) },
      { label: <>품번{requiredMark}</>, field: renderText("itemCode") },
    ],
    [
      { label: <>품명{requiredMark}</>, field: renderText("itemName") },
      { label: "계정구분", field: renderSelect("accountType", asChoices(options.accountTypeOptions)) },
    ],
    [
      { label: "규격", field: renderText("spec") },
      { label: withUnit("평량", UNITS.basisWeight), field: renderNumber("basisWeight") },
    ],
    [
      {
        label: "색상",
        field: (
          <CommonCodeCombobox
            groupName="색상분류"
            value={formData.color}
            onChange={(v) => onChange("color", v)}
          />
        ),
      },
      { label: withUnit("생산속도", UNITS.productionSpeed), field: renderNumber("productionSpeed") },
    ],
    [
      { label: "수입검사유무", field: renderSelect("importInspGb", inspectionChoices) },
      {
        label: "포장단위",
        field: (
          <CommonCodeCombobox
            groupName="포장분류"
            value={formData.packingUnit}
            onChange={(v) => onChange("packingUnit", v)}
          />
        ),
      },
    ],
  ];

  return (
    <table className={FOUR_COLUMN_GRID_STYLES.table}>
      <tbody>
        {rows.map(([left, right], rowIndex) => (
          <tr key={rowIndex} className={FOUR_COLUMN_GRID_STYLES.row}>
            <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>{left.label}</td>
            <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
              {left.field}
            </td>
            <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>{right.label}</td>
            <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>{right.field}</td>
          </tr>
        ))}

        <tr className={FOUR_COLUMN_GRID_STYLES.lastRow}>
          <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>비고</td>
          <td className={FOUR_COLUMN_GRID_STYLES.valueCell} colSpan={3}>
            {renderText("remark")}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
