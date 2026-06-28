import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { FormActions } from "../../../components/common/FormActions";
import { BUTTON_STYLES, FOUR_COLUMN_GRID_STYLES, ICON_STYLES } from "../../../styles/button-styles";
import { X } from "lucide-react";
import { CommonInfoForm, CommonInfoHistoryItem } from "@/types/standard-info/common.interface";
import { showWarning } from "@/app/utils/toast";
import { usePermission } from "../../../context/UserContext";

interface CommonInfoRegisterPageProps {
  mode?: "create" | "edit";
  initialData?: any;
  onBack?: () => void;
  onSave?: (items: any[]) => void;
}

type ErrorMap = Record<string, boolean>;

// 빈 문자열 검사가 필요한 필수 필드 (useYn은 boolean이라 false도 유효 → 제외)
const REQUIRED_FIELDS: (keyof CommonInfoForm)[] = ["groupCode", "groupName"];

// 필수 필드 누락분을 ErrorMap 으로 수집. 누락 없으면 빈 객체.
function collectMissing(form: CommonInfoForm): ErrorMap {
  const missing: ErrorMap = {};
  for (const field of REQUIRED_FIELDS) {
    if (!form[field]) missing[field as string] = true;
  }
  return missing;
}

export function CommonInfoRegisterPage({ mode = "create", initialData, onBack, onSave }: CommonInfoRegisterPageProps) {
  const perm = usePermission("common-info");
  const today = new Date().toISOString().split("T")[0];

  // 빈 폼 한 벌 — 초기 상태/등록 후 리셋에서 공유
  const emptyForm = (): CommonInfoForm => ({
    groupCode: "",
    groupName: "",
    detailCode: "",
    detailName: "",
    useYn: true,
    regDt: today,
    values: [],
  });

  const [formData, setFormData] = useState<CommonInfoForm>(() => ({ ...emptyForm(), detailSq: undefined }));
  const [errors, setErrors] = useState<ErrorMap>({});
  const [historyData, setHistoryData] = useState<CommonInfoHistoryItem[]>([]);

  // edit 모드일 때 초기 데이터 로드
  useEffect(() => {
    if (mode !== "edit" || !initialData) return;
    setFormData({
      detailSq: initialData.detailSq,
      groupCode: initialData.groupCode || "",
      groupName: initialData.groupName || "",
      detailCode: initialData.detailCode || "",
      detailName: initialData.detailName || "",
      useYn: initialData.useYn === undefined ? true : !!initialData.useYn,
      regDt: initialData.regDt ? initialData.regDt.split("T")[0] : today,
      values: initialData.contentValues
        ? initialData.contentValues.map((val: string) => ({ valueContent: val }))
        : [],
    });
  }, [mode, initialData, today]);

  const handleChange = (field: keyof CommonInfoForm, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value } as CommonInfoForm));
    // 에러 제거
    setErrors((prev) => (prev[field as string] ? { ...prev, [field as string]: false } : prev));
  };

  const handleAddValue = () => {
    setFormData((prev) => ({ ...prev, values: [...prev.values, { valueContent: "" }] }));
  };

  const handleRemoveValue = (index: number) => {
    setFormData((prev) => ({ ...prev, values: prev.values.filter((_, i) => i !== index) }));
  };

  const handleValueChange = (index: number, val: string) => {
    setFormData((prev) => ({
      ...prev,
      values: prev.values.map((v, i) => (i === index ? { ...v, valueContent: val } : v)),
    }));
  };

  // 필수값 검증 통과 시 true. 실패하면 errors 세팅 + 경고.
  const validateRequired = (): boolean => {
    const missing = collectMissing(formData);
    if (Object.keys(missing).length > 0) {
      setErrors(missing);
      showWarning("항목코드, 항목은 필수 입력값입니다.");
      return false;
    }
    return true;
  };

  // 등록 버튼 클릭 - 하단 표에 추가 (기본적으로 체크된 상태)
  const handleRegister = () => {
    if (!validateRequired()) return;

    setHistoryData((prev) => [
      ...prev,
      {
        isSelected: true, // 선택 -> isSelected
        rowNum: prev.length + 1, // No -> rowNum
        groupCode: formData.groupCode,
        groupName: formData.groupName,
        detailCode: formData.detailCode,
        detailName: formData.detailName,
        regDt: formData.regDt,
        useYn: formData.useYn,
        values: [...formData.values],
      },
    ]);

    // 폼 초기화
    setFormData(emptyForm());
    setErrors({});
  };

  // 저장 버튼 클릭
  const handleSave = () => {
    // 수정 모드: 검증 후 바로 저장
    if (mode === "edit") {
      if (!validateRequired()) return;
      onSave?.([formData]);
      return;
    }

    // 등록 모드: 체크된 항목들 저장
    const selectedItems = historyData.filter((item) => item.isSelected);
    if (selectedItems.length === 0) {
      showWarning("저장할 항목을 선택해주세요.");
      return;
    }
    onSave?.(selectedItems);
  };

  const handleCheckboxChange = (index: number) => {
    setHistoryData((prev) =>
      prev.map((item, i) => (i === index ? { ...item, isSelected: !item.isSelected } : item))
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setHistoryData((prev) => prev.map((item) => ({ ...item, isSelected: checked })));
  };

  // 등록 현황 표의 최대 contentValues 개수
  const maxDetailCount = Math.max(0, ...historyData.map((item) => item.values?.length || 0));

  // 동적 세부내용 컬럼을 포함한 헤더 정의 (선택 칼럼 제외한 라벨 행 렌더에 사용)
  const historyColumns = [
    { key: "선택", label: "선택" },
    { key: "No", label: "No." },
    { key: "groupCode", label: "항목코드" },
    { key: "groupName", label: "항목" },
    { key: "detailCode", label: "세부항목코드" },
    { key: "detailName", label: "세부항목" },
    { key: "regDt", label: "등록일자" },
    ...Array.from({ length: maxDetailCount }, (_, i) => ({ key: `values${i}`, label: `세부내용 ${i + 1}` })),
    { key: "useYn", label: "사용여부" },
  ];

  const allSelected = historyData.length > 0 && historyData.every((item) => item.isSelected);

  const G = FOUR_COLUMN_GRID_STYLES;
  const lockedInEdit = mode === "edit";

  // 라벨 + 텍스트 input 한 쌍을 (labelCell, valueCell) 두 td 로 렌더.
  // required=true 면 빨간 별표, lockable=true 면 edit 모드에서 비활성화/회색 처리.
  const textField = (
    field: keyof CommonInfoForm,
    label: string,
    valueTdClass: string,
    opts: { required?: boolean; lockable?: boolean; placeholder: string }
  ) => {
    const disabled = !!opts.lockable && lockedInEdit;
    const hasError = !!errors[field as string];
    return (
      <>
        <td className={G.labelCell}>
          {opts.required && <span className="text-red-500">*</span>}
          {label}
        </td>
        <td className={valueTdClass}>
          <div className="flex flex-col gap-1">
            <input
              type="text"
              value={(formData[field] as string) ?? ""}
              onChange={(e) => handleChange(field, e.target.value)}
              disabled={disabled}
              className={[
                G.input,
                "w-full",
                hasError ? "validation-error-input" : "",
                disabled ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "",
              ].join(" ").trim()}
              placeholder={opts.placeholder}
            />
            {hasError && <span className="validation-error-message">필수입력항목입니다.</span>}
          </div>
        </td>
      </>
    );
  };

  return (
    <div className="p-3">
      {/* Main Content */}
      <div className="bg-white rounded-lg p-3">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">
            {mode === "create" ? "공통정보 등록" : "공통정보 수정"}
          </h1>
          <FormActions
            onSave={((mode === "create" && perm.createAuth) || (mode === "edit" && perm.updateAuth)) ? handleSave : undefined}
            onCancel={onBack}
          />
        </div>

        {/* Form Content */}
        <div className="border border-gray-200 rounded-sm overflow-hidden">
          <table className={FOUR_COLUMN_GRID_STYLES.table}>
            <tbody>
              {/* Row 1: groupCode, 항목 */}
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>
                  <span className="text-red-500">*</span>항목코드
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={formData.groupCode}
                        onChange={(e) => handleChange("groupCode", e.target.value)}
                        disabled={mode === "edit"}
                        className={`${FOUR_COLUMN_GRID_STYLES.input} flex-1 ${
                          errors.groupCode ? "validation-error-input" : ""
                        } ${mode === "edit" ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
                        placeholder="항목코드를 입력하세요"
                      />

                    </div>
                    {errors.groupCode && (
                      <span className="validation-error-message">필수입력항목입니다.</span>
                    )}
                  </div>
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>
                  <span className="text-red-500">*</span>항목
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={formData.groupName}
                        onChange={(e) => handleChange("groupName", e.target.value)}
                        disabled={mode === "edit"}
                        className={`${FOUR_COLUMN_GRID_STYLES.input} flex-1 ${
                          errors.groupName ? "validation-error-input" : ""
                        } ${mode === "edit" ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
                        placeholder="항목을 입력하세요"
                      />

                    </div>
                    {errors.groupName && (
                      <span className="validation-error-message">필수입력항목입니다.</span>
                    )}
                  </div>
                </td>
              </tr>

              {/* Row 2: detailCode(잠금 가능), 세부항목 */}
              <tr className={G.row}>
                {textField("detailCode", "세부항목코드", G.valueCellWithBorder, {
                  lockable: true,
                  placeholder: "세부항목코드를 입력하세요",
                })}
                {textField("detailName", "세부항목", G.valueCell, {
                  placeholder: "세부항목을 입력하세요",
                })}
              </tr>

              {/* Row 3: regDt, useYn */}
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>
                  <span className="text-red-500">*</span>등록일자
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                  <div className="flex flex-col gap-1">
                    <input
                      type="date"
                      value={formData.regDt ?? ""}
                      disabled
                      className={`${FOUR_COLUMN_GRID_STYLES.input} w-full bg-gray-100 text-gray-500 cursor-not-allowed`}
                    />
                  </div>
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>
                  <span className="text-red-500">*</span>사용여부
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="useYn"
                          value="Y"
                          checked={formData.useYn === true}
                          onChange={() => handleChange("useYn", true)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">사용</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="useYn"
                          value="N"
                          checked={formData.useYn === false}
                          onChange={() => handleChange("useYn", false)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">미사용</span>
                      </label>
                    </div>
                    {errors.useYn && (
                      <span className="text-red-500 text-xs">필수입력항목입니다.</span>
                    )}
                  </div>
                </td>
              </tr>

              {/* Row 4: 세부항목내용 */}
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>세부항목내용</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder} colSpan={3}>
                  <div className="flex flex-col gap-2">
                    {formData.values.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item.valueContent}
                          onChange={(e) => handleValueChange(index, e.target.value)}
                          className={`${FOUR_COLUMN_GRID_STYLES.input} w-full`}
                          placeholder={`세부항목내용 ${index + 1}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={ICON_STYLES.button}
                          onClick={() => handleRemoveValue(index)}
                        >
                          <X className={ICON_STYLES.size} />
                        </Button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddValue}
                      className="text-sm text-blue-600 hover:text-blue-800 text-left"
                    >
                      + 추가
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 등록 현황 Section - 등록 모드에서만 표시 */}
        {mode === "create" && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">등록 현황</h2>
              <Button onClick={handleRegister} className={BUTTON_STYLES.register}>
                추가
              </Button>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#4A5CC7]">
                    <th className="px-4 py-3 text-center text-sm font-semibold text-white whitespace-nowrap border-r border-white">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4"
                      />
                    </th>
                    {historyColumns.slice(1).map((column) => (
                      <th
                        key={column.key}
                        className="px-4 py-3 text-center text-sm font-semibold text-white whitespace-nowrap border-r border-white"
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historyData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={historyColumns.length}
                        className="px-4 py-8 text-center text-sm text-gray-600 border-r border-gray-200"
                      >
                        데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    historyData.map((row, index) => (
                      <tr key={index} className="border-b border-gray-200">
                        <td className="px-4 py-3 text-center border-r border-gray-200">
                          <input
                            type="checkbox"
                           checked={row.isSelected}
                            onChange={() => handleCheckboxChange(index)}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700 text-center whitespace-nowrap border-r border-gray-200">
                          {row.rowNum}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700 text-center whitespace-nowrap border-r border-gray-200">
                          {row.groupCode}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700 text-center whitespace-nowrap border-r border-gray-200">
                          {row.groupName}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700 text-center whitespace-nowrap border-r border-gray-200">
                          {row.detailCode}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700 text-center whitespace-nowrap border-r border-gray-200">
                          {row.detailName}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700 text-center whitespace-nowrap border-r border-gray-200">
                          {row.regDt}
                        </td>
                        {Array.from({ length: maxDetailCount }, (_, i) => (
                          <td key={i} className="px-4 py-3 text-xs text-gray-700 text-center whitespace-nowrap border-r border-gray-200">
                            {row.values[i]?.valueContent || "-"}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-xs text-gray-700 text-center whitespace-nowrap border-r border-gray-200">
                          {row.useYn === true ? "사용" : "미사용"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
