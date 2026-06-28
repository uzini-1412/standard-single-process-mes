import { useMemo, useState } from "react";
import { saveMeasuringInstruments } from "@/app/api/instrumentApi";
import { ensureImagePath } from "@/app/api/imageUploadApi";
import { showError, showSuccess, showWarning } from "@/app/utils/toast";
import { ensureDateOrder } from "@/app/utils/dateGuard";
import type { HistoryRecord } from "@/types/measuring-instrument/instrumentManager.interface";
import {
  buildInstrumentFormState,
  computeDaysUntilCalib,
  computeNextCalibDate,
  isCalibDateBeforePurchase,
  stripThousandsSeparator,
  withThousandsSeparator,
  type CalibCycleUnit,
  type InstrumentTextField,
} from "./instrumentFormModel.utils";

interface InstrumentEntryFormOptions {
  onSave: (data: HistoryRecord[]) => void;
}

export function useInstrumentEntryForm({
  onSave,
}: InstrumentEntryFormOptions) {
  const [form, setForm] = useState(() => buildInstrumentFormState());
  const [entryRows, setEntryRows] = useState<HistoryRecord[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // 마지막 교정일/주기 입력이 바뀔 때만 다음 교정일을 다시 계산한다.
  const nextCalibDate = useMemo(
    () =>
      computeNextCalibDate(
        form.lastCalibDate,
        form.calibCycleValue,
        form.calibCycleUnit,
      ),
    [form.lastCalibDate, form.calibCycleValue, form.calibCycleUnit],
  );
  const calibDateError = isCalibDateBeforePurchase(form.purchaseDate, form.lastCalibDate);

  const handleTextFieldChange = (
    field: InstrumentTextField,
    value: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePurchaseDateChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      purchaseDate: value,
    }));
  };

  const handlePurchasePriceChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      purchasePrice: stripThousandsSeparator(value),
    }));
  };

  const handleCalibCycleValueChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      calibCycleValue: value.replace(/[^0-9]/g, ""),
    }));
  };

  const handleCalibCycleUnitChange = (value: CalibCycleUnit) => {
    setForm((prev) => ({
      ...prev,
      calibCycleUnit: value,
    }));
  };

  const handleLastCalibDateChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      lastCalibDate: value,
    }));
  };

  const handleImageChange = (dataUrl: string | null) => {
    setForm((prev) => ({
      ...prev,
      imgPaths: dataUrl,
    }));
  };

  // 현재 폼 값을 임시 목록에 한 행으로 추가하고 폼을 초기화한다.
  const handleAddRow = () => {
    if (calibDateError) {
      showWarning(ensureDateOrder(form.purchaseDate, form.lastCalibDate, "구입일자", "교정일자") ?? "");
      return;
    }

    const calibCycle = form.calibCycleValue
      ? `${form.calibCycleValue}${form.calibCycleUnit}`
      : "";
    const appendedRow: HistoryRecord = {
      selected: true,
      No: entryRows.length + 1,
      manageNo: form.manageNo,
      instrumentType: form.instrumentType,
      instrumentNm: form.instrumentNm,
      modelNm: form.modelNm,
      instrumentNo: form.instrumentNo,
      spec: form.spec,
      makerNm: form.makerNm,
      purchaseDate: form.purchaseDate,
      purchasePrice: form.purchasePrice,
      calibCycle,
      calibAgency: form.calibAgency,
      lastCalibDate: form.lastCalibDate,
      nextCalibDate,
      remark: form.remark,
      imgPaths: form.imgPaths,
    };

    setEntryRows((prev) => [...prev, appendedRow]);
    setForm(buildInstrumentFormState());
  };

  // 임시 목록에서 특정 행의 한 필드를 수정한다(금액은 콤마 제거).
  const handleHistoryRowChange = (
    index: number,
    field: keyof HistoryRecord,
    value: string | boolean,
  ) => {
    setEntryRows((prev) =>
      prev.map((row, rowIndex) => {
        if (rowIndex !== index) {
          return row;
        }

        const updatedRow = {
          ...row,
          [field]: value,
        } as HistoryRecord;

        if (field === "purchasePrice" && typeof value === "string") {
          updatedRow.purchasePrice = stripThousandsSeparator(value);
        }

        return updatedRow;
      }),
    );
  };

  // 선택된 행만 모아 이미지 업로드 후 일괄 저장한다.
  const handleSave = async () => {
    const checkedRows = entryRows.filter((row) => row.selected);
    if (checkedRows.length === 0) {
      showWarning("저장할 항목을 선택해주세요.");
      return;
    }

    try {
      setIsSaving(true);

      const payload = await Promise.all(
        checkedRows.map(async (row) => ({
          manageNo: row.manageNo,
          instrumentType: row.instrumentType || undefined,
          instrumentNm: row.instrumentNm,
          modelNm: row.modelNm || undefined,
          instrumentNo: row.instrumentNo || undefined,
          spec: row.spec || undefined,
          makerNm: row.makerNm || undefined,
          purchaseDate: row.purchaseDate || undefined,
          purchasePrice: row.purchasePrice
            ? stripThousandsSeparator(row.purchasePrice)
            : undefined,
          calibCycle: row.calibCycle || undefined,
          calibAgency: row.calibAgency || undefined,
          lastCalibDate: row.lastCalibDate || undefined,
          nextCalibDate: row.nextCalibDate || undefined,
          remark: row.remark || undefined,
          imgPaths:
            (await ensureImagePath("instrument", row.manageNo, row.imgPaths)) || undefined,
        })),
      );

      await saveMeasuringInstruments(payload);

      showSuccess("계측기 정보가 저장되었습니다.");
      onSave(checkedRows);
    } catch (error) {
      console.error("Failed to save instruments:", error);
      showError("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    form,
    historyData: entryRows.map((row) => ({
      ...row,
      purchasePrice: withThousandsSeparator(row.purchasePrice),
      remainingDays: computeDaysUntilCalib(row.nextCalibDate),
    })),
    isSaving,
    calibDateError,
    nextCalibDate,
    handleTextFieldChange,
    handlePurchaseDateChange,
    handlePurchasePriceChange,
    handleCalibCycleValueChange,
    handleCalibCycleUnitChange,
    handleLastCalibDateChange,
    handleImageChange,
    handleAddRow,
    handleHistoryRowChange,
    handleSave,
  };
}
