/** [생산관리 > 생산계획] 신규 등록 화면. 소요량 선택 → 폼 입력 → 다건 적재 후 일괄 저장. API: productionPlanApi(/api/production/plan). */
import { useState, useEffect, useCallback } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Checkbox } from "../../../components/ui/checkbox";
import { ProductionItemSelectDialogForPlan } from "../../../components/features/production/ProductionItemSelectDialogForPlan";
import { ServerPagination } from "../../../components/common/ServerPagination";
import { FormActions } from "../../../components/common/FormActions";
import * as itemApi from "../../../api/itemApi";
import * as commonInfoApi from "../../../api/commonInfoApi";
import * as productionPlanApi from "../../../api/productionPlanApi";
import { showWarning } from "@/app/utils/toast";
import { ensureDateOrder } from "@/app/utils/dateGuard";
import { ProductionPlanTableRow } from "@/types/production/plan.interface";
import { productionPlanColumns, requirementColumnsForPlan } from "@/app/constants/production";
import { UNITS, withUnit } from "@/app/utils/unitConvert";
import { useCrudForm } from "../../../hooks/useCrudForm";
import { usePlanForm, makeEmptyPlanForm } from "./usePlanForm";
import { resolveToday } from "./planBoardHelpers";
import { useRequirementList } from "./useRequirementList";

interface ProductionPlanEntryPageProps {
  onBack?: () => void;
}

