/** [출하관리 > 출하계획] 출하계획 등록/수정 폼 — 수주 선택 기반. API: shippingPlanApi(/api/shipment/plan) + orderApi. */
import { ShippingPlanData } from "@/types/shipping/plan.interface";
import { FormActions } from "../../../components/common/FormActions";
import { useDispatchPlanForm } from "./useDispatchPlanForm";
import { DraftListTable, EditDraftTable, OrderSelectTable } from "./DispatchPlanFormSections";

interface DispatchPlanFormPageProps {
  mode?: "create" | "edit";
  onBack?: () => void;
  onSave?: () => void;
  item?: ShippingPlanData | null;
}

export function DispatchPlanFormPage({ mode = "create", onBack, onSave, item }: DispatchPlanFormPageProps) {
  const form = useDispatchPlanForm({ mode, item, onBack, onSave });

  // ── 수정 모드: 단건 4열 입력 그리드 ──
  if (mode === "edit") {
    return (
      <div className="p-3">
        <div className="bg-white rounded-lg p-3">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">출하계획 수정</h1>
            <FormActions onSave={form.submitForm} onCancel={onBack} saving={form.saving} />
          </div>
          <EditDraftTable
            editDraft={form.editDraft}
            onChange={(patch) => form.setEditDraft((prev) => ({ ...prev, ...patch }))}
          />
        </div>
      </div>
    );
  }

  // ── 등록 모드: 수주 선택(상단) + 담긴 출하계획 목록(하단) ──
  return (
    <div className="p-3">
      <div className="bg-white rounded-lg p-3">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">출하계획 등록</h1>
          <FormActions onSave={form.submitForm} onCancel={onBack} saving={form.saving} />
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">수주정보</h3>
          <OrderSelectTable
            ordersLoading={form.ordersLoading}
            selectableOrders={form.selectableOrders}
            addedDtlSqSet={form.addedDtlSqSet}
            onOrderClick={form.toggleOrderDetail}
          />
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">출하계획 목록</h3>
          <DraftListTable
            draftItems={form.draftItems}
            onPlanQtyChange={form.updateDraftPlanQty}
            onShipDateChange={form.updateDraftShipDate}
            onRemarkChange={form.updateDraftRemark}
          />
        </div>
      </div>
    </div>
  );
}
