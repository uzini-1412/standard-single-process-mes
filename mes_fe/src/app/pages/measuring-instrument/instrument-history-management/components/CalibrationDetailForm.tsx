import { FileText, Upload, X } from "lucide-react";
import { FOUR_COLUMN_GRID_STYLES } from "@/app/styles/button-styles";
import { ImageUploadBox } from "@/app/components/common/ImageUploadBox";
import { HISTORY_TYPE_OPTIONS } from "@/app/constants/measuring";
import { ACCEPT, ALLOWED_EXTENSIONS, validateUploadFile } from "@/app/utils/fileUpload";
import type {
  CalibrationEditableField,
  CalibrationFormErrors,
  CalibrationFormState,
  CalibrationInstrumentSummary,
} from "../calibrationForm.helpers";
import { withThousandSeparators } from "../calibrationForm.helpers";

interface CalibrationDetailFormProps {
  masterInfo: CalibrationInstrumentSummary;
  form: CalibrationFormState;
  errors: CalibrationFormErrors;
  occurDatePurchaseError: boolean;
  onFormFieldChange: (field: CalibrationEditableField, value: string) => void;
  onActionCostChange: (value: string) => void;
  onReportFileUpload: (file: File) => void;
  onReportFileClear: () => void;
}

const READONLY_CELL_CLASS =
  FOUR_COLUMN_GRID_STYLES.input + " w-full bg-gray-100 cursor-not-allowed";
const EDITABLE_CELL_CLASS = FOUR_COLUMN_GRID_STYLES.input + " w-full";

export function CalibrationDetailForm({
  masterInfo,
  form,
  errors,
  occurDatePurchaseError,
  onFormFieldChange,
  onActionCostChange,
  onReportFileUpload,
  onReportFileClear,
}: CalibrationDetailFormProps) {
  // 첨부 선택 시 허용 확장자 검증을 통과한 파일만 상위로 넘긴다.
  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const picked = event.target.files?.[0];
    if (!picked) {
      return;
    }
    if (!validateUploadFile(picked, ALLOWED_EXTENSIONS.DOCUMENT)) {
      event.target.value = "";
      return;
    }
    onReportFileUpload(picked);
  };

  return (
    <div className="bg-white rounded-lg p-6 mb-6">
      <div className="mb-4">
        <div className="py-2 font-semibold text-gray-900">계측기 정보</div>
      </div>

      <div className="flex gap-6">
        <div className="flex-shrink-0 w-80">
          <ImageUploadBox
            alt="계측기 사진"
            value={masterInfo.imgPaths}
            editable={false}
            emptyText="계측기 사진 없음"
            className="h-[180px]"
          />
        </div>

        <div className="flex-1">
          <table className={FOUR_COLUMN_GRID_STYLES.table}>
            <tbody>
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>관리번호</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                  <input type="text" disabled value={masterInfo.manageNo} className={READONLY_CELL_CLASS} />
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>구분</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <input type="text" disabled value={masterInfo.instrumentType} className={READONLY_CELL_CLASS} />
                </td>
              </tr>
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>기기명</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                  <input type="text" disabled value={masterInfo.instrumentNm} className={READONLY_CELL_CLASS} />
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>모델명</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <input type="text" disabled value={masterInfo.modelNm} className={READONLY_CELL_CLASS} />
                </td>
              </tr>
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>기기번호</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                  <input type="text" disabled value={masterInfo.instrumentNo} className={READONLY_CELL_CLASS} />
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>규격&형식</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <input type="text" disabled value={masterInfo.spec} className={READONLY_CELL_CLASS} />
                </td>
              </tr>
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>제조사</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                  <input type="text" disabled value={masterInfo.makerNm} className={READONLY_CELL_CLASS} />
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>구입일자</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <input type="text" disabled value={masterInfo.purchaseDate} className={READONLY_CELL_CLASS} />
                </td>
              </tr>
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>구입금액</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                  <input type="text" disabled value={withThousandSeparators(masterInfo.purchasePrice)} className={READONLY_CELL_CLASS} />
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>교정주기</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <input type="text" disabled value={masterInfo.calibCycle} className={READONLY_CELL_CLASS} />
                </td>
              </tr>
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>교정기관</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                  <input
                    type="text"
                    value={form.agencyNm}
                    className={EDITABLE_CELL_CLASS}
                    onChange={(event) => onFormFieldChange("agencyNm", event.target.value)}
                  />
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>교정일자</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <input type="text" disabled value={masterInfo.lastCalibDate} className={READONLY_CELL_CLASS} />
                </td>
              </tr>
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>차기교정일자</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                  <input type="text" disabled value={masterInfo.nextCalibDate} className={READONLY_CELL_CLASS} />
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>이력구분</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <select
                    value={form.historyType}
                    className={EDITABLE_CELL_CLASS}
                    onChange={(event) =>
                      onFormFieldChange("historyType", event.target.value)
                    }
                  >
                    {HISTORY_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>조치일자<span className="text-red-500"> *</span></td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                  <div>
                    <input
                      type="date"
                      value={form.occurDate}
                      className={
                        EDITABLE_CELL_CLASS +
                        (errors.occurDate || occurDatePurchaseError
                          ? " validation-error-input"
                          : "")
                      }
                      onChange={(event) =>
                        onFormFieldChange("occurDate", event.target.value)
                      }
                    />
                    {errors.occurDate && (
                      <span className="validation-error-message">필수입력값입니다</span>
                    )}
                    {occurDatePurchaseError && (
                      <span className="validation-error-message">
                        조치일자는 구입일자 이전일 수 없습니다.
                      </span>
                    )}
                  </div>
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>조치금액</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <input
                    type="text"
                    value={withThousandSeparators(form.actionCost)}
                    className={EDITABLE_CELL_CLASS}
                    onChange={(event) => onActionCostChange(event.target.value)}
                  />
                </td>
              </tr>
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>검교정성적서</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer p-2 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition-colors" title="파일 업로드">
                      <Upload className="w-5 h-5 text-gray-600" />
                      <input
                        type="file"
                        className="hidden"
                        accept={ACCEPT.DOCUMENT}
                        onChange={handleFileInputChange}
                      />
                    </label>
                    {form.reportFileNm && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded border border-blue-200">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="text-xs text-gray-700">{form.reportFileNm}</span>
                        <button type="button" onClick={onReportFileClear}>
                          <X className="w-3 h-3 text-gray-500" />
                        </button>
                      </div>
                    )}
                  </div>
                </td>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>비고</td>
                <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <input
                    type="text"
                    value={form.remark}
                    className={EDITABLE_CELL_CLASS}
                    onChange={(event) => onFormFieldChange("remark", event.target.value)}
                  />
                </td>
              </tr>
              <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>이력내용</td>
                <td colSpan={3} className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                  <div>
                    <input
                      type="text"
                      value={form.actionContent}
                      className={
                        EDITABLE_CELL_CLASS +
                        (errors.actionContent ? " validation-error-input" : "")
                      }
                      onChange={(event) =>
                        onFormFieldChange("actionContent", event.target.value)
                      }
                    />
                    {errors.actionContent && (
                      <span className="validation-error-message">필수입력값입니다</span>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
