/** [고객주문관리 > 수주정보] 수주 신규 등록 및 기존 건 수정(mode=create|edit). 입력 상태/검증은 useOrderEntryForm 훅으로 위임. */
import { PageHeader } from "../../../components/common";
import { ProductSelectDialog } from "../../../components/features/order/ProductSelectDialog";
import { Button } from "../../../components/ui/button";
import { OrderHeaderFields } from "./components/OrderHeaderFields";
import { OrderLineItemsTable } from "./components/OrderLineItemsTable";
import { toWonText } from "./orderEntryCalc";
import { useOrderEntryForm } from "./useOrderEntryForm";
import { useErpEnabled } from "../../../context/SystemConfigContext";
import { OrderPageMode } from "@/types/sales/order.interface";

interface SalesOrderEntryPageProps {
  mode: Extract<OrderPageMode, "create" | "edit">;
  selectedId?: number;
  onBack: () => void;
  onRegister: (data: any) => void;
}

export function SalesOrderEntryPage({
  mode = "create",
  selectedId,
  onBack,
  onRegister,
}: SalesOrderEntryPageProps) {
  const form = useOrderEntryForm({ mode, selectedId, onBack, onRegister });
  const erpEnabled = useErpEnabled();

  if (form.loading) {
    return (
      <div className="p-3">
        <div className="bg-white rounded-lg p-3">
          <div className="text-center py-12">로딩 중...</div>
        </div>
      </div>
    );
  }

  const headerActions = (
    <>
      <Button
        onClick={form.handleSave}
        disabled={form.isSaving}
        className="bg-black hover:bg-gray-800 text-white px-6"
      >
        저장
      </Button>
      <Button
        onClick={onBack}
        variant="outline"
        className="border-black text-black hover:bg-gray-100 px-6"
      >
        목록
      </Button>
    </>
  );

  return (
    <div className="p-3">
      <div className="bg-white rounded-lg p-3">
        <div className="mb-3">
          <PageHeader
            title={mode === "edit" ? "수주 수정" : "수주 등록"}
            actions={headerActions}
          />
        </div>

        <div className="space-y-3">
          <OrderHeaderFields
            clientList={form.clientList}
            clientName={form.clientName}
            customerCode={form.customerCode}
            deliveryDate={form.deliveryDate}
            deliveryLocation={form.deliveryLocation}
            errors={form.errors}
            note={form.note}
            orderDate={form.orderDate}
            orderNumber={form.orderNumber}
            paymentTerms={form.paymentTerms}
            paymentTermsList={form.paymentTermsList}
            erpEnabled={erpEnabled}
            onClientSelect={form.handleClientSelect}
            onDeliveryDateChange={form.handleDeliveryDateChange}
            onDeliveryLocationChange={form.setDeliveryLocation}
            onNoteChange={form.setNote}
            onOrderDateChange={form.handleOrderDateChange}
            onPaymentTermsChange={form.setPaymentTerms}
          />

          <OrderLineItemsTable
            orderItems={form.orderItems}
            onOpenProductSelect={() => form.setIsProductSelectOpen(true)}
            onOrderQuantityChange={form.handleOrderQuantityChange}
            onUnitVatAmtChange={form.handleUnitVatAmtChange}
            onToggleSelected={form.handleOrderItemSelectedChange}
            formatCurrency={toWonText}
          />
        </div>
      </div>

      <ProductSelectDialog
        open={form.isProductSelectOpen}
        onOpenChange={form.setIsProductSelectOpen}
        onSelect={form.handleProductSelect}
        customerSq={form.customerSq ?? undefined}
        selectedClientName={form.clientName}
      />
    </div>
  );
}
