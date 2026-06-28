/** [계측기관리 > 계측기등록] 신규 계측기를 사진과 함께 입력해 일괄 등록하는 화면. API: instrumentApi(/api/instrument) + imageUploadApi. */
import { PageHeader } from "@/app/components/common/PageHeader";
import { FormActions } from "@/app/components/common/FormActions";
import { PAGE_LAYOUT_STYLES } from "@/app/styles/button-styles";
import type { HistoryRecord } from "@/types/measuring-instrument/instrumentManager.interface";
import { InstrumentDetailForm } from "./components/InstrumentDetailForm";
import { InstrumentEntryLogGrid } from "./components/InstrumentEntryLogGrid";
import { useInstrumentEntryForm } from "./useInstrumentEntryForm";

interface InstrumentRegistryEntryPageProps {
  onBack: () => void;
  onSave: (data: HistoryRecord[]) => void;
}

export default function InstrumentRegistryEntryPage({ onBack, onSave }: InstrumentRegistryEntryPageProps) {
  const {
    form,
    historyData,
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
  } = useInstrumentEntryForm({ onSave });

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="mb-6">
          <PageHeader
            title="계측기 정보 등록"
            actions={<FormActions onSave={handleSave} onCancel={onBack} saving={isSaving} />}
          />
        </div>

        <InstrumentDetailForm
          form={form}
          nextCalibDate={nextCalibDate}
          calibDateError={calibDateError}
          onTextFieldChange={handleTextFieldChange}
          onPurchaseDateChange={handlePurchaseDateChange}
          onPurchasePriceChange={handlePurchasePriceChange}
          onCalibCycleValueChange={handleCalibCycleValueChange}
          onCalibCycleUnitChange={handleCalibCycleUnitChange}
          onLastCalibDateChange={handleLastCalibDateChange}
          onImageChange={handleImageChange}
        />

        <InstrumentEntryLogGrid
          historyData={historyData}
          onAddRow={handleAddRow}
          onRowChange={handleHistoryRowChange}
        />
      </div>
    </div>
  );
}