export function ProductionPlanEntryPage({ onBack }: ProductionPlanEntryPageProps) {
  const { form, setForm, updateField } = usePlanForm();
  const { saving, runSave } = useCrudForm();
  const requirementList = useRequirementList();

  const [orderDateRef, setOrderDateRef] = useState("");
  const [dateInvalid, setDateInvalid] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [lineOptions, setLineOptions] = useState<string[]>([]);
  const [stagedRows, setStagedRows] = useState<ProductionPlanTableRow[]>([]);

  // 라인구분 셀렉트 옵션을 공통정보에서 받아온다.
  const fetchLineOptions = useCallback(async () => {
    try {
      const options = await commonInfoApi.fetchDetailContentsByItemName("라인구분");
      setLineOptions(options);
    } catch (err) {
      console.error("[ProductionPlanEntry] 라인구분 옵션 로딩 실패:", err);
      setLineOptions([]);
    }
  }, []);

  useEffect(() => {
    fetchLineOptions();
  }, [fetchLineOptions]);

  // 생산계획일 입력은 자동계산 갱신과 함께 수주일 이전 여부를 같이 점검한다.
  const onChangeField = (field: keyof typeof form, value: string) => {
    updateField(field, value);
    if (field === "planDate") {
      setDateInvalid(!!(value && orderDateRef && value < orderDateRef));
    }
  };

  // 소요량 행을 누르면 해당 품목 정보로 폼을 채운다(폭/평량/길이/관리중량 제외, 품번 단위).
  const pickRequirement = async (requirement: any) => {
    try {
      const itemList = await itemApi.fetchItemList();
      const matched = itemList.find(
        (item: any) => item.itemCode === requirement.itemCode && item.itemName === requirement.itemName,
      );

      setOrderDateRef(requirement.orderDate || "");
      setDateInvalid(false);

      setForm({
        planDate: resolveToday(),
        itemSq: requirement.itemSq ?? matched?.itemSq,
        itemCode: requirement.itemCode || "",
        itemName: requirement.itemName || "",
        basisWeight: "",
        width: "",
        length: "",
        planQty: Number(requirement.productionReqQty) || 0,
        manageWeight: "",
        productionSpeed: requirement.productionSpeed || "",
        estimatedProductionTime: requirement.estimatedProductionTime || "",
        remark: "",
        itemType: matched?.itemType || "",
        lineName: "",
        currentStock: Number(requirement.currentStock) || 0,
        weight: "",
      });
    } catch (err) {
      console.error("[ProductionPlanEntry] 품목 정보 로딩 실패:", err);
    }
  };

  // 품목 선택 다이얼로그 결과를 폼에 반영(폭/평량/길이/관리중량은 비움).
  const applyItemSelection = async (item: any) => {
    const common = {
      itemSq: item.itemSq,
      itemCode: item.itemCode || "",
      itemName: item.itemName || "",
      productionSpeed: item.productionSpeed || "",
      itemType: item.itemType || "",
    };
    try {
      setForm((prev) => ({
        ...prev,
        ...common,
        basisWeight: "",
        width: "",
        length: "",
        manageWeight: "",
      }));
    } catch (err) {
      console.error("[ProductionPlanEntry] 품목 정보 로딩 실패:", err);
      setForm((prev) => ({ ...prev, ...common }));
    }
    setItemDialogOpen(false);
  };

  // 입력 폼을 검증 후 적재 테이블에 1행 추가하고 폼을 초기화한다.
  const stageCurrentForm = () => {
    // 필수 입력 가드 — BE NOT NULL: planDate, itemSq(itemCode)
    if (!form.planDate) {
      showWarning("생산계획일은 필수 입력값입니다.");
      return;
    }
    if (!form.itemCode || !form.itemName) {
      showWarning("필수항목 품목을 선택해주세요.");
      return;
    }

    const dateErr = ensureDateOrder(orderDateRef, form.planDate, "수주일자", "생산계획일");
    if (dateErr) {
      setDateInvalid(true);
      showWarning(dateErr);
      return;
    }

    const row: ProductionPlanTableRow = {
      selected: true,
      no: String(stagedRows.length + 1).padStart(2, "0"),
      lineName: form.lineName,
      planDate: form.planDate,
      itemSq: form.itemSq,
      itemCode: form.itemCode,
      itemName: form.itemName,
      basisWeight: form.basisWeight,
      width: form.width,
      length: form.length,
      currentStock: form.currentStock || 0,
      planQty: form.planQty,
      weight: form.manageWeight || form.weight || "",
      manageWeight: form.manageWeight,
      productionSpeed: form.productionSpeed,
      estimatedProductionTime: form.estimatedProductionTime,
      remark: form.remark,
    };

    setStagedRows((prev) => [...prev, row]);
    setForm(makeEmptyPlanForm());
    setOrderDateRef("");
    setDateInvalid(false);
  };

  const toggleRow = (index: number) => {
    setStagedRows((prev) => prev.map((r, i) => (i === index ? { ...r, selected: !r.selected } : r)));
  };

  const toggleAll = (checked: boolean) => {
    setStagedRows((prev) => prev.map((r) => ({ ...r, selected: checked })));
  };

  const submit = () =>
    runSave({
      validate: () => {
        if (stagedRows.length === 0) return "생산계획 품목을 추가해주세요.";
        if (stagedRows.filter((r) => r.selected).length === 0) return "등록할 항목을 선택해주세요.";
        return null;
      },
      submit: async () => {
        const picked = stagedRows.filter((r) => r.selected);
        await Promise.all(picked.map((row) => productionPlanApi.registerProductionPlan(row)));
      },
      successMessage: "생산계획이 등록되었습니다.",
      onSuccess: () => onBack?.(),
      errorMessage: "생산계획 등록에 실패했습니다.",
      onError: (error) => {
        console.error("[ProductionPlanEntry] 저장 실패:", error);
      },
    });

  return (
    <div className="p-3">
      <div className="bg-white rounded-lg p-3">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">생산계획 등록</h1>
          <FormActions onSave={submit} onCancel={onBack} saving={saving} />
        </div>

        <div className="space-y-3">
          {/* 소요량 산출 내역 */}
          <div className="bg-white rounded-lg p-3">
            <div className="py-2 font-semibold text-gray-900 mb-4">생산소요량 산출 내역</div>
            <div className="border border-gray-200 rounded-sm overflow-hidden h-[400px] flex flex-col">
              <div className="overflow-auto flex-1">
                <table className="w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#4A5CC7] border-b border-gray-200">
                      {requirementColumnsForPlan.map((col) => (
                        <th key={col.key} className="px-4 py-3 text-center text-xs font-semibold text-white tracking-wider whitespace-nowrap border-r border-white">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {requirementList.loadingReq ? (
                      <tr>
                        <td colSpan={requirementColumnsForPlan.length} className="px-4 py-12 text-center text-gray-500 text-sm border-r border-gray-200">
                          로딩 중...
                        </td>
                      </tr>
                    ) : requirementList.requirements.length === 0 ? (
                      <tr>
                        <td colSpan={requirementColumnsForPlan.length} className="px-4 py-12 text-center text-gray-500 text-sm border-r border-gray-200">
                          생산소요량 산출 데이터가 없습니다
                        </td>
                      </tr>
                    ) : (
                      requirementList.pageRows.map((req, index) => (
                        <tr
                          key={index}
                          className="border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => pickRequirement(req)}
                        >
                          {requirementColumnsForPlan.map((col) => (
                            <td key={col.key} className="px-4 py-3 text-sm text-gray-700 text-center whitespace-nowrap border-r border-gray-200">
                              {req[col.key as keyof typeof req]}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-gray-200">
                <ServerPagination
                  page={requirementList.page}
                  size={requirementList.pageSize}
                  totalElements={requirementList.requirements.length}
                  totalPages={requirementList.totalPages}
                  onPageChange={requirementList.setPage}
                  onSizeChange={(s) => {
                    requirementList.setPageSize(s);
                    requirementList.setPage(0);
                  }}
                  sizeOptions={[10, 20, 50, 100]}
                  loading={requirementList.loadingReq}
                />
              </div>
            </div>
          </div>

          {/* 생산계획정보 입력 */}
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
                      onChange={(e) => onChangeField("planDate", e.target.value)}
                      className={`h-10 px-3 bg-white border rounded-md text-sm focus:outline-none focus:ring-2 w-full ${dateInvalid ? "validation-error-input" : "border-gray-300 focus:ring-[#5B6FD8]"}`}
                    />
                    {dateInvalid && (
                      <p className="validation-error-message">
                        {ensureDateOrder(orderDateRef, form.planDate, "수주일자", "생산계획일", { earlierContext: orderDateRef })}
                      </p>
                    )}
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
                    품명<span className="text-red-500"> *</span>
                  </td>
                  <td className="border-r border-gray-300 px-4 py-3">
                    <div className="flex items-center gap-1 cursor-pointer" onClick={() => setItemDialogOpen(true)}>
                      <Input
                        value={form.itemName}
                        readOnly
                        placeholder="검색 버튼을 클릭하세요"
                        className="flex-1 bg-white border border-gray-300 focus-visible:ring-1 focus-visible:ring-[#5B6FD8] cursor-pointer"
                      />
                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">
                    라인구분
                  </td>
                  <td className="px-4 py-3 border-r border-gray-200">
                    <Select value={form.lineName} onValueChange={(value) => onChangeField("lineName", value)}>
                      <SelectTrigger className="w-full h-10 text-sm bg-white border-gray-300">
                        <SelectValue placeholder="선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {lineOptions.length === 0 ? (
                          <SelectItem value="none" disabled>옵션 없음</SelectItem>
                        ) : (
                          lineOptions.map((option, index) => (
                            <SelectItem key={index} value={option}>
                              {option}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>

                <tr className="border-b border-gray-300">
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">
                    {withUnit("계획량", UNITS.length)}
                  </td>
                  <td className="border-r border-gray-300 px-4 py-3">
                    <Input
                      value={form.planQty || ""}
                      onChange={(e) => onChangeField("planQty", e.target.value)}
                      placeholder="입력"
                      className="bg-white border border-gray-300 focus-visible:ring-1 focus-visible:ring-[#5B6FD8]"
                    />
                  </td>
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">
                    {withUnit("생산속도", UNITS.productionSpeed)}
                  </td>
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
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">
                    예상소요시간(분)
                  </td>
                  <td className="border-r border-gray-300 px-4 py-3">
                    <Input
                      value={form.estimatedProductionTime}
                      readOnly
                      disabled
                      placeholder="계획량 입력 시 자동계산"
                      className="bg-gray-50 border border-gray-300 focus-visible:ring-1 focus-visible:ring-[#5B6FD8]"
                    />
                  </td>
                  <td className="border-r border-gray-300 bg-gray-100 text-[#4A5CC7] text-xs font-semibold px-4 py-3 w-32">
                    비고
                  </td>
                  <td className="px-4 py-3 border-r border-gray-200">
                    <Input
                      value={form.remark}
                      onChange={(e) => onChangeField("remark", e.target.value)}
                      placeholder="입력"
                      className="bg-white border border-gray-300 focus-visible:ring-1 focus-visible:ring-[#5B6FD8]"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 적재된 생산계획 품목 */}
          <div className="bg-white rounded-lg p-3">
            <div className="mb-4 flex items-center justify-between">
              <div className="py-2 font-semibold text-gray-900">생산계획 품목</div>
              <Button className="bg-black hover:bg-gray-800 text-white px-6" onClick={stageCurrentForm}>
                추가
              </Button>
            </div>

            <div className="border border-gray-200 rounded-sm overflow-hidden">
              <div className="overflow-auto h-[400px]">
                <table className="w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#4A5CC7] border-b border-gray-200">
                      <th className="px-4 py-3 text-center text-xs font-semibold text-white tracking-wider whitespace-nowrap w-12">
                        <Checkbox
                          checked={stagedRows.length > 0 && stagedRows.every((r) => r.selected)}
                          onCheckedChange={(checked) => toggleAll(!!checked)}
                          className="border-white data-[state=checked]:bg-white data-[state=checked]:text-[#4A5CC7]"
                        />
                      </th>
                      {productionPlanColumns.map((col) => (
                        <th
                          key={col.key}
                          className="px-4 py-3 text-center text-xs font-semibold text-white tracking-wider whitespace-nowrap border-r border-white"
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {stagedRows.length === 0 ? (
                      <tr>
                        <td colSpan={productionPlanColumns.length + 1} className="px-4 py-8 text-center text-sm text-gray-500 border-r border-gray-200">
                          추가 버튼을 클릭하여 생산계획 품목을 등록하세요.
                        </td>
                      </tr>
                    ) : (
                      stagedRows.map((row, index) => (
                        <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-3 text-center border-r border-gray-200">
                            <Checkbox checked={row.selected} onCheckedChange={() => toggleRow(index)} />
                          </td>
                          {productionPlanColumns.map((col) => (
                            <td key={col.key} className="px-4 py-3 text-sm text-gray-700 text-center whitespace-nowrap border-r border-gray-200">
                              {row[col.key as keyof ProductionPlanTableRow]}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ProductionItemSelectDialogForPlan
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        onSelect={applyItemSelection}
      />
    </div>
  );
}
