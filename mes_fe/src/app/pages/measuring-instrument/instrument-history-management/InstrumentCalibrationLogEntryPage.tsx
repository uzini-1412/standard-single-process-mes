/** [계측기관리 > 검교정이력등록] 계측기를 골라 검교정·수리 이력을 새로 입력·저장하는 화면. API: instrumentApi(/api/instrument/history). */
import { PageHeader } from "@/app/components/common/PageHeader";
import { FormActions } from "@/app/components/common/FormActions";
import { PAGE_LAYOUT_STYLES } from "../../../styles/button-styles";
import type { HistoryFormRecord } from "@/types/measuring-instrument/history.interface";
import { InstrumentPickerGrid } from "./components/InstrumentPickerGrid";
import { CalibrationDetailForm } from "./components/CalibrationDetailForm";
import { CalibrationDraftGrid } from "./components/CalibrationDraftGrid";
import { useCalibrationEntryForm } from "./useCalibrationEntryForm";

interface InstrumentCalibrationLogEntryPageProps {
  onBack: () => void;
  onSave: (data: HistoryFormRecord[]) => void;
}

export default function InstrumentCalibrationLogEntryPage({ onBack, onSave }: InstrumentCalibrationLogEntryPageProps) {
  const {
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
  } = useCalibrationEntryForm({ onSave });

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="mb-6">
          <PageHeader
            title="계측기이력관리 등록"
            actions={<FormActions onSave={handleSave} onCancel={onBack} saving={isSaving} />}
          />
        </div>

        <InstrumentPickerGrid
          rows={instrumentRows}
          onRowClick={handleInstrumentSelect}
        />

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

        <CalibrationDraftGrid
          rows={historyRows}
          onAddRow={handleAddHistoryRow}
          onRowSelectedChange={handleHistoryRowSelectedChange}
        />
      </div>
    </div>
  );
}
