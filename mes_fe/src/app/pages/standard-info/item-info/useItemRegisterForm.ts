import { useEffect, useState } from "react";
import { fetchItemById } from "@/app/api/itemApi";
import * as clientApi from "@/app/api/clientApi";
import * as commonInfoApi from "@/app/api/commonInfoApi";
import { showError } from "@/app/utils/toast";
import { calcWeightKg, safeFloat } from "@/app/utils/unitConvert";
import type {
  ItemFormData,
  ItemFormOptions,
  ItemRegisterPageProps,
  ItemSpecInfo,
} from "@/types/standard-info/item.interface";
import {
  createEmptyItemFormData,
  createEmptyItemSpec,
  createItemFormData,
} from "./itemInfo.utils";

function computeSpecWeight(
  basisWeight: string,
  width: string,
  length: string,
): string {
  const b = safeFloat(basisWeight);
  const w = safeFloat(width);
  const l = safeFloat(length);

  if (!b || !w || !l) return "";

  const kg = calcWeightKg(b, l, w);
  return Number.isFinite(kg) ? kg.toFixed(2) : "";
}

// 각 옵션 조회가 실패하면 빈 목록으로 대체한다.
const optionsOrEmpty = (promise: Promise<string[]>): Promise<string[]> =>
  promise.catch(() => [] as string[]);

const EMPTY_OPTIONS: ItemFormOptions = {
  itemTypeOptions: [],
  accountTypeOptions: [],
  colorOptions: [],
  clientOptions: [],
  warehouseLocationOptions: [],
  packingUnitOptions: [],
};

interface UseItemRegisterFormParams {
  mode: NonNullable<ItemRegisterPageProps["mode"]>;
  itemId?: string | null;
}

export function useItemRegisterForm({
  mode,
  itemId,
}: UseItemRegisterFormParams) {
  const [formData, setFormData] = useState<ItemFormData>(createEmptyItemFormData);
  const [image1, setImage1] = useState<string | null>(null);
  const [image2, setImage2] = useState<string | null>(null);
  const [options, setOptions] = useState<ItemFormOptions>(EMPTY_OPTIONS);
  const [isLoading, setIsLoading] = useState(mode === "edit");

  // 색상 옵션: "색상분류"가 있으면 우선, 없으면 "색상" 그룹으로 폴백.
  const loadColorOptions = async (): Promise<string[]> => {
    try {
      const classified =
        await commonInfoApi.fetchDetailContentsByItemName("색상분류");
      if (classified.length > 0) return classified;
      return await commonInfoApi.fetchDetailContentsByItemName("색상");
    } catch {
      return [];
    }
  };

  const loadOptions = async () => {
    const [
      itemTypeOptions,
      accountTypeOptions,
      colorOptions,
      clientOptions,
      warehouseLocationOptions,
      packingUnitOptions,
    ] = await Promise.all([
      // 품목구분: 공통정보 "공정분류" 그룹의 detailName 목록 (공정 A/공정 B 등)
      optionsOrEmpty(commonInfoApi.fetchDetailNamesByGroupName("공정분류")),
      optionsOrEmpty(commonInfoApi.fetchDetailContentsByItemName("계정구분")),
      loadColorOptions(),
      optionsOrEmpty(clientApi.fetchClientNames()),
      optionsOrEmpty(commonInfoApi.fetchDetailContentsByItemName("창고구분")),
      optionsOrEmpty(commonInfoApi.fetchDetailContentsByItemName("포장분류")),
    ]);

    setOptions({
      itemTypeOptions,
      accountTypeOptions,
      colorOptions,
      clientOptions,
      warehouseLocationOptions,
      packingUnitOptions,
    });
  };

  const loadItemData = async (targetItemId: string) => {
    try {
      setIsLoading(true);
      const item = await fetchItemById(targetItemId);
      setFormData(createItemFormData(item));
      setImage1(item.imgPaths?.[0] || null);
      setImage2(item.imgPaths?.[1] || null);
    } catch (error) {
      console.error("Failed to load item data:", error);
      showError("품목 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadOptions();
  }, []);

  useEffect(() => {
    if (mode !== "edit" || !itemId) {
      setFormData(createEmptyItemFormData());
      setImage1(null);
      setImage2(null);
      setIsLoading(false);
      return;
    }

    void loadItemData(itemId);
  }, [itemId, mode]);

  const handleChange = (field: keyof ItemFormData, value: string) => {
    setFormData((prev) => {
      // 기본중량(basisWeight) 변경 시 모든 규격의 계산 중량을 다시 산출한다.
      if (field !== "basisWeight") {
        return { ...prev, [field]: value };
      }
      return {
        ...prev,
        basisWeight: value,
        specs: prev.specs.map((spec) => ({
          ...spec,
          weight: computeSpecWeight(value, spec.width, spec.length),
        })),
      };
    });
  };

  const handleAddSpec = () => {
    setFormData((prev) => ({
      ...prev,
      specs: prev.specs.concat(createEmptyItemSpec()),
    }));
  };

  const handleRemoveSpec = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      specs: prev.specs.filter((_, i) => i !== index),
    }));
  };

  const handleSpecChange = (
    index: number,
    field: keyof ItemSpecInfo,
    value: string,
  ) => {
    // weight는 계산 전용 필드라 직접 입력을 무시한다.
    if (field === "weight") return;

    setFormData((prev) => ({
      ...prev,
      specs: prev.specs.map((spec, i) => {
        if (i !== index) return spec;
        const next = { ...spec, [field]: value };
        // 폭/길이 변경 시 중량 재계산
        if (field === "width" || field === "length") {
          next.weight = computeSpecWeight(
            prev.basisWeight,
            next.width,
            next.length,
          );
        }
        return next;
      }),
    }));
  };

  const handleImageChange = (imageNumber: 1 | 2, dataUrl: string | null) => {
    const setter = imageNumber === 1 ? setImage1 : setImage2;
    setter(dataUrl);
  };

  return {
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
  };
}
