import { useState } from "react";
import { PageHeader } from "@/app/components/common/PageHeader";
import { FormActions } from "@/app/components/common/FormActions";
import { createItem, updateItem } from "@/app/api/itemApi";
import { ensureImagePath } from "@/app/api/imageUploadApi";
import { usePermission } from "@/app/context/UserContext";
import { showSuccess, showWarning } from "@/app/utils/toast";
import { showApiError } from "@/app/utils/apiError";
import type { ItemRegisterPageProps } from "@/types/standard-info/item.interface";
import { ItemFormSection } from "./components/ItemFormSection";
import { ItemImageSection } from "./components/ItemImageSection";
import { ItemSpecTableSection } from "./components/ItemSpecTableSection";
import { createItemSaveData } from "./itemInfo.utils";
import { useItemRegisterForm } from "./useItemRegisterForm";

export function ItemRegisterPage({
  mode = "create",
  itemId,
  onBack,
  onSave,
}: ItemRegisterPageProps) {
  const perm = usePermission("item-info");
  const [isSaving, setIsSaving] = useState(false);
  const {
    formData,
    image1,
    image2,
    options,
    isLoading,
    handleChange,
    handleAddSpec,
    handleRemoveSpec,
    handleSpecChange,
    handleImageChange,
  } = useItemRegisterForm({
    mode,
    itemId,
  });

  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    if (!formData.itemCode.trim()) {
      showWarning("품번은 필수 입력값입니다.");
      return;
    }
    if (!formData.itemName.trim()) {
      showWarning("품명은 필수 입력값입니다.");
      return;
    }

    try {
      setIsSaving(true);

      const key = formData.itemCode.trim();
      const [uploadedImage1, uploadedImage2] = await Promise.all([
        ensureImagePath("item", key, image1),
        ensureImagePath("item", key, image2),
      ]);

      const saveData = createItemSaveData(formData, uploadedImage1, uploadedImage2);

      if (mode === "create") {
        await createItem(saveData);
        showSuccess("품목 정보가 저장되었습니다.");
      } else if (itemId) {
        await updateItem(itemId, saveData);
        showSuccess("품목 정보가 수정되었습니다.");
      }

      onSave?.();
    } catch (error: any) {
      console.error("Failed to save item:", error);
      showApiError(error, { conflict: "이미 존재하는 품번입니다.", default: "저장 중 오류가 발생했습니다." });
    } finally {
      setTimeout(() => {
        setIsSaving(false);
      }, 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="p-3 flex items-center justify-center h-screen">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="bg-white rounded-lg p-3">
        <PageHeader
          title={mode === "create" ? "품목정보 등록" : "품목정보 수정"}
          actions={
            <FormActions
              onSave={
                (mode === "create" ? perm.createAuth : perm.updateAuth)
                  ? handleSave
                  : undefined
              }
              onCancel={onBack}
              saving={isSaving}
            />
          }
        />

        <div className="flex gap-6 mt-3">
          <ItemImageSection
            image1={image1}
            image2={image2}
            editable
            onImageChange={handleImageChange}
          />

          <div className="flex-1">
            <ItemFormSection
              formData={formData}
              options={options}
              onChange={handleChange}
            />

            <ItemSpecTableSection
              rows={formData.specs}
              warehouseLocationOptions={options.warehouseLocationOptions}
              editable
              emptyMessage="등록된 규격이 없습니다. 추가 버튼으로 규격을 입력해 주세요."
              onAddSpec={handleAddSpec}
              onRemoveSpec={handleRemoveSpec}
              onSpecChange={handleSpecChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
