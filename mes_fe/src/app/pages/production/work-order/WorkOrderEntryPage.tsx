/** [생산관리 > 작업지시등록] 작업지시 등록/수정 — 생산계획·레시피 기반. API: workOrderApi(/api/production/work-order) 외 plan/recipe/item. */
import { Button } from "../../../components/ui/button";
import { ProductionItemSelectDialog } from "../../../components/features/production/ProductionItemSelectDialog";
import { WorkOrderDetailItemSelectDialog } from "../../../components/features/production/WorkOrderDetailItemSelectDialog";
import { FormActions } from "../../../components/common/FormActions";
import type { WorkOrderData, WorkOrderSubItem } from "@/types/production/workOrder.interface";
import { useWorkOrderEntryForm } from "./useWorkOrderEntryForm";
import { ProductionPlanPicker } from "./ProductionPlanPicker";
import { WorkOrderMasterForm } from "./WorkOrderMasterForm";
import { WorkOrderDetailTable } from "./WorkOrderDetailTable";

interface WorkOrderEntryPageProps {
  onBack?: () => void;
  mode?: "create" | "edit" | "detail";
  initialData?: Partial<WorkOrderData>;
  initialSubItems?: WorkOrderSubItem[];
  onEdit?: () => void;
  onDelete?: () => void;
  workOrderId?: string;
}

// 모드별 페이지 제목 산출
function resolveTitle(isDetailView: boolean, isEditView: boolean): string {
  if (isDetailView) return "작업지시 상세";
  if (isEditView) return "작업지시 수정";
  return "작업지시 등록";
}

export function WorkOrderEntryPage({
  onBack,
  mode = "create",
  initialData,
  initialSubItems,
  onEdit,
  onDelete,
  workOrderId,
}: WorkOrderEntryPageProps) {
  const form = useWorkOrderEntryForm({ mode, initialData, initialSubItems, workOrderId, onBack });
  const { permission, isDetailView, isEditView, isRegisterView, formData, plan } = form;

  // 상세보기에서 수정/삭제 버튼 노출 여부: 작업대기 상태에서만 활성
  const isReadyStatus = initialData?.workStatus === "PENDING" || initialData?.workStatus === "작업대기";

  return (
    <div className="p-3">
      <div className="bg-white rounded-lg p-3">
        {/* 헤더: 제목 + 모드별 액션 버튼 */}
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">{resolveTitle(isDetailView, isEditView)}</h1>
          <div className="flex gap-2">
            {isDetailView && (
              <>
                {permission.updateAuth && (
                  <Button
                    onClick={onEdit}
                    disabled={!isReadyStatus}
                    className={`px-6 ${
                      isReadyStatus
                        ? "bg-black hover:bg-gray-800 text-white"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    수정
                  </Button>
                )}
                {permission.deleteAuth && (
                  <Button
                    onClick={onDelete}
                    disabled={!isReadyStatus}
                    className={`px-6 ${
                      isReadyStatus
                        ? "bg-black hover:bg-gray-800 text-white"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    삭제
                  </Button>
                )}
                <Button onClick={onBack} className="bg-black hover:bg-gray-800 text-white px-6">
                  목록
                </Button>
              </>
            )}
            {(isRegisterView || isEditView) && (
              <FormActions onSave={form.handleSave} onCancel={onBack} saving={form.saving} />
            )}
          </div>
        </div>

        <div className="space-y-3">
          {/* 등록 모드에서만 노출되는 생산계획 선택 표 */}
          {isRegisterView && (
            <ProductionPlanPicker
              rows={plan.rows}
              isLoading={plan.isLoading}
              page={plan.page}
              size={plan.size}
              onPageChange={plan.setPage}
              onSizeChange={plan.setSize}
              onRowClick={form.handlePlanRowClick}
            />
          )}

          {/* 마스터 4열 입력 표 */}
          <WorkOrderMasterForm
            formData={formData}
            isDetailView={isDetailView}
            isEditView={isEditView}
            subItemCount={form.subItems.length}
            lineOptions={form.lineOptions}
            hasDateError={form.hasDateError}
            orderDateRef={form.orderDateRef}
            onFieldChange={form.handleFieldChange}
            onLineChange={form.handleLineChange}
            onOpenItemSelect={() => form.setIsItemSelectOpen(true)}
          />

          {/* 상세 품목 표 (등록/상세/수정 공통 노출) */}
          <div className="bg-white rounded-lg p-3">
            <div className="mb-4 flex items-center justify-between">
              <div className="py-2 font-semibold text-gray-900">작업지시 상세</div>
              {!isDetailView && (
                <Button
                  onClick={form.openDetailItemPicker}
                  disabled={form.isAddDisabled}
                  className={`px-6 ${
                    form.isAddDisabled
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-black hover:bg-gray-800 text-white"
                  }`}
                >
                  추가
                </Button>
              )}
            </div>

            <WorkOrderDetailTable
              subItems={form.subItems}
              isDetailView={isDetailView}
              onPatchItem={form.patchSubItem}
            />
          </div>
        </div>
      </div>

      {/* 품목 선택 다이얼로그들 */}
      <ProductionItemSelectDialog
        isOpen={form.isItemSelectOpen}
        onClose={() => form.setIsItemSelectOpen(false)}
        onSelectItem={form.handleSingleItemSelect}
      />
      <WorkOrderDetailItemSelectDialog
        open={form.isDetailItemSelectOpen}
        onOpenChange={form.setIsDetailItemSelectOpen}
        onSelect={form.handleDetailItemsSelect}
        parentItemCode={formData.itemCode}
        parentItemName={formData.itemName}
      />
    </div>
  );
}
