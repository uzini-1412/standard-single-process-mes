import { Button } from "@/app/components/ui/button";
import { InputWithLabel } from "@/app/components/common/InputWithLabel";
import { BUTTON_STYLES } from "@/app/styles/button-styles";
import type {
  CalibrationLogQuery,
  CalibrationLogQueryField,
} from "../useCalibrationLogWorkspace";

interface CalibrationLogFilterBarProps {
  searchForm: CalibrationLogQuery;
  onSearchFieldChange: (
    field: CalibrationLogQueryField,
    value: string,
  ) => void;
  onSearch: () => void;
}

export function CalibrationLogFilterBar({
  searchForm,
  onSearchFieldChange,
  onSearch,
}: CalibrationLogFilterBarProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 mb-4">
      <div className="flex items-center gap-3">
        <InputWithLabel
          label="관리번호"
          placeholder="관리번호 입력"
          value={searchForm.manageNo}
          onChange={(value) => onSearchFieldChange("manageNo", value)}
        />
        <InputWithLabel
          label="기기명"
          placeholder="기기명 입력"
          value={searchForm.instrumentNm}
          onChange={(value) => onSearchFieldChange("instrumentNm", value)}
        />
        <InputWithLabel
          label="기기번호"
          placeholder="기기번호 입력"
          value={searchForm.instrumentNo}
          onChange={(value) => onSearchFieldChange("instrumentNo", value)}
        />
        <Button className={BUTTON_STYLES.search} onClick={onSearch}>
          검색
        </Button>
      </div>
    </div>
  );
}
