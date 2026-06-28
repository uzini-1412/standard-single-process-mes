/** [계측기관리 > 계측기등록] 기존 계측기 정보를 사진과 함께 편집/저장하는 수정 화면. API: instrumentApi(/api/instrument) + imageUploadApi. */
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/app/components/common/PageHeader";
import { FormActions } from "@/app/components/common/FormActions";
import { showError, showWarning } from "@/app/utils/toast";
import { ensureDateOrder } from "@/app/utils/dateGuard";
import { ensureImagePath } from "@/app/api/imageUploadApi";
import { PAGE_LAYOUT_STYLES } from "@/app/styles/button-styles";
import type { InstrumentSaveData } from "@/app/api/instrumentApi";
import type { InstrumentData } from "@/types/measuring-instrument/instrumentManager.interface";
import { InstrumentDetailForm } from "./components/InstrumentDetailForm";
import {
  buildInstrumentFormState,
  computeNextCalibDate,
  isCalibDateBeforePurchase,
  stripThousandsSeparator,
  toInstrumentSavePayload,
  type CalibCycleUnit,
  type InstrumentTextField,
} from "./instrumentFormModel.utils";

interface InstrumentRegistryUpdatePageProps {
  data: InstrumentData;
  onBack: () => void;
  onSave: (data: InstrumentSaveData) => void;
}

export default function InstrumentRegistryUpdatePage({ data, onBack, onSave }: InstrumentRegistryUpdatePageProps) {
  const [form, setForm] = useState(() => buildInstrumentFormState(data));

  // 상위에서 전달된 대상 데이터가 바뀌면 폼을 새로 채운다.
  useEffect(() => {
    setForm(buildInstrumentFormState(data));
  }, [data]);

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

  const handleSave = async () => {
    // 필수 입력 검증 — DB NOT NULL 컬럼(manage_no, instrument_nm) 대응.
    if (!form.manageNo) { showWarning("관리번호는 필수 입력값입니다."); return; }
    if (!form.instrumentNm) { showWarning("계측기명은 필수 입력값입니다."); return; }
    if (calibDateError) {
      showWarning(ensureDateOrder(form.purchaseDate, form.lastCalibDate, "구입일자", "교정일자") ?? "");
      return;
    }

    try {
      const uploadedImgPaths = await ensureImagePath("instrument", form.manageNo, form.imgPaths);
      onSave(toInstrumentSavePayload({ ...form, imgPaths: uploadedImgPaths }));
    } catch (e) {
      console.error(e);
      showError("이미지 업로드 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className={PAGE_LAYOUT_STYLES.container}>
      <div className={PAGE_LAYOUT_STYLES.content}>
        <div className="mb-6">
          <PageHeader
            title="계측기 정보 수정"
            actions={<FormActions onSave={handleSave} onCancel={onBack} cancelLabel="취소" />}
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
      </div>
    </div>
  );
}
