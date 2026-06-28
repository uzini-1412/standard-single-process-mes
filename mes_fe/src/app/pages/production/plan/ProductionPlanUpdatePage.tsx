/** [생산관리 > 생산계획] 단건 수정 화면. API: productionPlanApi(/api/production/plan). */
import { useState, useEffect, useCallback } from "react";
import { Input } from "../../../components/ui/input";
import { FormActions } from "../../../components/common/FormActions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { ProductionItemSelectDialogForPlan } from "../../../components/features/production/ProductionItemSelectDialogForPlan";
import * as productionPlanApi from "../../../api/productionPlanApi";
import * as itemApi from "../../../api/itemApi";
import * as commonInfoApi from "../../../api/commonInfoApi";
import { showError, showWarning } from "@/app/utils/toast";
import { ProductionPlanData } from "@/types/production/plan.interface";
import { UNITS, withUnit } from "@/app/utils/unitConvert";
import { usePlanForm } from "./usePlanForm";

interface ProductionPlanUpdatePageProps {
  planId: number;
  onBack?: () => void;
  onSave?: (data: any) => void;
}

export function ProductionPlanUpdatePage({ planId, onBack, onSave }: ProductionPlanUpdatePageProps) {
  const { form, setForm, updateField } = usePlanForm();

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [lineOptions, setLineOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // 라인구분 셀렉트 옵션을 공통정보에서 가져온다.
  const fetchLineOptions = useCallback(async () => {
    try {
      const options = await commonInfoApi.fetchDetailContentsByItemName("라인구분");
      setLineOptions(options);
    } catch (err) {
      console.error("[ProductionPlanUpdate] 라인구분 옵션 로딩 실패:", err);
      setLineOptions([]);
    }
  }, []);

  // 기존 계획 + 매칭 품목의 제품구분을 합쳐 폼 초기값을 구성한다.
  const fetchPlan = useCallback(async () => {
    try {
      setLoading(true);
      // 계획 상세와 품목 목록은 서로 독립적이라 동시에 조회한다.
      const [plan, itemList] = await Promise.all([
        productionPlanApi.fetchProductionPlanDetail(planId),
        itemApi.fetchItemList(),
      ]);
      const matched = itemList.find(
        (item: any) => item.itemCode === plan.itemCode && item.itemName === plan.itemName,
      );

      setForm({
        lineName: plan.lineName,
        planDate: plan.planDate,
        itemSq: plan.itemSq ?? matched?.itemSq,
        itemCode: plan.itemCode,
        itemName: plan.itemName,
        basisWeight: plan.basisWeight,
        width: plan.width,
        length: plan.length,
        currentStock: plan.currentStock,
        planQty: plan.planQty,
        weight: plan.weight,
        manageWeight: plan.manageWeight,
        productionSpeed: plan.productionSpeed,
        estimatedProductionTime: plan.estimatedProductionTime,
        remark: plan.remark,
        itemType: matched?.itemType || "",
      });
    } catch (err) {
      console.error("[ProductionPlanUpdate] 상세 조회 실패:", err);
      showError("생산계획 정보를 불러오는데 실패했습니다.");
      onBack?.();
    } finally {
      setLoading(false);
    }
  }, [planId, onBack, setForm]);

  useEffect(() => {
    fetchPlan();
    fetchLineOptions();
  }, [fetchPlan, fetchLineOptions]);

  // 품목 선택 다이얼로그가 넘겨준 값으로 관련 필드를 채운다.
  const applyItemSelection = (item: any) => {
    setForm((prev) => ({
      ...prev,
      itemSq: item.itemSq,
      itemCode: item.itemCode || "",
      itemName: item.itemName || "",
      basisWeight: item.basisWeight || "",
      width: item.width || "",
      length: item.length || "",
      productionSpeed: item.productionSpeed || "",
      itemType: item.itemType || "",
    }));
    setItemDialogOpen(false);
  };

  const submit = async () => {
    // 필수 입력 가드 — BE NOT NULL: plan_date, item_sq(itemCode)
    if (!form.planDate) {
      showWarning("생산계획일은 필수 입력값입니다.");
      return;
    }
    if (!form.itemCode) {
      showWarning("품번은 필수 입력값입니다.");
      return;
    }
    if (!form.lineName) {
      showWarning("라인은 필수 입력값입니다.");
      return;
    }

    try {
      await productionPlanApi.modifyProductionPlan(planId, {
        itemSq: form.itemSq,
        lineName: form.lineName,
        planDate: form.planDate,
        itemCode: form.itemCode,
        itemName: form.itemName,
        basisWeight: form.basisWeight,
        width: form.width,
        length: form.length,
        currentStock: form.currentStock,
        planQty: form.planQty,
        weight: form.weight,
        manageWeight: form.manageWeight,
        productionSpeed: form.productionSpeed,
        estimatedProductionTime: form.estimatedProductionTime,
        remark: form.remark,
      });
      onSave?.(form);
    } catch (err) {
      console.error("[ProductionPlanUpdate] 수정 실패:", err);
      showError("생산계획 수정에 실패했습니다.");
    }
  };

  void loading;

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">생산계획 수정</h1>
        <FormActions onSave={submit} onCancel={onBack} cancelLabel="목록" />
      </div>

      <div className="space-y-3">
        <div className="bg-white rounded-lg p-3">
          <table className="w-full border border-gray-300 border-t-2 border-t-[#5B6FD8]">
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">
                  생산계획일<span className="text-red-500"> *</span>
                </td>
                <td className="border-r border-gray-300 px-4 py-3">
                  <input
                    type="date"
                    value={form.planDate}
                    onChange={(e) => updateField("planDate", e.target.value)}
                    className="h-10 px-3 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5B6FD8] w-full"
                  />
                </td>
                <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">
                  품번
                </td>
                <td className="px-4 py-3 border-r border-gray-200">
                  <Input
                    value={form.itemCode}
                    readOnly
                    disabled
                    placeholder="품명 검색으로 자동입력"
                    className="w-full bg-gray-50 border border-gray-300 focus-visible:ring-1 focus-visible:ring-[#5B6FD8]"
                  />
                </td>
              </tr>

              <tr className="border-b border-gray-300">
                <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">
                  품명
                </td>
                <td className="border-r border-gray-300 px-4 py-3">
                  <Input
                    value={form.itemName}
                    readOnly
                    disabled
                    className="w-full bg-gray-50 border border-gray-300 focus-visible:ring-1 focus-visible:ring-[#5B6FD8]"
                  />
                </td>
                <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">라인구분</td>
                <td className="px-4 py-3 border-r border-gray-200">
                  <Select value={form.lineName} onValueChange={(value) => updateField("lineName", value)}>
                    <SelectTrigger className="w-full h-10 text-sm bg-white border-gray-300">
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {lineOptions.length === 0 ? (
                        <SelectItem value="none" disabled>옵션 없음</SelectItem>
                      ) : (
                        lineOptions.map((option, index) => (
                          <SelectItem key={index} value={option}>{option}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </td>
              </tr>

              <tr className="border-b border-gray-300">
                <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">{withUnit("계획량", UNITS.length)}</td>
                <td className="border-r border-gray-300 px-4 py-3">
                  <Input
                    value={form.planQty || ""}
                    onChange={(e) => updateField("planQty", e.target.value)}
                    placeholder="입력"
                    className="bg-white border border-gray-300 focus-visible:ring-1 focus-visible:ring-[#5B6FD8]"
                  />
                </td>
                <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">{withUnit("생산속도", UNITS.productionSpeed)}</td>
                <td className="px-4 py-3 border-r border-gray-200">
                  <Input
                    value={form.productionSpeed}
                    readOnly
                    disabled
                    placeholder="품명 검색으로 자동입력"
                    className="bg-gray-50 border border-gray-300 focus-visible:ring-1 focus-visible:ring-[#5B6FD8]"
                  />
                </td>
              </tr>

              <tr className="border-b border-gray-300">
                <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">예상소요시간(분)</td>
                <td className="border-r border-gray-300 px-4 py-3">
                  <Input
                    value={form.estimatedProductionTime}
                    readOnly
                    disabled
                    placeholder="계획량 입력 시 자동계산"
                    className="bg-gray-50 border border-gray-300 focus-visible:ring-1 focus-visible:ring-[#5B6FD8]"
                  />
                </td>
                <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">비고</td>
                <td className="px-4 py-3 border-r border-gray-200">
                  <Input
                    value={form.remark}
                    onChange={(e) => updateField("remark", e.target.value)}
                    placeholder="입력"
                    className="bg-white border border-gray-300 focus-visible:ring-1 focus-visible:ring-[#5B6FD8]"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <ProductionItemSelectDialogForPlan
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        onSelect={applyItemSelection}
      />
    </>
  );
}
