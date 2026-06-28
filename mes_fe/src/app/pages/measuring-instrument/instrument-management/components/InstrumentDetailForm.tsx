import { FOUR_COLUMN_GRID_STYLES } from "@/app/styles/button-styles";
import { ensureDateOrder } from "@/app/utils/dateGuard";
import { ImageUploadBox } from "@/app/components/common/ImageUploadBox";
import { withThousandsSeparator } from "../instrumentFormModel.utils";
import type {
  CalibCycleUnit,
  InstrumentFormState,
  InstrumentTextField,
} from "../instrumentFormModel.utils";

interface InstrumentDetailFormProps {
  form: InstrumentFormState;
  nextCalibDate: string;
  calibDateError: boolean;
  onTextFieldChange: (
    field: InstrumentTextField,
    value: string,
  ) => void;
  onPurchaseDateChange: (value: string) => void;
  onPurchasePriceChange: (value: string) => void;
  onCalibCycleValueChange: (value: string) => void;
  onCalibCycleUnitChange: (value: CalibCycleUnit) => void;
  onLastCalibDateChange: (value: string) => void;
  onImageChange: (dataUrl: string | null) => void;
}

export function InstrumentDetailForm({
  form,
  nextCalibDate,
  calibDateError,
  onTextFieldChange,
  onPurchaseDateChange,
  onPurchasePriceChange,
  onCalibCycleValueChange,
  onCalibCycleUnitChange,
  onLastCalibDateChange,
  onImageChange,
}: InstrumentDetailFormProps) {
  return (
    <div className="mb-6">
      <div className="bg-white rounded-lg p-6">
        <div className="mb-4">
          <div className="py-2 font-semibold text-gray-900">계측기 정보</div>
        </div>

        <div className="flex gap-6">
          <div className="flex-shrink-0 w-80">
            <ImageUploadBox
              value={form.imgPaths}
              onChange={onImageChange}
              alt="계측기 사진"
              uploadLabel="계측기 사진 등록"
              uploadHint="클릭하여 이미지 선택"
              className="h-[180px]"
            />
          </div>

          <div className="flex-1">
            <table className={FOUR_COLUMN_GRID_STYLES.table}>
              <tbody>
                <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>관리번호<span className="text-red-500"> *</span></td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                    <input
                      type="text"
                      className={FOUR_COLUMN_GRID_STYLES.input + " w-full"}
                      value={form.manageNo}
                      onChange={(event) =>
                        onTextFieldChange("manageNo", event.target.value)
                      }
                    />
                  </td>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>구분</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                    <select
                      className={FOUR_COLUMN_GRID_STYLES.input + " w-full"}
                      value={form.instrumentType}
                      onChange={(event) =>
                        onTextFieldChange("instrumentType", event.target.value)
                      }
                    >
                      <option value="">선택</option>
                      <option value="계측기">계측기</option>
                      <option value="검사구">검사구</option>
                    </select>
                  </td>
                </tr>

                <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>기기명<span className="text-red-500"> *</span></td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                    <input
                      type="text"
                      className={FOUR_COLUMN_GRID_STYLES.input + " w-full"}
                      value={form.instrumentNm}
                      onChange={(event) =>
                        onTextFieldChange("instrumentNm", event.target.value)
                      }
                    />
                  </td>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>모델명</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                    <input
                      type="text"
                      className={FOUR_COLUMN_GRID_STYLES.input + " w-full"}
                      value={form.modelNm}
                      onChange={(event) =>
                        onTextFieldChange("modelNm", event.target.value)
                      }
                    />
                  </td>
                </tr>

                <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>기기번호</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                    <input
                      type="text"
                      className={FOUR_COLUMN_GRID_STYLES.input + " w-full"}
                      value={form.instrumentNo}
                      onChange={(event) =>
                        onTextFieldChange("instrumentNo", event.target.value)
                      }
                    />
                  </td>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>규격&형식</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                    <input
                      type="text"
                      className={FOUR_COLUMN_GRID_STYLES.input + " w-full"}
                      value={form.spec}
                      onChange={(event) =>
                        onTextFieldChange("spec", event.target.value)
                      }
                    />
                  </td>
                </tr>

                <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>제조사</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                    <input
                      type="text"
                      className={FOUR_COLUMN_GRID_STYLES.input + " w-full"}
                      value={form.makerNm}
                      onChange={(event) =>
                        onTextFieldChange("makerNm", event.target.value)
                      }
                    />
                  </td>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>구입일자</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                    <input
                      type="date"
                      className={FOUR_COLUMN_GRID_STYLES.input + " w-full"}
                      value={form.purchaseDate}
                      onChange={(event) =>
                        onPurchaseDateChange(event.target.value)
                      }
                    />
                  </td>
                </tr>

                <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>구입금액</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                    <input
                      type="text"
                      className={FOUR_COLUMN_GRID_STYLES.input + " w-full"}
                      value={withThousandsSeparator(form.purchasePrice)}
                      onChange={(event) =>
                        onPurchasePriceChange(event.target.value)
                      }
                    />
                  </td>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>교정주기</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        className={`${FOUR_COLUMN_GRID_STYLES.input} flex-1`}
                        value={form.calibCycleValue}
                        placeholder="숫자"
                        onChange={(event) =>
                          onCalibCycleValueChange(event.target.value)
                        }
                      />
                      <select
                        className={`${FOUR_COLUMN_GRID_STYLES.input} w-20`}
                        value={form.calibCycleUnit}
                        onChange={(event) =>
                          onCalibCycleUnitChange(
                            event.target.value as CalibCycleUnit,
                          )
                        }
                      >
                        <option value="일">일</option>
                        <option value="주">주</option>
                        <option value="달">달</option>
                        <option value="년">년</option>
                      </select>
                    </div>
                  </td>
                </tr>

                <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>교정기관</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                    <input
                      type="text"
                      className={FOUR_COLUMN_GRID_STYLES.input + " w-full"}
                      value={form.calibAgency}
                      onChange={(event) =>
                        onTextFieldChange("calibAgency", event.target.value)
                      }
                    />
                  </td>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>교정일자</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                    <input
                      type="date"
                      className={
                        FOUR_COLUMN_GRID_STYLES.input +
                        " w-full" +
                        (calibDateError ? " validation-error-input" : "")
                      }
                      value={form.lastCalibDate}
                      onChange={(event) =>
                        onLastCalibDateChange(event.target.value)
                      }
                    />
                    {calibDateError && (
                      <p className="validation-error-message">
                        {ensureDateOrder(form.purchaseDate, form.lastCalibDate, "구입일자", "교정일자")}
                      </p>
                    )}
                  </td>
                </tr>

                <tr className={FOUR_COLUMN_GRID_STYLES.row}>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>차기교정일자</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCellWithBorder}>
                    <input
                      type="date"
                      className={
                        FOUR_COLUMN_GRID_STYLES.input +
                        " w-full bg-gray-100 cursor-not-allowed"
                      }
                      value={nextCalibDate}
                      readOnly
                    />
                  </td>
                  <td className={FOUR_COLUMN_GRID_STYLES.labelCell}>비고</td>
                  <td className={FOUR_COLUMN_GRID_STYLES.valueCell}>
                    <input
                      type="text"
                      className={FOUR_COLUMN_GRID_STYLES.input + " w-full"}
                      value={form.remark}
                      onChange={(event) =>
                        onTextFieldChange("remark", event.target.value)
                      }
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
