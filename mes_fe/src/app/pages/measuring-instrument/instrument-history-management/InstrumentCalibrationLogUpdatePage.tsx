/** [계측기관리 > 검교정이력등록] 기존 검교정·수리 이력 1건을 고쳐 저장하는 화면. API: instrumentApi(/api/instrument/history). */
import { useState } from "react";
import { PageHeader } from "@/app/components/common/PageHeader";
import { FormActions } from "@/app/components/common/FormActions";
import { Button } from "../../../components/ui/button";
import { showWarning } from "@/app/utils/toast";
import { ensureDateOrder } from "@/app/utils/dateGuard";
import { BUTTON_STYLES, PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import type { HistorySaveData } from "@/app/api/instrumentApi";
import type { InstrumentHistoryData } from "@/types/measuring-instrument/history.interface";
import { CalibrationDetailForm } from "./components/CalibrationDetailForm";
import {
  buildClearCalibrationErrors,
  buildInstrumentSummary,
  hasAnyCalibrationError,
  inspectCalibrationForm,
  isOccurDateBeforePurchase,
  loadFileAsDataUrl,
  mapRecordToCalibrationForm,
  toSaveData,
  triggerDataUrlDownload,
  type CalibrationEditableField,
} from "./calibrationForm.helpers";

interface InstrumentCalibrationLogUpdatePageProps {
  data: InstrumentHistoryData;
  onBack: () => void;
  onSave: (data: HistorySaveData) => void;
}

export default function InstrumentCalibrationLogUpdatePage({
  data,
  onBack,
  onSave,
}: InstrumentCalibrationLogUpdatePageProps) {
  const [form, setForm] = useState(() => mapRecordToCalibrationForm(data));
  const [errors, setErrors] = useState(buildClearCalibrationErrors);

  const masterInfo = buildInstrumentSummary(data);
  const occurDatePurchaseError = isOccurDateBeforePurchase(
    masterInfo.purchaseDate,
    form.occurDate,
  );

  const handleFormFieldChange = (
    field: CalibrationEditableField,
    value: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    // 필수 입력란을 다시 채우면 그 에러 표시를 즉시 해제한다.
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
      actionCost: value.replace(/,/g, ""),
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
      console.error("Failed to load report file:", error);
    }
  };

  const handleReportFileClear = () => {
    setForm((prev) => ({
      ...prev,
      reportFilePath: "",
      reportFileNm: "",
    }));
  };

  const handleSave = () => {
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

    onSave(toSaveData(data.instrumentSq, form));
  };

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="mb-6">
          <PageHeader
            title="계측기이력관리 수정"
            actions={<FormActions onSave={handleSave} onCancel={onBack} />}
          />
        </div>

        <CalibrationDetailForm
          masterInfo={masterInfo}
          form={form}
          errors={errors}
          occurDatePurchaseError={occurDatePurchaseError}
          onFormFieldChange={handleFormFieldChange}
          onActionCostChange={handleActionCostChange}
          onReportFileUpload={handleReportFileUpload}
          onReportFileClear={handleReportFileClear}
        />

        {form.reportFilePath && (
          <div className="mt-4">
            <Button
              type="button"
              className={BUTTON_STYLES.primary}
              onClick={() =>
                triggerDataUrlDownload(
                  form.reportFilePath,
                  form.reportFileNm || "검교정성적서",
                )
              }
            >
              첨부파일 다운로드
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
