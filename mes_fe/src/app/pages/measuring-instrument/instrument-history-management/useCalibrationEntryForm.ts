import { useEffect, useState } from "react";
import { fetchMeasuringInstruments, saveInstrumentHistories } from "@/app/api/instrumentApi";
import { showError, showSuccess, showWarning } from "@/app/utils/toast";
import { ensureDateOrder } from "@/app/utils/dateGuard";
import type {
  HistoryFormRecord,
  InstrumentSelectionRecord,
} from "@/types/measuring-instrument/history.interface";
import {
  assembleDraftRow,
  buildBlankCalibrationForm,
  buildClearCalibrationErrors,
  buildInstrumentSummary,
  hasAnyCalibrationError,
  inspectCalibrationForm,
  isOccurDateBeforePurchase,
  loadFileAsDataUrl,
  resetInstrumentSelection,
  stripThousandSeparators,
  toSaveDataList,
  type CalibrationEditableField,
} from "./calibrationForm.helpers";

interface UseCalibrationEntryFormParams {
  onSave: (data: HistoryFormRecord[]) => void;
}

export function useCalibrationEntryForm({
  onSave,
}: UseCalibrationEntryFormParams) {
  const [instrumentRows, setInstrumentRows] = useState<
    InstrumentSelectionRecord[]
  >([]);
  const [pickedInstrument, setPickedInstrument] =
    useState<InstrumentSelectionRecord | null>(null);
  const [masterInfo, setMasterInfo] = useState(buildInstrumentSummary());
  const [form, setForm] = useState(buildBlankCalibrationForm);
  const [historyRows, setHistoryRows] = useState<HistoryFormRecord[]>([]);
  const [errors, setErrors] = useState(buildClearCalibrationErrors);
  const [isSaving, setIsSaving] = useState(false);

  // 진입 시 선택 가능한 계측기 목록을 한 번 채워둔다.
  useEffect(() => {
    void fetchSelectableInstruments();
  }, []);

  const fetchSelectableInstruments = async () => {
    try {
      const list = await fetchMeasuringInstruments();
      setInstrumentRows(
        resetInstrumentSelection(
          list.map((item) => ({
            ...item,
            selected: false,
          })),
        ),
      );
    } catch (error) {
      console.error("Failed to load instruments list:", error);
      showError("계측기 목록을 불러오는 중 오류가 발생했습니다.");
    }
  };

  const handleInstrumentSelect = (targetRow: InstrumentSelectionRecord) => {
    setInstrumentRows((prev) =>
      prev.map((row) => ({
        ...row,
        selected: row.instrumentSq === targetRow.instrumentSq,
      })),
    );
    setPickedInstrument(targetRow);
    setMasterInfo(buildInstrumentSummary(targetRow));
  };

  const handleFormFieldChange = (
    field: CalibrationEditableField,
    value: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    // 필수 항목을 다시 입력하는 순간 해당 에러 표시를 거둔다.
    if (field === "occurDate" || field === "actionContent") {
      setErrors((prev) => ({
        ...prev,
        [field]: false,
      }));
    }
  };

  const handleActionCostChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      actionCost: stripThousandSeparators(value),
    }));
  };

  const handleReportFileUpload = async (file: File) => {
    try {
      const dataUrl = await loadFileAsDataUrl(file);
      setForm((prev) => ({
        ...prev,
        reportFilePath: dataUrl,
        reportFileNm: file.name,
      }));
    } catch (error) {
      console.error("Failed to read report file:", error);
    }
  };

  const handleReportFileClear = () => {
    setForm((prev) => ({
      ...prev,
      reportFilePath: "",
      reportFileNm: "",
    }));
  };

  const occurDatePurchaseError = isOccurDateBeforePurchase(
    masterInfo.purchaseDate,
    form.occurDate,
  );

  const handleAddHistoryRow = () => {
    if (!pickedInstrument) {
      showWarning("상단에서 계측기를 선택해주세요.");
      return;
    }

    const nextErrors = inspectCalibrationForm(form);
    setErrors(nextErrors);
    if (hasAnyCalibrationError(nextErrors)) {
      return;
    }

    if (occurDatePurchaseError) {
      showWarning(
        ensureDateOrder(
          masterInfo.purchaseDate,
          form.occurDate,
          "구입일자",
          "조치일자",
        ) ?? "",
      );
      return;
    }

    setHistoryRows((prev) => [
      ...prev,
      assembleDraftRow(pickedInstrument, masterInfo, form, prev.length + 1),
    ]);
    setForm(buildBlankCalibrationForm());
  };

  const handleHistoryRowSelectedChange = (index: number, selected: boolean) => {
    setHistoryRows((prev) =>
      prev.map((row, position) =>
        position === index ? { ...row, selected } : row,
      ),
    );
  };

  const handleSave = async () => {
    const checkedRows = historyRows.filter((row) => row.selected);
    if (checkedRows.length === 0) {
      showWarning("저장할 항목을 선택해주세요.");
      return;
    }

    try {
      setIsSaving(true);
      await saveInstrumentHistories(toSaveDataList(checkedRows));
      showSuccess("계측기 이력이 저장되었습니다.");
      onSave(checkedRows);
    } catch (error) {
      console.error("Failed to save histories:", error);
      showError("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    instrumentRows,
    masterInfo,
    form,
    historyRows,
    errors,
    occurDatePurchaseError,
    isSaving,
    handleInstrumentSelect,
    handleFormFieldChange,
    handleActionCostChange,
    handleReportFileUpload,
    handleReportFileClear,
    handleAddHistoryRow,
    handleHistoryRowSelectedChange,
    handleSave,
  };
}
