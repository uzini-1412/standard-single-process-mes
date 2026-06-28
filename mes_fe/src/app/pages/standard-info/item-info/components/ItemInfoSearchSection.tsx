import { InputWithLabel } from "@/app/components/common/InputWithLabel";
import { ListSearchFilter } from "@/app/components/common/ListSearchFilter";
import { SelectWithLabel } from "@/app/components/common/SelectWithLabel";
import type {
  ItemSearchField,
  ItemSearchForm,
} from "@/types/standard-info/item.interface";

interface ItemInfoSearchSectionProps {
  searchForm: ItemSearchForm;
  accountTypeOptions: string[];
  onSearchFieldChange: (field: ItemSearchField, value: string) => void;
  onSearch: () => void;
}

// 자유 입력 검색 필드 정의(계정구분 셀렉트는 별도 처리)
const TEXT_FIELDS: { field: ItemSearchField; label: string }[] = [
  { field: "itemCode", label: "품번" },
  { field: "itemName", label: "품명" },
  { field: "spec", label: "규격" },
];

export function ItemInfoSearchSection({
  searchForm,
  accountTypeOptions,
  onSearchFieldChange,
  onSearch,
}: ItemInfoSearchSectionProps) {
  return (
    <ListSearchFilter onSearch={onSearch} searchLabel="검색">
      <SelectWithLabel
        label="계정구분"
        value={searchForm.accountType}
        onChange={(value) => onSearchFieldChange("accountType", value)}
        options={accountTypeOptions.map((option) => ({
          value: option,
          label: option,
        }))}
        placeholder="선택"
      />
      {TEXT_FIELDS.map(({ field, label }) => (
        <InputWithLabel
          key={field}
          label={label}
          value={searchForm[field]}
          onChange={(value) => onSearchFieldChange(field, value)}
          placeholder={`${label} 입력`}
        />
      ))}
    </ListSearchFilter>
  );
}
