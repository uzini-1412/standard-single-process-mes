/** [생산관리 > 생산계획] 등록/수정 폼이 공유하는 입력 상태·자동계산 로직. */
import { useState, useCallback } from "react";
import { ProductionPlanData } from "@/types/production/plan.interface";
import { todayYmd } from "@/app/utils/dateToday";

/** 계획량(m) ÷ 생산속도 = 예상소요시간(분, 소수 2자리). 무효값이면 빈 문자열. */
export function deriveEstimatedTime(planQty: number, productionSpeed: string): string {
  const qty = Number(planQty) || 0;
  const speed = parseFloat(productionSpeed) || 0;
  if (qty > 0 && speed > 0) return (qty / speed).toFixed(2);
  return "";
}

/** 빈 폼 초기값을 만든다(생산계획일은 오늘로 채움). */
export function makeEmptyPlanForm(): ProductionPlanData {
  return {
    lineName: "",
    planDate: todayYmd(),
    itemCode: "",
    itemName: "",
    basisWeight: "",
    width: "",
    length: "",
    currentStock: 0,
    planQty: 0,
    weight: "",
    manageWeight: "",
    productionSpeed: "",
    estimatedProductionTime: "",
    remark: "",
    itemType: "",
  };
}

type FieldHook = {
  form: ProductionPlanData;
  setForm: React.Dispatch<React.SetStateAction<ProductionPlanData>>;
  /** 수량/속도 변경 시 예상소요시간을 자동 재계산하며 단일 필드를 갱신한다. */
  updateField: (field: keyof ProductionPlanData, value: string) => void;
};

export function usePlanForm(initial?: ProductionPlanData): FieldHook {
  const [form, setForm] = useState<ProductionPlanData>(initial ?? makeEmptyPlanForm());

  const updateField = useCallback((field: keyof ProductionPlanData, value: string) => {
    setForm((prev) => {
      let next: ProductionPlanData;
      if (field === "planQty") {
        next = { ...prev, planQty: parseInt(value, 10) || 0 };
      } else if (field === "currentStock") {
        next = { ...prev, currentStock: parseInt(value, 10) || 0 };
      } else {
        next = { ...prev, [field]: value } as ProductionPlanData;
      }

      if (field === "planQty" || field === "productionSpeed") {
        next.estimatedProductionTime = deriveEstimatedTime(next.planQty, next.productionSpeed);
      }

      return next;
    });
  }, []);

  return { form, setForm, updateField };
}
